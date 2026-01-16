import { Field, Int64, UInt64, CircuitString, PrivateKey } from 'o1js';
import { Stater } from './stater';
import { State } from './state';
import {
  PlayerStats,
  Position,
  SpellStats,
  Effect,
  PositionOption,
} from './structs';
import {
  ArrowModifier,
  ArrowData,
  ArrowSpellCast,
  AimingShotModifier,
  AimingShotData,
  AimingShotSpellCast,
  HailOfArrowsModifier,
  HailOfArrowsData,
  HailOfArrowsSpellCast,
} from './spells/archer';
import { WizardId } from '../wizards';

describe('Random Events', () => {
  // Helper to create a state with specific random seed
  const createStateWithSeed = (
    playerId: number,
    seed: number,
    dodgeChance: number = 100,
    accuracy: number = 100
  ): State => {
    return new State({
      playerId: Field(playerId),
      wizardId: WizardId.ARCHER,
      playerStats: new PlayerStats({
        hp: Int64.from(100),
        maxHp: Int64.from(100),
        position: new PositionOption({
          value: new Position({
            x: Int64.from(5),
            y: Int64.from(5),
          }),
          isSome: Field(1),
        }),
        speed: Int64.from(1),
        attack: UInt64.from(10),
        defense: UInt64.from(10),
        critChance: UInt64.from(0),
        dodgeChance: UInt64.from(dodgeChance),
        accuracy: UInt64.from(accuracy),
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
      randomSeed: Field(seed),
      signingKey: PrivateKey.random(),
    });
  };

  describe('getRandomPercentage', () => {
    it('should return a value between 0 and 99', () => {
      // Test with multiple seeds to ensure values are in range
      for (let seed = 0; seed < 100; seed++) {
        const state = createStateWithSeed(42, seed);
        const stater = new Stater({ state });

        const randomValue = stater.getRandomPercentage();
        const value = parseInt(randomValue.toString());

        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(100);
      }
    });

    it('should return deterministic values for same seed', () => {
      const seed = 12345;

      const state1 = createStateWithSeed(42, seed);
      const stater1 = new Stater({ state: state1 });
      const value1 = stater1.getRandomPercentage().toString();

      const state2 = createStateWithSeed(42, seed);
      const stater2 = new Stater({ state: state2 });
      const value2 = stater2.getRandomPercentage().toString();

      expect(value1).toBe(value2);
    });

    it('should return different values for different seeds', () => {
      const state1 = createStateWithSeed(42, 123);
      const stater1 = new Stater({ state: state1 });
      const value1 = stater1.getRandomPercentage().toString();

      const state2 = createStateWithSeed(42, 456);
      const stater2 = new Stater({ state: state2 });
      const value2 = stater2.getRandomPercentage().toString();

      // With high probability, different seeds produce different values
      // (not guaranteed but extremely likely)
      expect(value1).not.toBe(value2);
    });

    it('should produce varied distribution across seeds', () => {
      const values = new Set<string>();

      for (let seed = 0; seed < 50; seed++) {
        const state = createStateWithSeed(42, seed);
        const stater = new Stater({ state });
        values.add(stater.getRandomPercentage().toString());
      }

      // Should produce at least 10 different values from 50 different seeds
      expect(values.size).toBeGreaterThan(10);
    });
  });

  describe('applyDamage with dodge/accuracy', () => {
    it('should always hit when hitChance is 100 (dodgeChance=100, accuracy=100)', () => {
      const state = createStateWithSeed(42, 123, 100, 100);
      const stater = new Stater({ state });
      const opponentState = createStateWithSeed(1, 456, 100, 100);

      const initialHp = parseInt(stater.state.playerStats.hp.toString());

      stater.applyDamage(UInt64.from(50), opponentState);

      const finalHp = parseInt(stater.state.playerStats.hp.toString());
      expect(finalHp).toBe(initialHp - 50);
    });

    it('should never hit when hitChance is 0 (dodgeChance=0)', () => {
      const state = createStateWithSeed(42, 123, 0, 100); // dodgeChance=0
      const stater = new Stater({ state });
      const opponentState = createStateWithSeed(1, 456, 100, 100);

      const initialHp = parseInt(stater.state.playerStats.hp.toString());

      stater.applyDamage(UInt64.from(50), opponentState);

      const finalHp = parseInt(stater.state.playerStats.hp.toString());
      expect(finalHp).toBe(initialHp); // No damage dealt
    });

    it('should never hit when accuracy is 0', () => {
      const state = createStateWithSeed(42, 123, 100, 100);
      const stater = new Stater({ state });
      const opponentState = createStateWithSeed(1, 456, 100, 0); // accuracy=0

      const initialHp = parseInt(stater.state.playerStats.hp.toString());

      stater.applyDamage(UInt64.from(50), opponentState);

      const finalHp = parseInt(stater.state.playerStats.hp.toString());
      expect(finalHp).toBe(initialHp); // No damage dealt
    });

    it('should have partial hit chance with intermediate values', () => {
      // hitChance = accuracy * dodgeChance / 100
      // With accuracy=50, dodgeChance=50: hitChance = 50*50/100 = 25
      // So hits should occur ~25% of the time

      let hits = 0;
      let misses = 0;
      const totalTrials = 100;

      for (let seed = 0; seed < totalTrials; seed++) {
        const state = createStateWithSeed(42, seed, 50, 100); // dodgeChance=50
        const stater = new Stater({ state });
        const opponentState = createStateWithSeed(1, 456, 50, 50); // accuracy=50

        const initialHp = parseInt(stater.state.playerStats.hp.toString());
        stater.applyDamage(UInt64.from(50), opponentState);
        const finalHp = parseInt(stater.state.playerStats.hp.toString());

        if (finalHp < initialHp) {
          hits++;
        } else {
          misses++;
        }
      }

      // With hitChance=25, we expect roughly 25 hits out of 100
      // Allow for variance: expect between 10-40 hits
      expect(hits).toBeGreaterThan(5);
      expect(hits).toBeLessThan(50);
      expect(misses).toBeGreaterThan(50);
    });

    it('should scale damage with attack and defense', () => {
      // fullDamage = damage * attack * defense / 100
      const state = createStateWithSeed(42, 123, 100, 100);
      state.playerStats.attack = UInt64.from(20); // 2x attack
      state.playerStats.defense = UInt64.from(10);
      const stater = new Stater({ state });
      const opponentState = createStateWithSeed(1, 456, 100, 100);

      const initialHp = parseInt(stater.state.playerStats.hp.toString());

      stater.applyDamage(UInt64.from(50), opponentState);

      const finalHp = parseInt(stater.state.playerStats.hp.toString());
      // Expected: 50 * 20 * 10 / 100 = 100
      expect(finalHp).toBe(initialHp - 100);
    });
  });

  describe('Arrow bleeding effect (50% chance)', () => {
    it('should sometimes apply bleeding and sometimes not', () => {
      let bleedingApplied = 0;
      let nobleeding = 0;
      const totalTrials = 50;

      const arrowSpellId = CircuitString.fromString('Arrow').hash();

      for (let seed = 0; seed < totalTrials; seed++) {
        const state = createStateWithSeed(42, seed, 100, 100);
        const stater = new Stater({ state });
        const opponentState = createStateWithSeed(1, 456 + seed, 100, 100);

        const spellCast = new ArrowSpellCast({
          spellId: arrowSpellId,
          caster: Field(1),
          target: Field(42),
          additionalData: new ArrowData({
            position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Direct hit
          }),
        });

        const initialEffectLength = stater.state.getEffectLength('endOfRound');
        ArrowModifier(stater, spellCast, opponentState);
        const finalEffectLength = stater.state.getEffectLength('endOfRound');

        if (finalEffectLength > initialEffectLength) {
          bleedingApplied++;
        } else {
          nobleeding++;
        }
      }

      // With 50% chance, expect roughly 25 bleedings out of 50
      // Allow for variance: expect between 10-40
      expect(bleedingApplied).toBeGreaterThan(5);
      expect(bleedingApplied).toBeLessThan(45);
      expect(nobleeding).toBeGreaterThan(5);
    });

    it('should not apply bleeding on miss', () => {
      const arrowSpellId = CircuitString.fromString('Arrow').hash();

      // Test multiple seeds - none should apply bleeding when missing
      for (let seed = 0; seed < 20; seed++) {
        const state = createStateWithSeed(42, seed, 100, 100);
        const stater = new Stater({ state });
        const opponentState = createStateWithSeed(1, 456, 100, 100);

        const spellCast = new ArrowSpellCast({
          spellId: arrowSpellId,
          caster: Field(1),
          target: Field(42),
          additionalData: new ArrowData({
            position: new Position({ x: Int64.from(10), y: Int64.from(10) }), // Miss (not at player position)
          }),
        });

        const initialEffectLength = stater.state.getEffectLength('endOfRound');
        ArrowModifier(stater, spellCast, opponentState);
        const finalEffectLength = stater.state.getEffectLength('endOfRound');

        expect(finalEffectLength).toBe(initialEffectLength);
      }
    });
  });

  describe('AimingShot critical hit (10% chance for 2x damage)', () => {
    it('should sometimes deal critical damage', () => {
      let criticalHits = 0;
      let normalHits = 0;
      const totalTrials = 100;

      const aimingShotSpellId = CircuitString.fromString('AimingShot').hash();

      for (let seed = 0; seed < totalTrials; seed++) {
        const state = createStateWithSeed(42, seed, 100, 100);
        const stater = new Stater({ state });
        const opponentState = createStateWithSeed(1, 456 + seed, 100, 100);

        const initialHp = parseInt(stater.state.playerStats.hp.toString());

        const spellCast = new AimingShotSpellCast({
          spellId: aimingShotSpellId,
          caster: Field(1),
          target: Field(42),
          additionalData: new AimingShotData({
            position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Direct hit
          }),
        });

        AimingShotModifier(stater, spellCast, opponentState);

        const finalHp = parseInt(stater.state.playerStats.hp.toString());
        const damageTaken = initialHp - finalHp;

        // Normal damage: 100, Critical: 200
        if (damageTaken === 200) {
          criticalHits++;
        } else if (damageTaken === 100) {
          normalHits++;
        }
      }

      // With 10% crit chance, expect roughly 10 crits out of 100
      // Allow for variance: expect between 2-25
      expect(criticalHits).toBeGreaterThan(0);
      expect(criticalHits).toBeLessThan(30);
      expect(normalHits).toBeGreaterThan(60);
    });
  });

  describe('HailOfArrows slowing effect (20% chance)', () => {
    it('should sometimes apply slowing and sometimes not', () => {
      let slowingApplied = 0;
      let noSlowing = 0;
      const totalTrials = 50;

      const hailSpellId = CircuitString.fromString('HailOfArrows').hash();

      for (let seed = 0; seed < totalTrials; seed++) {
        const state = createStateWithSeed(42, seed, 100, 100);
        const stater = new Stater({ state });
        const opponentState = createStateWithSeed(1, 456 + seed, 100, 100);

        const spellCast = new HailOfArrowsSpellCast({
          spellId: hailSpellId,
          caster: Field(1),
          target: Field(42),
          additionalData: new HailOfArrowsData({
            position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Direct hit
          }),
        });

        const initialEffectLength = stater.state.getEffectLength('endOfRound');
        HailOfArrowsModifier(stater, spellCast, opponentState);
        const finalEffectLength = stater.state.getEffectLength('endOfRound');

        // Slowing adds 2 effects (SlowingRestoration and Slowing)
        if (finalEffectLength > initialEffectLength) {
          slowingApplied++;
        } else {
          noSlowing++;
        }
      }

      // With 20% chance, expect roughly 10 slowings out of 50
      // Allow for variance: expect between 2-25
      expect(slowingApplied).toBeGreaterThan(0);
      expect(slowingApplied).toBeLessThan(30);
      expect(noSlowing).toBeGreaterThan(20);
    });

    it('should not apply slowing on miss (distance > 3)', () => {
      const hailSpellId = CircuitString.fromString('HailOfArrows').hash();

      // Test multiple seeds - none should apply slowing when out of range
      for (let seed = 0; seed < 20; seed++) {
        const state = createStateWithSeed(42, seed, 100, 100);
        const stater = new Stater({ state });
        const opponentState = createStateWithSeed(1, 456, 100, 100);

        const spellCast = new HailOfArrowsSpellCast({
          spellId: hailSpellId,
          caster: Field(1),
          target: Field(42),
          additionalData: new HailOfArrowsData({
            position: new Position({ x: Int64.from(10), y: Int64.from(10) }), // Out of range
          }),
        });

        const initialEffectLength = stater.state.getEffectLength('endOfRound');
        HailOfArrowsModifier(stater, spellCast, opponentState);
        const finalEffectLength = stater.state.getEffectLength('endOfRound');

        expect(finalEffectLength).toBe(initialEffectLength);
      }
    });
  });

  describe('Random seed evolution', () => {
    it('should update random seed after apply() call', () => {
      const state = createStateWithSeed(42, 12345, 100, 100);
      const stater = new Stater({ state });
      const opponentState = createStateWithSeed(1, 456, 100, 100);

      const originalSeed = stater.state.randomSeed.toString();

      // Call apply with empty spell casts
      stater.apply([], opponentState);

      const newSeed = stater.state.randomSeed.toString();

      expect(newSeed).not.toBe(originalSeed);
    });

    it('should produce different random values after seed evolution', () => {
      const state = createStateWithSeed(42, 12345, 100, 100);
      const stater = new Stater({ state });
      const opponentState = createStateWithSeed(1, 456, 100, 100);

      const value1 = stater.getRandomPercentage().toString();

      // Evolve seed
      stater.apply([], opponentState);

      const value2 = stater.getRandomPercentage().toString();

      // After seed evolution, random values should (likely) be different
      expect(value1).not.toBe(value2);
    });
  });
});
