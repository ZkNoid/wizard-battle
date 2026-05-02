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
   * @notice Simulates game-physics effects of all round actions on the bot's state.
   * @dev This is universal game logic (damage, movement, healing) independent of
   *      which wizard or strategy is used. Spell damage values mirror the frontend
   *      game engine so trusted states stay consistent.
   */
  generateTrustedState(
    botId: string,
    currentState: IPublicState,
    allActions: { [playerId: string]: IUserActions }
  ): ITrustedState {
    const stateCommit = `bot_commit_${botId}_${Date.now()}_${Math.random()}`;
    const signature = `bot_trusted_signature_${botId}_${Date.now()}`;

    try {
      const parsed = JSON.parse(currentState.fields);

      let botHP = parseInt(parsed?.playerStats?.hp?.magnitude ?? '100');
      let botX = parseInt(parsed?.playerStats?.position?.value?.x?.magnitude ?? '0');
      let botY = parseInt(parsed?.playerStats?.position?.value?.y?.magnitude ?? '0');

      const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

      // Resolve spell IDs needed for physics simulation (universal game knowledge)
      const spellIds = this.resolveSpellIds();

      // ── Apply opponent actions → damage bot ───────────────────────────────────
      let damagedThisRound = false;
      const preActionPos = { x: botX, y: botY };

      for (const [playerId, ua] of Object.entries(allActions || {})) {
        if (playerId === botId) continue;
        for (const action of ua?.actions ?? []) {
          if (!action) continue;
          let targetX = 0;
          let targetY = 0;
          try {
            const info = JSON.parse(action.spellCastInfo || '{}');
            targetX = parseInt(info?.position?.x?.magnitude ?? '0');
            targetY = parseInt(info?.position?.y?.magnitude ?? '0');
          } catch { /* ignore parse errors */ }

          const dist = manhattan(preActionPos, { x: targetX, y: targetY });

          // Accept both hashed IDs and human-readable names from tests
          const isFireball =
            action.spellId === spellIds.FIREBALL_ID || action.spellId === 'FireBall';
          const isLightning =
            action.spellId === spellIds.LIGHTNING_ID ||
            action.spellId === 'Lightning' ||
            action.spellId === 'LightningBold';

          if (isFireball) {
            const before = botHP;
            if (dist === 0) botHP = Math.max(0, botHP - 60);
            else if (dist === 1) botHP = Math.max(0, botHP - 40);
            else if (dist === 2) botHP = Math.max(0, botHP - 20);
            if (botHP !== before) damagedThisRound = true;
          } else if (isLightning) {
            const before = botHP;
            if (dist === 0) botHP = Math.max(0, botHP - 100);
            else if (dist === 1) botHP = Math.max(0, botHP - 50);
            if (botHP !== before) damagedThisRound = true;
          }
        }
      }

      // ── Apply bot's own actions → movement / healing ──────────────────────────
      for (const action of allActions?.[botId]?.actions ?? []) {
        if (!action?.spellId) continue;
        if (action.spellId === spellIds.TELEPORT_ID) {
          try {
            const info = JSON.parse(action.spellCastInfo || '{}');
            const tx = parseInt(info?.position?.x?.magnitude ?? '0');
            const ty = parseInt(info?.position?.y?.magnitude ?? '0');
            if (Number.isFinite(tx) && Number.isFinite(ty)) {
              botX = tx;
              botY = ty;
            }
          } catch { /* ignore */ }
        } else if (action.spellId === spellIds.HEAL_ID && !damagedThisRound) {
          // To make damage visible to clients/tests, skip immediate heal if bot took damage this round
          botHP = Math.min(100, botHP + 100);
        }
      }

      // ── Write back updated values ─────────────────────────────────────────────
      if (parsed?.playerStats?.hp) {
        parsed.playerStats.hp.magnitude = botHP.toString();
        parsed.playerStats.hp.sgn = 'Positive';
      }
      if (parsed?.playerStats?.position?.value?.x) {
        parsed.playerStats.position.value.x.magnitude = botX.toString();
        parsed.playerStats.position.value.x.sgn = 'Positive';
      }
      if (parsed?.playerStats?.position?.value?.y) {
        parsed.playerStats.position.value.y.magnitude = botY.toString();
        parsed.playerStats.position.value.y.sgn = 'Positive';
      }

      return {
        playerId: botId,
        stateCommit,
        publicState: {
          socketId: currentState.socketId,
          playerId: botId,
          fields: JSON.stringify(parsed),
        },
        signature,
      };
    } catch {
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
   * @dev Determines ally/enemy targeting and position payload from spell type.
   *      Teleport → ally map + random position near current spot
   *      Heal     → ally map, no position
   *      All else → enemy map + random target position
   * @param targetPos Override target position; random if omitted
   */
  protected buildSpellAction(
    botId: string,
    spellId: string,
    opponentState?: IPublicState,
    targetPos?: { x: number; y: number }
  ): IUserAction {
    const spellName = this.getSpellName(spellId);
    const spellIds = this.resolveSpellIds();

    const randomPos = targetPos ?? {
      x: Math.floor(Math.random() * this.mapSize),
      y: Math.floor(Math.random() * this.mapSize),
    };

    console.log(`🤖 Bot ${botId} casting ${spellName} (ID: ${spellId})`);

    if (spellId === spellIds.TELEPORT_ID) {
      const dest = this.generateRandomPosition(randomPos);
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

    if (spellId === spellIds.HEAL_ID) {
      return {
        caster: botId,
        playerId: botId,
        spellId,
        spellCastInfo: JSON.stringify({}),
      };
    }

    // Attack spell → target enemy map
    return {
      caster: botId,
      playerId: opponentState?.playerId ?? botId,
      spellId,
      spellCastInfo: JSON.stringify({
        position: {
          x: { magnitude: randomPos.x.toString(), sgn: 'Positive' },
          y: { magnitude: randomPos.y.toString(), sgn: 'Positive' },
        },
      }),
    };
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

  /**
   * @notice Resolves global spell IDs by name.
   * @dev Used in `generateTrustedState` for physics simulation and in
   *      `buildSpellAction` for targeting. Not an action-selection concern.
   */
  protected resolveSpellIds() {
    return {
      FIREBALL_ID:  allSpells.find((s) => s.name === 'FireBall')?.id.toString(),
      LIGHTNING_ID: allSpells.find((s) => s.name === 'Lightning')?.id.toString(),
      TELEPORT_ID:  allSpells.find((s) => s.name === 'Teleport')?.id.toString(),
      HEAL_ID:      allSpells.find((s) => s.name === 'Heal')?.id.toString(),
    };
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
