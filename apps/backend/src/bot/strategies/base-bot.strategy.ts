import { IPublicState } from '../../../../common/types/matchmaking.types';
import {
  IUserAction,
  IUserActions,
  ITrustedState,
} from '../../../../common/types/gameplay.types';
import { State } from '../../../../common/stater/state';
import { SpellStats } from '../../../../common/stater/structs';
import { Wizard } from '../../../../common/wizards';
import { allSpells } from '../../../../common/stater/spells';
import { Stater } from '../../../../common/stater/stater';
import { MAP_SIZE } from '../../../../common/constants';
import { IBotStrategy } from './bot-strategy.interface';

// o1js components — fall back to mocks when not available
let Field: any, Int64: any;
try {
  const o1js = require('o1js');
  Field = o1js.Field;
  Int64 = o1js.Int64;
} catch {
  class MockField {
    constructor(private value: number) {}
    static from(v: number) { return new MockField(v); }
    toString() { return this.value.toString(); }
  }
  class MockInt64 {
    constructor(private value: number) {}
    static from(v: number) { return new MockInt64(v); }
    toString() { return this.value.toString(); }
  }
  Field = MockField;
  Int64 = MockInt64;
}

export abstract class BaseBotStrategy implements IBotStrategy {
  protected readonly mapSize = MAP_SIZE;
  protected readonly maxSelectedSkills = 4;

  /** Full game state preserved across rounds — drives real Stater physics. */
  protected botStater: Stater | null = null;

  // ── Abstract ─────────────────────────────────────────────────────────────────

  /** Returns the specific wizard this strategy plays. */
  protected abstract getWizard(): Wizard;

  /**
   * @notice Decides which actions to submit for a turn.
   * @dev Concrete strategies implement full action-selection logic here.
   *      Use the helper utilities `getAvailableSpells` and `buildSpellAction`.
   * @returns Ordered list of actions to submit (usually 1–2)
   */
  protected abstract pickActions(
    botId: string,
    currentState: IPublicState,
    opponentState?: IPublicState
  ): IUserAction[];

  // ── IBotStrategy ─────────────────────────────────────────────────────────────

  generateSetup(botId: string, socketId: string): IPublicState {
    const wizard = this.getWizard();
    console.log(`🤖 Bot ${botId} using wizard: ${wizard.name}`);

    const selectedSpells = this.selectSpells(wizard);
    const startPosition = {
      x: Math.floor(Math.random() * this.mapSize),
      y: Math.floor(Math.random() * this.mapSize),
    };

    const botState = wizard.defaultState();
    botState.playerId = Field(
      parseInt(botId.replace(/\D/g, '')) || Math.floor(Math.random() * 10000)
    );
    botState.wizardId = wizard.id;
    botState.playerStats.hp = Int64.from(wizard.defaultHealth);
    botState.playerStats.position.value.x = Int64.from(startPosition.x);
    botState.playerStats.position.value.y = Int64.from(startPosition.y);
    botState.randomSeed = Field(Math.floor(Math.random() * 1000000));
    botState.spellStats = selectedSpells;
    botState.map = this.generateRandomTilemap();

    const stater = new Stater({ state: botState });
    this.botStater = stater;
    const publicState = stater.generatePublicState();

    return {
      socketId,
      playerId: botId,
      fields: JSON.stringify(State.toJSON(publicState)),
    };
  }

  generateActions(
    botId: string,
    currentState: IPublicState,
    opponentState?: IPublicState
  ): IUserActions {
    return {
      actions: this.pickActions(botId, currentState, opponentState),
      signature: `bot_signature_${botId}_${Date.now()}`,
    };
  }

  /**
   * @notice Applies all round actions to the bot's persisted Stater instance,
   *         producing a properly updated trusted state using the real game engine.
   * @dev Delegates to `Stater.applyActions` — covers ALL spells, endOfRoundEffects,
   *      onEndEffects, publicStateEffects, cooldown reduction, dodge/accuracy/attack/defense.
   *      Action caster/target IDs are remapped from string bot IDs to the numeric
   *      Field IDs stored inside the bot's state, so o1js Field construction succeeds.
   *      Falls back to the unchanged current state on any error (e.g. no o1js in tests).
   */
  generateTrustedState(
    botId: string,
    currentState: IPublicState,
    allActions: { [playerId: string]: IUserActions },
    opponentPublicState?: IPublicState
  ): ITrustedState {
    const stateCommit = `bot_commit_${botId}_${Date.now()}_${Math.random()}`;
    const signature = `bot_trusted_signature_${botId}_${Date.now()}`;

    try {
      if (!this.botStater) throw new Error('botStater not initialized');

      // ── Reconstruct opponent State from their public JSON ─────────────────────
      let opponentState: State = State.default();
      if (opponentPublicState?.fields) {
        try {
          opponentState = State.fromJSON(
            JSON.parse(opponentPublicState.fields)
          ) as unknown as State;
        } catch {
          /* keep default */
        }
      }

      // ── Resolve numeric Field IDs for action remapping ────────────────────────
      // Bot ID in state is the numeric Field serialised as a string (e.g. "1").
      // Actions from buildSpellAction carry the raw string botId (e.g. "bot_1").
      // We remap so Field(caster) / Field(target) succeed inside applyActions.
      const botNumericId = this.botStater.state.playerId.toString();
      let opponentNumericId = '0';
      if (opponentPublicState?.fields) {
        try {
          const oppFields = JSON.parse(opponentPublicState.fields);
          opponentNumericId = String(oppFields.playerId ?? '0');
        } catch {
          /* keep '0' */
        }
      }

      // ── Merge all players' actions into one batch with remapped IDs ───────────
      const remappedActions: IUserAction[] = [];
      for (const [pid, ua] of Object.entries(allActions || {})) {
        const casterId =
          pid === botId ? botNumericId : opponentNumericId;

        for (const action of ua?.actions ?? []) {
          if (!action) continue;
          // If the action targets the bot (by string or numeric ID), map to bot's numeric ID
          const isTargetingBot =
            action.playerId === botId ||
            action.playerId === botNumericId;

          remappedActions.push({
            ...action,
            caster: casterId,
            playerId: isTargetingBot ? botNumericId : opponentNumericId,
          });
        }
      }

      const mergedUserActions: IUserActions = {
        actions: remappedActions,
        signature: '',
      };

      // ── Apply via real game engine ────────────────────────────────────────────
      // Handles ALL spells (not just FireBall/Lightning), effects pipeline,
      // cooldown reduction, dodge/accuracy/attack/defense multipliers, and
      // random-seed advancement — identical to the frontend Stater flow.
      const newPublicState = this.botStater.applyActions(
        mergedUserActions,
        opponentState
      );

      return {
        playerId: botId,
        stateCommit,
        publicState: {
          socketId: currentState.socketId,
          playerId: botId,
          fields: JSON.stringify(State.toJSON(newPublicState)),
        },
        signature,
      };
    } catch (err) {
      console.error(
        `[BotStrategy] generateTrustedState error, returning unchanged state:`,
        err
      );
      return {
        playerId: botId,
        stateCommit,
        publicState: {
          socketId: currentState.socketId,
          playerId: botId,
          fields: currentState.fields,
        },
        signature,
      };
    }
  }

  // ── Utilities for concrete strategies ────────────────────────────────────────

  /**
   * @notice Returns all spells in the current state that are not on cooldown.
   * @dev Parse the public state fields to extract usable SpellStats.
   */
  protected getAvailableSpells(currentState: IPublicState): SpellStats[] {
    const stateData = State.fromJSON(JSON.parse(currentState.fields));
    return (stateData.spellStats as SpellStats[]).filter(
      (s) =>
        s.spellId.toString() !== '0' &&
        s.currentCooldown.toString() === '0'
    );
  }

  /**
   * @notice Constructs a single IUserAction for the given spell.
   * @dev Uses the spell's `target` field from `allSpells` to determine
   *      ally vs enemy targeting — works correctly for every wizard.
   *      Ally spells → self targeting + position payload (position-less
   *      Structs such as HealData / ShadowVeilData safely ignore extra fields).
   *      Enemy spells → opponent targeting + position.
   *
   *      If the spell defines `castedArea(x, y)` and `botCurrentState` is
   *      provided, the bot's current position is extracted and only valid
   *      cast positions are considered — identical to the client-side check.
   *
   * @param targetPos    Explicit override position; skips castedArea validation.
   * @param botCurrentState  Bot's own public state — required for castedArea.
   */
  protected buildSpellAction(
    botId: string,
    spellId: string,
    opponentState?: IPublicState,
    targetPos?: { x: number; y: number },
    botCurrentState?: IPublicState,
  ): IUserAction {
    const spellName = this.getSpellName(spellId);
    const spellDef = allSpells.find((s) => s.id.toString() === spellId);
    const isAllySpell = spellDef?.target === 'ally';

    // Resolve a valid target position for this spell.
    const pos = targetPos ?? this.resolveTargetPosition(spellDef, botCurrentState);

    console.log(`🤖 Bot ${botId} casting ${spellName} (ID: ${spellId})`);

    if (isAllySpell) {
      // Ally spell: target self. Always include position — Structs that don't
      // define a position field (e.g. HealData, ShadowVeilData) ignore it safely.
      const dest = this.generateRandomPosition(pos);
      return {
        caster: botId,
        playerId: botId,
        spellId,
        spellCastInfo: JSON.stringify({
          position: {
            x: { magnitude: dest.x.toString(), sgn: 'Positive' },
            y: { magnitude: dest.y.toString(), sgn: 'Positive' },
          },
        }),
      };
    }

    // Enemy spell → target opponent map
    return {
      caster: botId,
      playerId: opponentState?.playerId ?? botId,
      spellId,
      spellCastInfo: JSON.stringify({
        position: {
          x: { magnitude: pos.x.toString(), sgn: 'Positive' },
          y: { magnitude: pos.y.toString(), sgn: 'Positive' },
        },
      }),
    };
  }

  /**
   * @notice Resolves a valid target position for a spell cast.
   * @dev If the spell defines `castedArea` and the bot state is available,
   *      extracts the caster's current position and picks randomly from the
   *      valid positions returned by `castedArea(x, y)`.
   *      Falls back to a fully random map position when castedArea is absent,
   *      the valid set is empty, or the bot state cannot be parsed.
   */
  private resolveTargetPosition(
    spellDef: (typeof allSpells)[number] | undefined,
    botCurrentState?: IPublicState,
  ): { x: number; y: number } {
    const fallback = () => ({
      x: Math.floor(Math.random() * this.mapSize),
      y: Math.floor(Math.random() * this.mapSize),
    });

    if (!spellDef?.castedArea || !botCurrentState) return fallback();

    const casterPos = this.getPositionFromState(botCurrentState);
    if (!casterPos) return fallback();

    const validPositions = spellDef.castedArea(casterPos.x, casterPos.y);
    if (validPositions.length === 0) return fallback();

    return validPositions[Math.floor(Math.random() * validPositions.length)]!;
  }

  /**
   * @notice Extracts the (x, y) position from a serialised IPublicState.
   * @returns Numeric coords, or null if parsing fails.
   */
  protected getPositionFromState(
    state: IPublicState,
  ): { x: number; y: number } | null {
    try {
      const parsed = JSON.parse(state.fields);
      const pos = parsed?.playerStats?.position?.value;
      const x = parseInt(pos?.x?.magnitude ?? '');
      const y = parseInt(pos?.y?.magnitude ?? '');
      if (isNaN(x) || isNaN(y)) return null;
      return { x, y };
    } catch {
      return null;
    }
  }

  /**
   * @notice Splits available spells into ally-targeting and enemy-targeting buckets.
   * @dev Uses the canonical `target` field from `allSpells` — no wizard-specific
   *      spell-name assumptions.
   */
  protected splitSpells(available: SpellStats[]): {
    allySpells: SpellStats[];
    enemySpells: SpellStats[];
  } {
    const allySpells: SpellStats[] = [];
    const enemySpells: SpellStats[] = [];
    for (const s of available) {
      const def = allSpells.find((d) => d.id.toString() === s.spellId.toString());
      if (def?.target === 'ally') allySpells.push(s);
      else enemySpells.push(s);
    }
    return { allySpells, enemySpells };
  }

  /**
   * @notice Randomly selects up to maxSelectedSkills spells from those available
   *         for the given wizard, padding to 5 slots with empty SpellStats.
   */
  protected selectSpells(wizard: Wizard): SpellStats[] {
    const wizardSpells = allSpells.filter(
      (s) => s.wizardId.toString() === wizard.id.toString()
    );
    console.log(`🤖 Found ${wizardSpells.length} spells for wizard ${wizard.name}`);

    const empty = () =>
      new SpellStats({
        spellId: Field(0),
        cooldown: Int64.from(0),
        currentCooldown: Int64.from(0),
      });

    if (wizardSpells.length === 0) {
      return Array(5).fill(null).map(empty);
    }

    const pool = [...wizardSpells];
    const selected: SpellStats[] = [];
    const numToSelect = Math.min(this.maxSelectedSkills, pool.length);

    for (let i = 0; i < numToSelect; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      selected.push(pool[idx]!.defaultValue);
      pool.splice(idx, 1);
    }

    while (selected.length < 5) selected.push(empty());

    return selected;
  }

  protected generateRandomTilemap(): any[] {
    return Array.from({ length: 64 }, () =>
      Field(Math.random() < 0.5 ? 1 : 2)
    );
  }

  protected generateRandomPosition(current: { x: number; y: number }): {
    x: number;
    y: number;
  } {
    const maxMove = 3;
    return {
      x: Math.max(
        0,
        Math.min(
          this.mapSize - 1,
          current.x + Math.floor(Math.random() * (maxMove * 2 + 1)) - maxMove
        )
      ),
      y: Math.max(
        0,
        Math.min(
          this.mapSize - 1,
          current.y + Math.floor(Math.random() * (maxMove * 2 + 1)) - maxMove
        )
      ),
    };
  }

  protected getSpellName(spellId: string): string {
    return (
      allSpells.find((s) => s.id.toString() === spellId)?.name ??
      `Unknown(${spellId})`
    );
  }
}
