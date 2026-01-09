import { Field, Int64, UInt64 } from 'o1js';
import { Stater } from './stater';
import { State } from './state';

import {
  Effect,
  PlayerStats,
  Position,
  PositionOption,
  SpellStats,
} from './structs';
import { WizardId } from '../wizards';

describe('Stater', () => {
  let initialState: State;
  let stater: Stater;
  let opponentState: State;

  beforeEach(() => {
    // Create initial state
    const playerStats = new PlayerStats({
      hp: Int64.from(100),
      maxHp: Int64.from(100),
      position: new PositionOption({
        value: new Position({
          x: Int64.from(0),
          y: Int64.from(0),
        }),
        isSome: Field(1),
      }),
      speed: Int64.from(1),
      attack: UInt64.from(10),
      defense: UInt64.from(10),
      critChance: UInt64.from(0),
      dodgeChance: UInt64.from(100),
      accuracy: UInt64.from(100),
    });

    const spellStats = Array(5)
      .fill(null)
      .map(
        (_, i) =>
          new SpellStats({
            spellId: Field(i + 1),
            cooldown: Int64.from(3),
            currentCooldown: Int64.from(0),
          })
      );

    // Create effects array with default empty effects
    const publicStateEffects = Array(10)
      .fill(null)
      .map(
        () =>
          new Effect({
            effectId: Field(0),
            duration: Field(0),
            param: Field(0),
          })
      );

    const endOfRoundEffects = Array(10)
      .fill(null)
      .map(
        () =>
          new Effect({
            effectId: Field(0),
            duration: Field(0),
            param: Field(0),
          })
      );

    const onEndEffects = Array(10)
      .fill(null)
      .map(
        () =>
          new Effect({
            effectId: Field(0),
            duration: Field(0),
            param: Field(0),
          })
      );

    initialState = new State({
      playerId: Field(42),
      wizardId: WizardId.MAGE,
      playerStats,
      spellStats,
      publicStateEffects,
      endOfRoundEffects,
      onEndEffects,
      map: [...Array(64).fill(Field(0))],
      turnId: Int64.from(1),
      randomSeed: Field(123),
    });

    stater = new Stater({
      state: initialState,
    });

    // Create opponent state
    opponentState = new State({
      playerId: Field(1),
      wizardId: WizardId.MAGE,
      playerStats: new PlayerStats({
        hp: Int64.from(100),
        maxHp: Int64.from(100),
        position: new PositionOption({
          value: new Position({
            x: Int64.from(0),
            y: Int64.from(0),
          }),
          isSome: Field(1),
        }),
        speed: Int64.from(1),
        attack: UInt64.from(10),
        defense: UInt64.from(10),
        critChance: UInt64.from(0),
        dodgeChance: UInt64.from(100),
        accuracy: UInt64.from(100),
      }),
      spellStats: Array(5)
        .fill(null)
        .map(
          () =>
            new SpellStats({
              spellId: Field(0),
              cooldown: Int64.from(0),
              currentCooldown: Int64.from(0),
            })
        ),
      publicStateEffects: Array(10)
        .fill(null)
        .map(
          () =>
            new Effect({
              effectId: Field(0),
              duration: Field(0),
              param: Field(0),
            })
        ),
      endOfRoundEffects: Array(10)
        .fill(null)
        .map(
          () =>
            new Effect({
              effectId: Field(0),
              duration: Field(0),
              param: Field(0),
            })
        ),
      onEndEffects: Array(10)
        .fill(null)
        .map(
          () =>
            new Effect({
              effectId: Field(0),
              duration: Field(0),
              param: Field(0),
            })
        ),
      map: [...Array(64).fill(Field(0))],
      turnId: Int64.from(1),
      randomSeed: Field(456),
    });
  });

  describe('State', () => {
    it('should copy state correctly', () => {
      const stateCopy = initialState.copy();

      expect(stateCopy.playerId.toString()).toBe(
        initialState.playerId.toString()
      );
      expect(stateCopy.playerStats.hp.toString()).toBe(
        initialState.playerStats.hp.toString()
      );
      expect(stateCopy.turnId.toString()).toBe(initialState.turnId.toString());
      expect(stateCopy.playerStats.position.value.x.toString()).toBe(
        initialState.playerStats.position.value.x.toString()
      );
      expect(stateCopy.playerStats.position.value.y.toString()).toBe(
        initialState.playerStats.position.value.y.toString()
      );
    });

    it('should generate state commit', () => {
      const commit = initialState.getCommit();
      expect(commit).toBeInstanceOf(Field);
    });
  });

  describe('Stater basic functionality', () => {
    it('should generate public state', () => {
      const publicState = stater.generatePublicState();

      expect(publicState.playerId.toString()).toBe(
        stater.state.playerId.toString()
      );
      expect(publicState.playerStats.hp.toString()).toBe(
        stater.state.playerStats.hp.toString()
      );
      expect(publicState.playerStats.position.value.x.toString()).toBe(
        stater.state.playerStats.position.value.x.toString()
      );
      expect(publicState.playerStats.position.value.y.toString()).toBe(
        stater.state.playerStats.position.value.y.toString()
      );
    });

    it('should generate state commit', () => {
      const commit = stater.generateStateCommit();
      expect(commit).toBeInstanceOf(Field);
    });

    it('should have correct initial values', () => {
      expect(stater.state.playerId.toString()).toBe('42');
      expect(stater.state.playerStats.hp.toString()).toBe('100');
      expect(stater.state.turnId.toString()).toBe('1');
      expect(stater.state.randomSeed.toString()).toBe('123');
    });
  });

  describe('applySpellCast', () => {
    it('should not apply spell when target does not match player', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      // Spell targeting someone else (Field(1)) should not affect our player (Field(42))
      const spellCast = {
        caster: Field(1),
        spellId: Field(999),
        target: Field(1), // Target is not our player
        additionalData: {},
        hash: () => Field(0),
      };

      // Should not throw, just return early
      stater.applySpellCast(spellCast, opponentState);

      // HP should be unchanged
      expect(stater.state.playerStats.hp.toString()).toBe(initialHp);
    });

    it('should throw error for unknown spell when target matches player', () => {
      const spellCast = {
        caster: Field(1),
        spellId: Field(999),
        target: Field(42), // Target matches our player
        additionalData: {},
        hash: () => Field(0),
      };

      expect(() => stater.applySpellCast(spellCast, opponentState)).toThrow(
        'No such spell modifier'
      );
    });
  });

  describe('applyEffect', () => {
    it('should throw error for unknown effect', () => {
      const effect = new Effect({
        effectId: Field(999),
        duration: Field(3),
        param: Field(0),
      });

      const publicState = stater.generatePublicState();

      expect(() => stater.applyEffect(publicState, effect)).toThrow(
        'No such effectInfo'
      );
    });

    it('should skip effects with effectId of 0', () => {
      const effect = new Effect({
        effectId: Field(0),
        duration: Field(3),
        param: Field(0),
      });

      const publicState = stater.generatePublicState();

      // Should not throw for effectId 0, just return early
      expect(() => stater.applyEffect(publicState, effect)).not.toThrow();
    });
  });

  describe('applyEffects', () => {
    it('should attempt to apply non-zero effect IDs', () => {
      // Set up an effect with non-zero ID
      stater.state.publicStateEffects[0] = new Effect({
        effectId: Field(10),
        duration: Field(3),
        param: Field(0),
      });

      // Create a copy of state for publicState without calling generatePublicState
      // (which would trigger applyPublicStateEffects and throw early)
      const publicState = stater.state.copy();

      expect(() => stater.applyPublicStateEffects(publicState)).toThrow(
        'No such effectInfo'
      );
    });
  });

  describe('apply - integration', () => {
    it('should generate state commit correctly', () => {
      const commit = stater.generateStateCommit();
      expect(commit).toBeInstanceOf(Field);
    });

    it('should generate public state correctly', () => {
      const publicState = stater.generatePublicState();

      expect(publicState).toBeInstanceOf(State);
      expect(publicState.playerId.toString()).toBe(
        stater.state.playerId.toString()
      );
      expect(publicState.playerStats.hp.toString()).toBe(
        stater.state.playerStats.hp.toString()
      );
    });
  });

  describe('error handling', () => {
    it('should handle unknown spell ID when target matches', () => {
      const spellCast = {
        caster: Field(1),
        spellId: Field(0),
        target: Field(42), // Target matches our player
        additionalData: {},
        hash: () => Field(0),
      };

      expect(() => stater.applySpellCast(spellCast, opponentState)).toThrow(
        'No such spell modifier'
      );
    });

    it('should handle invalid effect ID types gracefully', () => {
      const effect = new Effect({
        effectId: Field(999),
        duration: Field(0),
        param: Field(0),
      });

      const publicState = stater.generatePublicState();

      expect(() => stater.applyEffect(publicState, effect)).toThrow(
        'No such effectInfo'
      );
    });
  });

  describe('Position struct', () => {
    it('should calculate manhattan distance correctly', () => {
      const pos1 = new Position({ x: Int64.from(0), y: Int64.from(0) });
      const pos2 = new Position({ x: Int64.from(3), y: Int64.from(4) });

      const distance = pos1.manhattanDistance(pos2);
      expect(distance.toString()).toBe('7'); // |3-0| + |4-0| = 7
    });

    it('should handle negative coordinates', () => {
      const pos1 = new Position({ x: Int64.from(-2), y: Int64.from(-3) });
      const pos2 = new Position({ x: Int64.from(1), y: Int64.from(2) });

      const distance = pos1.manhattanDistance(pos2);
      expect(distance.toString()).toBe('8'); // |1-(-2)| + |2-(-3)| = 3 + 5 = 8
    });
  });

  describe('struct creation and properties', () => {
    it('should create PlayerStats correctly', () => {
      const position = new Position({ x: Int64.from(5), y: Int64.from(10) });
      const playerStats = new PlayerStats({
        hp: Int64.from(150),
        maxHp: Int64.from(150),
        position: new PositionOption({ value: position, isSome: Field(1) }),
        speed: Int64.from(1),
        attack: UInt64.from(10),
        defense: UInt64.from(10),
        critChance: UInt64.from(0),
        dodgeChance: UInt64.from(100),
        accuracy: UInt64.from(100),
      });

      expect(playerStats.hp.toString()).toBe('150');
      expect(playerStats.position.value.x.toString()).toBe('5');
      expect(playerStats.position.value.y.toString()).toBe('10');
    });

    it('should create SpellStats correctly', () => {
      const spellStats = new SpellStats({
        spellId: Field(42),
        cooldown: Int64.from(5),
        currentCooldown: Int64.from(2),
      });

      expect(spellStats.spellId.toString()).toBe('42');
      expect(spellStats.cooldown.toString()).toBe('5');
      expect(spellStats.currentCooldown.toString()).toBe('2');
    });

    it('should create Effect correctly', () => {
      const effect = new Effect({
        effectId: Field(123),
        duration: Field(10),
        param: Field(0),
      });

      expect(effect.effectId.toString()).toBe('123');
      expect(effect.duration.toString()).toBe('10');
    });
  });

  describe('State arrays and initialization', () => {
    it('should initialize with correct number of spell stats', () => {
      expect(stater.state.spellStats.length).toBe(5);

      for (let i = 0; i < 5; i++) {
        const spellStat = stater.state.spellStats[i];
        expect(spellStat).toBeDefined();
        expect(spellStat!.spellId.toString()).toBe((i + 1).toString());
        expect(spellStat!.cooldown.toString()).toBe('3');
        expect(spellStat!.currentCooldown.toString()).toBe('0');
      }
    });

    it('should initialize with correct number of effects', () => {
      expect(stater.state.publicStateEffects.length).toBe(10);

      for (let i = 0; i < 10; i++) {
        const effect = stater.state.publicStateEffects[i];
        expect(effect).toBeDefined();
        expect(effect!.effectId.toString()).toBe('0');
        expect(effect!.duration.toString()).toBe('0');
      }
    });

    it('should have consistent state between copy and original', () => {
      const stateCopy = stater.state.copy();

      expect(stateCopy.spellStats.length).toBe(stater.state.spellStats.length);
      expect(stateCopy.publicStateEffects.length).toBe(
        stater.state.publicStateEffects.length
      );

      for (let i = 0; i < 5; i++) {
        const originalSpellStat = stater.state.spellStats[i];
        const copySpellStat = stateCopy.spellStats[i];
        expect(originalSpellStat).toBeDefined();
        expect(copySpellStat).toBeDefined();
        expect(copySpellStat!.spellId.toString()).toBe(
          originalSpellStat!.spellId.toString()
        );
      }
    });
  });

  describe('random seed behavior', () => {
    it('should maintain random seed throughout operations', () => {
      const originalSeed = stater.state.randomSeed.toString();

      // Try operations that don't modify randomSeed
      stater.generatePublicState();
      stater.generateStateCommit();

      expect(stater.state.randomSeed.toString()).toBe(originalSeed);
    });
  });
});
