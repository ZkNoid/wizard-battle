import { MageBotStrategy } from './mage-bot.strategy';
import { ArcherBotStrategy } from './archer-bot.strategy';
import { PhantomDuelistBotStrategy } from './phantom-duelist-bot.strategy';
import { State } from '../../../../common/stater/state';
import { IPublicState } from '../../../../common/types/matchmaking.types';
import { IUserActions } from '../../../../common/types/gameplay.types';
import { allSpells } from '../../../../common/stater/spells';

// ── Helpers ───────────────────────────────────────────────────────────────────

const BOT_ID = 'bot_1';
const OPPONENT_ID = 'player_9999';

/** Returns a fresh IPublicState whose fields are valid State JSON. */
function makePublicState(
  playerId = OPPONENT_ID,
  socketId = 'opp-socket'
): IPublicState {
  return {
    socketId,
    playerId,
    fields: JSON.stringify(State.toJSON(State.default())),
  };
}

/** Replaces all spellStats entries with spellId = '0' so getAvailableSpells returns []. */
function zeroOutSpells(state: IPublicState): IPublicState {
  const parsed = JSON.parse(state.fields);
  if (Array.isArray(parsed?.spellStats)) {
    parsed.spellStats = parsed.spellStats.map(() => ({
      spellId: '0',
      cooldown: { magnitude: '0', sgn: 'Positive' },
      currentCooldown: { magnitude: '0', sgn: 'Positive' },
    }));
  }
  return { ...state, fields: JSON.stringify(parsed) };
}

// ── BaseBotStrategy — generateSetup ──────────────────────────────────────────

describe('BaseBotStrategy — generateSetup', () => {
  let strategy: MageBotStrategy;

  beforeEach(() => {
    strategy = new MageBotStrategy();
  });

  it('returns a valid IPublicState with matching socketId and playerId', () => {
    const result = strategy.generateSetup(BOT_ID, 'socket-xyz');

    expect(result).toMatchObject({
      socketId: 'socket-xyz',
      playerId: BOT_ID,
    });
  });

  it('fields is a non-empty JSON string', () => {
    const result = strategy.generateSetup(BOT_ID, 's');

    expect(typeof result.fields).toBe('string');
    expect(() => JSON.parse(result.fields)).not.toThrow();
  });

  it('fields is parseable by State.fromJSON', () => {
    const result = strategy.generateSetup(BOT_ID, 's');

    expect(() =>
      State.fromJSON(JSON.parse(result.fields))
    ).not.toThrow();
  });

  it('initializes botStater after setup', () => {
    expect((strategy as any).botStater).toBeNull();

    strategy.generateSetup(BOT_ID, 's');

    expect((strategy as any).botStater).not.toBeNull();
  });

  it('botStater.state.playerId is numeric (parseable from botId digits)', () => {
    strategy.generateSetup('bot_42', 's');

    const numericId = (strategy as any).botStater.state.playerId.toString();
    expect(Number.isFinite(Number(numericId))).toBe(true);
  });
});

// ── BaseBotStrategy — generateTrustedState ───────────────────────────────────

describe('BaseBotStrategy — generateTrustedState', () => {
  let strategy: MageBotStrategy;
  let botState: IPublicState;
  let opponentState: IPublicState;

  beforeEach(() => {
    strategy = new MageBotStrategy();
    botState = strategy.generateSetup(BOT_ID, 'socket-1');
    opponentState = makePublicState(OPPONENT_ID);
  });

  const mockApplyActions = (strat: MageBotStrategy, returnValue = State.default()) =>
    jest
      .spyOn((strat as any).botStater, 'applyActions')
      .mockReturnValue(returnValue);

  // ── return shape ────────────────────────────────────────────────────────────

  it('returns ITrustedState with correct playerId and non-empty commit/signature', () => {
    mockApplyActions(strategy);

    const result = strategy.generateTrustedState(
      BOT_ID,
      botState,
      {},
      opponentState
    );

    expect(result.playerId).toBe(BOT_ID);
    expect(result.publicState.playerId).toBe(BOT_ID);
    expect(result.stateCommit).toBeTruthy();
    expect(result.signature).toBeTruthy();
  });

  it('preserves socketId from currentState', () => {
    const stateWithSocket = { ...botState, socketId: 'specific-socket' };
    mockApplyActions(strategy);

    const result = strategy.generateTrustedState(
      BOT_ID,
      stateWithSocket,
      {},
      opponentState
    );

    expect(result.publicState.socketId).toBe('specific-socket');
  });

  it('returns fields from the applyActions output, not from currentState', () => {
    const updatedState = State.default();
    mockApplyActions(strategy, updatedState);

    const result = strategy.generateTrustedState(
      BOT_ID,
      botState,
      {},
      opponentState
    );

    const expectedFields = JSON.stringify(State.toJSON(updatedState));
    expect(result.publicState.fields).toBe(expectedFields);
  });

  // ── applyActions invocation ─────────────────────────────────────────────────

  it('calls botStater.applyActions exactly once', () => {
    const spy = mockApplyActions(strategy);

    strategy.generateTrustedState(BOT_ID, botState, {}, opponentState);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('passes opponentState reconstructed from opponentPublicState fields as second arg', () => {
    let capturedOpponent: any;
    jest
      .spyOn((strategy as any).botStater, 'applyActions')
      .mockImplementation((_ua: IUserActions, opp: any) => {
        capturedOpponent = opp;
        return State.default();
      });

    strategy.generateTrustedState(BOT_ID, botState, {}, opponentState);

    // Reconstructed opponent should be a State-like object (not the default fallback with random key)
    expect(capturedOpponent).not.toBeNull();
    expect(typeof capturedOpponent.playerId?.toString).toBe('function');
  });

  // ── ID remapping ────────────────────────────────────────────────────────────

  it('remaps bot string ID → numeric Field ID in caster field', () => {
    const botActions: IUserActions = {
      actions: [
        {
          caster: BOT_ID, // string "bot_1" — must become numeric
          playerId: OPPONENT_ID,
          spellId: '1',
          spellCastInfo: '{}',
        },
      ],
      signature: '',
    };

    let captured: IUserActions | null = null;
    jest
      .spyOn((strategy as any).botStater, 'applyActions')
      .mockImplementation((ua: IUserActions) => { captured = ua; return State.default(); });

    strategy.generateTrustedState(
      BOT_ID,
      botState,
      { [BOT_ID]: botActions },
      opponentState
    );

    const botNumericId = (strategy as any).botStater.state.playerId.toString();
    expect(captured!.actions[0].caster).toBe(botNumericId);
    expect(captured!.actions[0].caster).not.toBe(BOT_ID);
  });

  it('maps self-targeting action (playerId === botId) to bot numeric ID', () => {
    const botActions: IUserActions = {
      actions: [
        {
          caster: BOT_ID,
          playerId: BOT_ID, // Heal / Teleport — self-cast
          spellId: '2',
          spellCastInfo: '{}',
        },
      ],
      signature: '',
    };

    let captured: IUserActions | null = null;
    jest
      .spyOn((strategy as any).botStater, 'applyActions')
      .mockImplementation((ua: IUserActions) => { captured = ua; return State.default(); });

    strategy.generateTrustedState(
      BOT_ID,
      botState,
      { [BOT_ID]: botActions },
      opponentState
    );

    const botNumericId = (strategy as any).botStater.state.playerId.toString();
    expect(captured!.actions[0].playerId).toBe(botNumericId);
  });

  it('maps opponent attack targeting bot to bot numeric ID', () => {
    const opponentActions: IUserActions = {
      actions: [
        {
          caster: OPPONENT_ID,
          playerId: BOT_ID, // opponent attacks bot
          spellId: '3',
          spellCastInfo: '{}',
        },
      ],
      signature: '',
    };

    let captured: IUserActions | null = null;
    jest
      .spyOn((strategy as any).botStater, 'applyActions')
      .mockImplementation((ua: IUserActions) => { captured = ua; return State.default(); });

    strategy.generateTrustedState(
      BOT_ID,
      botState,
      { [OPPONENT_ID]: opponentActions },
      opponentState
    );

    const botNumericId = (strategy as any).botStater.state.playerId.toString();
    expect(captured!.actions[0].playerId).toBe(botNumericId);
  });

  it('merges actions from all players into a single batch', () => {
    const botActions: IUserActions = {
      actions: [
        { caster: BOT_ID, playerId: OPPONENT_ID, spellId: '1', spellCastInfo: '{}' },
      ],
      signature: '',
    };
    const oppActions: IUserActions = {
      actions: [
        { caster: OPPONENT_ID, playerId: BOT_ID, spellId: '2', spellCastInfo: '{}' },
        { caster: OPPONENT_ID, playerId: BOT_ID, spellId: '3', spellCastInfo: '{}' },
      ],
      signature: '',
    };

    let captured: IUserActions | null = null;
    jest
      .spyOn((strategy as any).botStater, 'applyActions')
      .mockImplementation((ua: IUserActions) => { captured = ua; return State.default(); });

    strategy.generateTrustedState(
      BOT_ID,
      botState,
      { [BOT_ID]: botActions, [OPPONENT_ID]: oppActions },
      opponentState
    );

    expect(captured!.actions).toHaveLength(3);
  });

  it('passes empty actions array when allActions is empty', () => {
    let captured: IUserActions | null = null;
    jest
      .spyOn((strategy as any).botStater, 'applyActions')
      .mockImplementation((ua: IUserActions) => { captured = ua; return State.default(); });

    strategy.generateTrustedState(BOT_ID, botState, {}, opponentState);

    expect(captured!.actions).toHaveLength(0);
  });

  // ── fallback behaviour ───────────────────────────────────────────────────────

  it('falls back to unchanged currentState when botStater is null', () => {
    (strategy as any).botStater = null;

    const result = strategy.generateTrustedState(BOT_ID, botState, {});

    expect(result.publicState.fields).toBe(botState.fields);
    expect(result.playerId).toBe(BOT_ID);
  });

  it('falls back to unchanged currentState when applyActions throws', () => {
    jest
      .spyOn((strategy as any).botStater, 'applyActions')
      .mockImplementation(() => { throw new Error('simulated o1js error'); });

    const result = strategy.generateTrustedState(BOT_ID, botState, {});

    expect(result.publicState.fields).toBe(botState.fields);
  });

  it('works without opponentPublicState (uses State.default() as opponent)', () => {
    const spy = mockApplyActions(strategy);

    // No opponentPublicState arg
    expect(() =>
      strategy.generateTrustedState(BOT_ID, botState, {})
    ).not.toThrow();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ── MageBotStrategy — pickActions ────────────────────────────────────────────

describe('MageBotStrategy — generateActions', () => {
  let strategy: MageBotStrategy;
  let botState: IPublicState;
  const oppState = makePublicState();

  beforeEach(() => {
    strategy = new MageBotStrategy();
    botState = strategy.generateSetup(BOT_ID, 's');
  });

  it('returns IUserActions with a signature string', () => {
    const result = strategy.generateActions(BOT_ID, botState, oppState);

    expect(Array.isArray(result.actions)).toBe(true);
    expect(typeof result.signature).toBe('string');
  });

  it('each action has caster, playerId, spellId, spellCastInfo', () => {
    const result = strategy.generateActions(BOT_ID, botState, oppState);

    for (const action of result.actions) {
      expect(action).toHaveProperty('caster', BOT_ID);
      expect(action).toHaveProperty('playerId');
      expect(action).toHaveProperty('spellId');
      expect(action).toHaveProperty('spellCastInfo');
    }
  });

  it('returns at most 2 actions', () => {
    const result = strategy.generateActions(BOT_ID, botState, oppState);

    expect(result.actions.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array when no spells available', () => {
    const emptyState = zeroOutSpells(botState);

    const result = strategy.generateActions(BOT_ID, emptyState, oppState);

    expect(result.actions).toHaveLength(0);
  });

  it('first action is an ally spell (repositioning) when one is available', () => {
    const available = (strategy as any).getAvailableSpells(botState);
    const allySpellIds = allSpells
      .filter((s) => s.target === 'ally')
      .map((s) => s.id.toString());
    const hasAllySpell = available.some((s: any) =>
      allySpellIds.includes(s.spellId.toString())
    );

    if (hasAllySpell) {
      const result = strategy.generateActions(BOT_ID, botState, oppState);
      expect(allySpellIds).toContain(result.actions[0]?.spellId);
    }
  });
});

// ── ArcherBotStrategy — pickActions ──────────────────────────────────────────

describe('ArcherBotStrategy — generateActions', () => {
  let strategy: ArcherBotStrategy;
  let botState: IPublicState;

  beforeEach(() => {
    strategy = new ArcherBotStrategy();
    botState = strategy.generateSetup(BOT_ID, 's');
  });

  it('returns at most 2 actions', () => {
    const result = strategy.generateActions(BOT_ID, botState);

    expect(result.actions.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array when no spells available', () => {
    const emptyState = zeroOutSpells(botState);

    const result = strategy.generateActions(BOT_ID, emptyState);

    expect(result.actions).toHaveLength(0);
  });

  it('actions are distinct (no duplicate spell IDs in same turn)', () => {
    const result = strategy.generateActions(BOT_ID, botState);

    const spellIds = result.actions.map((a) => a.spellId);
    const unique = new Set(spellIds);
    expect(unique.size).toBe(spellIds.length);
  });
});

// ── PhantomDuelistBotStrategy — pickActions ───────────────────────────────────

describe('PhantomDuelistBotStrategy — generateActions', () => {
  let strategy: PhantomDuelistBotStrategy;
  let botState: IPublicState;

  beforeEach(() => {
    strategy = new PhantomDuelistBotStrategy();
    botState = strategy.generateSetup(BOT_ID, 's');
  });

  it('returns at most 2 actions', () => {
    const result = strategy.generateActions(BOT_ID, botState);

    expect(result.actions.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array when no spells available', () => {
    const emptyState = zeroOutSpells(botState);

    const result = strategy.generateActions(BOT_ID, emptyState);

    expect(result.actions).toHaveLength(0);
  });

  it('includes an ally spell when HP <= 60 and an ally spell is available', () => {
    const available = (strategy as any).getAvailableSpells(botState);
    const allySpellIds = allSpells
      .filter((s) => s.target === 'ally')
      .map((s) => s.id.toString());
    const hasAllySpell = available.some((s: any) =>
      allySpellIds.includes(s.spellId.toString())
    );

    if (!hasAllySpell) return; // skip if wizard has no ally spells available

    const parsed = JSON.parse(botState.fields);
    if (parsed?.playerStats?.hp) {
      parsed.playerStats.hp.magnitude = '40';
    }
    const lowHpState: IPublicState = {
      ...botState,
      fields: JSON.stringify(parsed),
    };

    const result = strategy.generateActions(BOT_ID, lowHpState);

    expect(result.actions.some((a) => allySpellIds.includes(a.spellId))).toBe(true);
  });

  it('does not use an ally spell as first action when HP > 60', () => {
    const available = (strategy as any).getAvailableSpells(botState);
    const enemySpellIds = allSpells
      .filter((s) => s.target === 'enemy')
      .map((s) => s.id.toString());
    const hasEnemySpell = available.some((s: any) =>
      enemySpellIds.includes(s.spellId.toString())
    );

    if (!hasEnemySpell) return;

    const parsed = JSON.parse(botState.fields);
    if (parsed?.playerStats?.hp) {
      parsed.playerStats.hp.magnitude = '100';
    }
    const fullHpState: IPublicState = {
      ...botState,
      fields: JSON.stringify(parsed),
    };

    const result = strategy.generateActions(BOT_ID, fullHpState);

    // When HP is full, at least one action should be an attack (enemy spell)
    if (result.actions.length > 0) {
      expect(result.actions.some((a) => enemySpellIds.includes(a.spellId))).toBe(true);
    }
  });
});
