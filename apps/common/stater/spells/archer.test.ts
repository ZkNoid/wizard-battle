import { Field, Int64, UInt64, CircuitString, PrivateKey } from 'o1js';
import { Stater } from '../stater';
import { State } from '../state';
import {
  PlayerStats,
  Position,
  type SpellCast,
  SpellStats,
  Effect,
  PositionOption,
} from '../structs';
import {
  archerSpells,
  ArrowModifier,
  ArrowData,
  ArrowSpellCast,
  AimingShotModifier,
  AimingShotData,
  AimingShotSpellCast,
  HailOfArrowsModifier,
  HailOfArrowsData,
  HailOfArrowsSpellCast,
  DecoyModifier,
  DecoyData,
  DecoySpellCast,
  CloudModifier,
  CloudData,
  CloudSpellCast,
} from './archer';
import { WizardId } from '../../wizards';

describe('Archer Spells', () => {
  let initialState: State;
  let stater: Stater;
  let opponentState: State;

  beforeEach(() => {
    // Create initial state with a player at position (5, 5) with 100 HP
    // Note: For damage calculation to work correctly:
    // - dodgeChance=0 ensures attacks always hit (hitChance = (accuracy + 100) * 100 / 100 = high)
    // - defense=100 (100%) means full damage taken: fullDamage = damage * attack / 100
    // - attack=100 (100%) means base damage: fullDamage = damage * 100 / 100 = damage
    const playerStats = new PlayerStats({
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
      attack: UInt64.from(100),
      defense: UInt64.from(100),
      critChance: UInt64.from(0),
      dodgeChance: UInt64.from(0),
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
    const effects = Array(10)
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
      wizardId: WizardId.ARCHER,
      playerStats,
      spellStats,
      publicStateEffects: effects,
      endOfRoundEffects,
      onEndEffects,
      map: [...Array(64).fill(Field(0))],
      turnId: Int64.from(1),
      randomSeed: Field(123),
      signingKey: PrivateKey.random(),
    });

    stater = new Stater({
      state: initialState,
    });

    // Create opponent state for modifier calls
    opponentState = new State({
      playerId: Field(1),
      wizardId: WizardId.ARCHER,
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
        attack: UInt64.from(100),
        defense: UInt64.from(100),
        critChance: UInt64.from(0),
        dodgeChance: UInt64.from(0),
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
      signingKey: PrivateKey.random(),
    });
  });

  describe('Archer Spells Array', () => {
    it('should contain all expected archer spells', () => {
      expect(archerSpells).toHaveLength(5);

      const spellNames = archerSpells.map((spell) => spell.name);
      expect(spellNames).toContain('Arrow');
      expect(spellNames).toContain('AimingShot');
      expect(spellNames).toContain('HailOfArrows');
      expect(spellNames).toContain('Decoy');
      expect(spellNames).toContain('Cloud');
    });

    it('should have all spells with ARCHER wizard ID', () => {
      archerSpells.forEach((spell) => {
        expect(spell.wizardId).toBe(WizardId.ARCHER);
      });
    });

    it('should have proper spell structure', () => {
      archerSpells.forEach((spell) => {
        expect(spell.id).toBeInstanceOf(Field);
        expect(spell.cooldown).toBeInstanceOf(Field);
        expect(typeof spell.name).toBe('string');
        expect(typeof spell.description).toBe('string');
        expect(typeof spell.image).toBe('string');
        expect(typeof spell.modifier).toBe('function');
      });
    });
  });

  describe('Arrow Spell', () => {
    let arrowSpell: any;

    beforeEach(() => {
      arrowSpell = archerSpells.find((spell) => spell.name === 'Arrow');
    });

    it('should have correct spell properties', () => {
      expect(arrowSpell.name).toBe('Arrow');
      expect(arrowSpell.description).toBe('A single arrow shot');
      expect(arrowSpell.image).toBe('/wizards/skills/arrow.png');
      expect(arrowSpell.cooldown.toString()).toBe('1');
    });

    it('should deal 30 damage on direct hit (distance = 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new ArrowSpellCast({
        spellId: arrowSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new ArrowData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Same position as player
        }),
      });

      ArrowModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 30);
    });

    it('should deal 0 damage on miss (distance > 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new ArrowSpellCast({
        spellId: arrowSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new ArrowData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Distance 1 from player
        }),
      });

      ArrowModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });

    it('should deal 0 damage on distant shot', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new ArrowSpellCast({
        spellId: arrowSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new ArrowData({
          position: new Position({ x: Int64.from(10), y: Int64.from(10) }), // Far from player
        }),
      });

      ArrowModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });
  });

  describe('AimingShot Spell', () => {
    let aimingShotSpell: any;

    beforeEach(() => {
      aimingShotSpell = archerSpells.find(
        (spell) => spell.name === 'AimingShot'
      );
    });

    it('should have correct spell properties', () => {
      expect(aimingShotSpell.name).toBe('AimingShot');
      expect(aimingShotSpell.description).toBe(
        'A shot with a higher chance of critical hit'
      );
      expect(aimingShotSpell.image).toBe('/wizards/skills/aimingShot.png');
      expect(aimingShotSpell.cooldown.toString()).toBe('1');
    });

    it('should deal 100 damage on direct hit (distance = 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new AimingShotSpellCast({
        spellId: aimingShotSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new AimingShotData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Same position as player
        }),
      });

      AimingShotModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      // Damage is either 100 (normal) or 200 (critical)
      const damage = parseInt(initialHp) - parseInt(finalHp);
      expect([100, 200]).toContain(damage);
    });

    it('should deal 0 damage on miss (distance > 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new AimingShotSpellCast({
        spellId: aimingShotSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new AimingShotData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Distance 1 from player
        }),
      });

      AimingShotModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });
  });

  describe('HailOfArrows Spell', () => {
    let hailOfArrowsSpell: any;

    beforeEach(() => {
      hailOfArrowsSpell = archerSpells.find(
        (spell) => spell.name === 'HailOfArrows'
      );
    });

    it('should have correct spell properties', () => {
      expect(hailOfArrowsSpell.name).toBe('HailOfArrows');
      expect(hailOfArrowsSpell.description).toBe('A hail of arrows');
      expect(hailOfArrowsSpell.image).toBe('/wizards/skills/hailOfArrows.png');
      expect(hailOfArrowsSpell.cooldown.toString()).toBe('1');
    });

    it('should deal 50 damage on direct hit (distance = 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new HailOfArrowsSpellCast({
        spellId: hailOfArrowsSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new HailOfArrowsData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Same position as player
        }),
      });

      HailOfArrowsModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 50 damage on nearby hit (distance = 1)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new HailOfArrowsSpellCast({
        spellId: hailOfArrowsSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new HailOfArrowsData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Distance 1 from player
        }),
      });

      HailOfArrowsModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 50 damage on hit within range (distance = 3)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new HailOfArrowsSpellCast({
        spellId: hailOfArrowsSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new HailOfArrowsData({
          position: new Position({ x: Int64.from(8), y: Int64.from(5) }), // Distance 3 from player
        }),
      });

      HailOfArrowsModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 0 damage on distant hit (distance > 3)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new HailOfArrowsSpellCast({
        spellId: hailOfArrowsSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new HailOfArrowsData({
          position: new Position({ x: Int64.from(9), y: Int64.from(5) }), // Distance 4 from player
        }),
      });

      HailOfArrowsModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });
  });

  describe('Decoy Spell', () => {
    let decoySpell: any;

    beforeEach(() => {
      decoySpell = archerSpells.find((spell) => spell.name === 'Decoy');
    });

    it('should have correct spell properties', () => {
      expect(decoySpell.name).toBe('Decoy');
      expect(decoySpell.description).toBe('Create a decoy');
      expect(decoySpell.image).toBe('/wizards/skills/decoy.png');
      expect(decoySpell.cooldown.toString()).toBe('1');
      expect(decoySpell.target).toBe('ally');
    });

    it('should add a Decoy effect to public effects', () => {
      const initialEffectLength = stater.state.getEffectLength('public');

      const spellCast = new DecoySpellCast({
        spellId: decoySpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new DecoyData({}),
      });

      DecoyModifier(stater, spellCast, opponentState);

      const finalEffectLength = stater.state.getEffectLength('public');
      expect(finalEffectLength).toBe(initialEffectLength + 1);

      // Check the effect was added with correct properties
      const addedEffect = stater.state.publicStateEffects[initialEffectLength];
      expect(addedEffect?.effectId.toString()).toBe(
        CircuitString.fromString('Decoy').hash().toString()
      );
      expect(addedEffect?.duration.toString()).toBe('2');
    });

    it('should not affect player HP', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new DecoySpellCast({
        spellId: decoySpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new DecoyData({}),
      });

      DecoyModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(finalHp).toBe(initialHp);
    });
  });

  describe('Cloud Spell', () => {
    let cloudSpell: any;

    beforeEach(() => {
      cloudSpell = archerSpells.find((spell) => spell.name === 'Cloud');
    });

    it('should have correct spell properties', () => {
      expect(cloudSpell.name).toBe('Cloud');
      expect(cloudSpell.description).toBe('Create a cloud');
      expect(cloudSpell.image).toBe('/wizards/skills/smokeCloud.png');
      expect(cloudSpell.cooldown.toString()).toBe('1');
      expect(cloudSpell.target).toBe('ally');
      expect(cloudSpell.globalStatus).toBe('global');
    });

    it('should add a Cloud effect to public effects', () => {
      const initialEffectLength = stater.state.getEffectLength('public');

      const spellCast = new CloudSpellCast({
        spellId: cloudSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new CloudData({
          position: new Position({ x: Int64.from(3), y: Int64.from(4) }),
        }),
      });

      CloudModifier(stater, spellCast, opponentState);

      const finalEffectLength = stater.state.getEffectLength('public');
      expect(finalEffectLength).toBe(initialEffectLength + 1);

      // Check the effect was added with correct properties
      const addedEffect = stater.state.publicStateEffects[initialEffectLength];
      expect(addedEffect?.effectId.toString()).toBe(
        CircuitString.fromString('Cloud').hash().toString()
      );
      expect(addedEffect?.duration.toString()).toBe('3');
      // param should be x + y * 8 = 3 + 4 * 8 = 35
      expect(addedEffect?.param.toString()).toBe('35');
    });

    it('should not affect player HP', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new CloudSpellCast({
        spellId: cloudSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new CloudData({
          position: new Position({ x: Int64.from(3), y: Int64.from(4) }),
        }),
      });

      CloudModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(finalHp).toBe(initialHp);
    });

    it('should encode different positions correctly', () => {
      const spellCast = new CloudSpellCast({
        spellId: cloudSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new CloudData({
          position: new Position({ x: Int64.from(7), y: Int64.from(2) }),
        }),
      });

      CloudModifier(stater, spellCast, opponentState);

      const addedEffect = stater.state.publicStateEffects[0];
      // param should be x + y * 8 = 7 + 2 * 8 = 23
      expect(addedEffect?.param.toString()).toBe('23');
    });
  });

  describe('Integration Tests with Stater', () => {
    it('should apply arrow spell through stater.applySpellCast', () => {
      const arrowSpell = archerSpells.find((spell) => spell.name === 'Arrow');
      expect(arrowSpell).toBeDefined();
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new ArrowSpellCast({
        spellId: arrowSpell!.id,
        caster: Field(42),
        target: Field(42), // Target is the player
        additionalData: new ArrowData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Direct hit
        }),
      });

      stater.applySpellCast(spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 30);
    });

    it('should apply hail of arrows spell through stater.applySpellCast', () => {
      const hailSpell = archerSpells.find(
        (spell) => spell.name === 'HailOfArrows'
      );
      expect(hailSpell).toBeDefined();
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new HailOfArrowsSpellCast({
        spellId: hailSpell!.id,
        caster: Field(42),
        target: Field(42), // Target is the player
        additionalData: new HailOfArrowsData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Within range
        }),
      });

      stater.applySpellCast(spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should apply decoy spell through stater.applySpellCast', () => {
      const decoySpell = archerSpells.find((spell) => spell.name === 'Decoy');
      expect(decoySpell).toBeDefined();

      const spellCast = new DecoySpellCast({
        spellId: decoySpell!.id,
        caster: Field(42),
        target: Field(42), // Target is the player
        additionalData: new DecoyData({}),
      });

      const initialEffectLength = stater.state.getEffectLength('public');
      stater.applySpellCast(spellCast, opponentState);
      const finalEffectLength = stater.state.getEffectLength('public');

      expect(finalEffectLength).toBe(initialEffectLength + 1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative coordinates for distance calculations', () => {
      // Move player to negative coordinates
      stater.state.playerStats.position = new PositionOption({
        value: new Position({
          x: Int64.from(-5),
          y: Int64.from(-5),
        }),
        isSome: Field(1),
      });
      const initialHp = stater.state.playerStats.hp.toString();

      const arrowSpell = archerSpells.find((spell) => spell.name === 'Arrow');
      expect(arrowSpell).toBeDefined();

      const spellCast = new ArrowSpellCast({
        spellId: arrowSpell!.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new ArrowData({
          position: new Position({ x: Int64.from(-5), y: Int64.from(-5) }), // Same position
        }),
      });

      ArrowModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 30); // Should still deal damage
    });

    it('should handle multiple spell applications', () => {
      const arrowSpell = archerSpells.find((spell) => spell.name === 'Arrow');
      const hailSpell = archerSpells.find(
        (spell) => spell.name === 'HailOfArrows'
      );

      expect(arrowSpell).toBeDefined();
      expect(hailSpell).toBeDefined();

      // Apply arrow (damage)
      const arrowCast = new ArrowSpellCast({
        spellId: arrowSpell!.id,
        caster: Field(42),
        target: Field(42), // Target is the player
        additionalData: new ArrowData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      });

      stater.applySpellCast(arrowCast, opponentState);
      const afterArrowHp = parseInt(stater.state.playerStats.hp.toString());
      expect(afterArrowHp).toBe(70); // 100 - 30 = 70

      // Apply hail of arrows
      const hailCast = new HailOfArrowsSpellCast({
        spellId: hailSpell!.id,
        caster: Field(42),
        target: Field(42), // Target is the player
        additionalData: new HailOfArrowsData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      });

      stater.applySpellCast(hailCast, opponentState);
      const afterHailHp = parseInt(stater.state.playerStats.hp.toString());
      expect(afterHailHp).toBe(20); // 70 - 50 = 20
    });

    it('should handle combination of damage and effect spells', () => {
      const arrowSpell = archerSpells.find((spell) => spell.name === 'Arrow');
      const decoySpell = archerSpells.find((spell) => spell.name === 'Decoy');

      expect(arrowSpell).toBeDefined();
      expect(decoySpell).toBeDefined();

      const initialHp = stater.state.playerStats.hp.toString();
      const initialEffectLength = stater.state.getEffectLength('public');

      // Apply arrow
      const arrowCast = new ArrowSpellCast({
        spellId: arrowSpell!.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new ArrowData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      });
      stater.applySpellCast(arrowCast, opponentState);

      // Apply decoy
      const decoyCast = new DecoySpellCast({
        spellId: decoySpell!.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new DecoyData({}),
      });
      stater.applySpellCast(decoyCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      const finalEffectLength = stater.state.getEffectLength('public');

      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 30);
      expect(finalEffectLength).toBe(initialEffectLength + 1);
    });

    it('should handle HailOfArrows at boundary distance (distance = 3)', () => {
      const hailSpell = archerSpells.find(
        (spell) => spell.name === 'HailOfArrows'
      );
      expect(hailSpell).toBeDefined();

      // Test at exact boundary (distance = 3)
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new HailOfArrowsSpellCast({
        spellId: hailSpell!.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new HailOfArrowsData({
          position: new Position({ x: Int64.from(8), y: Int64.from(5) }), // Distance 3 from (5,5)
        }),
      });

      HailOfArrowsModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50); // Should deal damage at distance 3

      // Reset and test just outside boundary (distance = 4)
      stater.state.playerStats.hp = Int64.from(100);
      const initialHp2 = stater.state.playerStats.hp.toString();

      const spellCast2 = new HailOfArrowsSpellCast({
        spellId: hailSpell!.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new HailOfArrowsData({
          position: new Position({ x: Int64.from(9), y: Int64.from(5) }), // Distance 4 from (5,5)
        }),
      });

      HailOfArrowsModifier(stater, spellCast2, opponentState);

      const finalHp2 = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp2)).toBe(parseInt(initialHp2)); // Should deal no damage at distance 4
    });
  });
});

