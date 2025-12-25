import { Field, Int64, UInt64 } from 'o1js';
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
  mageSpells,
  LightningBoldModifier,
  LightningBoldData,
  LightningBoldSpellCast,
  FireBallModifier,
  FireBallData,
  FireBallSpellCast,
  LaserModifier,
  LaserData,
  LaserSpellCast,
  TeleportModifier,
  TeleportData,
  TeleportSpellCast,
  HealModifier,
  HealData,
  HealSpellCast,
} from './mage';
import { WizardId } from '../../wizards';

describe('Mage Spells', () => {
  let initialState: State;
  let stater: Stater;
  let opponentState: State;

  beforeEach(() => {
    // Create initial state with a player at position (5, 5) with 100 HP
    // Note: For damage calculation to work correctly:
    // - dodgeChance=100 and accuracy=100 ensures hitChance = 100 (always hits)
    // - attack=10 and defense=10 ensures fullDamage = damage * 10 * 10 / 100 = damage
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
      wizardId: WizardId.MAGE,
      playerStats,
      spellStats,
      publicStateEffects: effects,
      endOfRoundEffects,
      onEndEffects,
      map: [...Array(64).fill(Field(0))],
      turnId: Int64.from(1),
      randomSeed: Field(123),
    });

    stater = new Stater({
      state: initialState,
    });

    // Create opponent state for modifier calls
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

  describe('Mage Spells Array', () => {
    it('should contain all expected mage spells', () => {
      expect(mageSpells).toHaveLength(5);

      const spellNames = mageSpells.map((spell) => spell.name);
      expect(spellNames).toContain('Lightning');
      expect(spellNames).toContain('FireBall');
      expect(spellNames).toContain('Teleport');
      expect(spellNames).toContain('Heal');
      expect(spellNames).toContain('Laser');
    });

    it('should have all spells with MAGE wizard ID', () => {
      mageSpells.forEach((spell) => {
        expect(spell.wizardId).toBe(WizardId.MAGE);
      });
    });

    it('should have proper spell structure', () => {
      mageSpells.forEach((spell) => {
        expect(spell.id).toBeInstanceOf(Field);
        expect(spell.cooldown).toBeInstanceOf(Field);
        expect(typeof spell.name).toBe('string');
        expect(typeof spell.description).toBe('string');
        expect(typeof spell.image).toBe('string');
        expect(typeof spell.modifier).toBe('function');
      });
    });
  });

  describe('Lightning Bold Spell', () => {
    let lightningBoldSpell: any;

    beforeEach(() => {
      lightningBoldSpell = mageSpells.find(
        (spell) => spell.name === 'Lightning'
      );
    });

    it('should have correct spell properties', () => {
      expect(lightningBoldSpell.name).toBe('Lightning');
      expect(lightningBoldSpell.description).toBe(
        'A powerful bolt of lightning. High one point damage'
      );
      expect(lightningBoldSpell.image).toBe('/wizards/skills/lightning.png');
      expect(lightningBoldSpell.cooldown.toString()).toBe('1');
    });

    it('should deal 80 damage on direct hit (distance = 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new LightningBoldSpellCast({
        spellId: lightningBoldSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new LightningBoldData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Same position as player
        }),
      });

      LightningBoldModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 80);
    });

    it('should deal 40 damage on nearby hit (distance = 1)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new LightningBoldSpellCast({
        spellId: lightningBoldSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new LightningBoldData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Distance 1 from player
        }),
      });

      LightningBoldModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 40);
    });

    it('should deal 0 damage on distant hit (distance >= 2)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new LightningBoldSpellCast({
        spellId: lightningBoldSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new LightningBoldData({
          position: new Position({ x: Int64.from(8), y: Int64.from(5) }), // Distance 3 from player
        }),
      });

      LightningBoldModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });
  });

  describe('Fire Ball Spell', () => {
    let fireBallSpell: any;

    beforeEach(() => {
      fireBallSpell = mageSpells.find((spell) => spell.name === 'FireBall');
    });

    it('should have correct spell properties', () => {
      expect(fireBallSpell.name).toBe('FireBall');
      expect(fireBallSpell.description).toBe(
        'A ball of fire. Deals damage to a single target'
      );
      expect(fireBallSpell.image).toBe('/wizards/skills/fireball.png');
      expect(fireBallSpell.cooldown.toString()).toBe('1');
    });

    it('should deal 50 damage on direct hit (distance = 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new FireBallSpellCast({
        spellId: fireBallSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new FireBallData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Same position as player
        }),
      });

      FireBallModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 25 damage on nearby hit (distance = 1)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new FireBallSpellCast({
        spellId: fireBallSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new FireBallData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Distance 1 from player
        }),
      });

      FireBallModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 25);
    });

    it('should deal 15 damage on far hit (distance = 2)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new FireBallSpellCast({
        spellId: fireBallSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new FireBallData({
          position: new Position({ x: Int64.from(7), y: Int64.from(5) }), // Distance 2 from player
        }),
      });

      FireBallModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 15);
    });

    it('should deal 0 damage on distant hit (distance >= 3)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new FireBallSpellCast({
        spellId: fireBallSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new FireBallData({
          position: new Position({ x: Int64.from(8), y: Int64.from(5) }), // Distance 3 from player
        }),
      });

      FireBallModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });
  });

  describe('Laser Spell', () => {
    let laserSpell: any;

    beforeEach(() => {
      laserSpell = mageSpells.find((spell) => spell.name === 'Laser');
    });

    it('should have correct spell properties', () => {
      expect(laserSpell.name).toBe('Laser');
      expect(laserSpell.description).toBe(
        'A beam of laser. Deals damage to a single target'
      );
      expect(laserSpell.image).toBe('/wizards/skills/laser.png');
      expect(laserSpell.cooldown.toString()).toBe('1');
    });

    it('should deal 50 damage when target is in same row', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new LaserSpellCast({
        spellId: laserSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new LaserData({
          position: new Position({ x: Int64.from(5), y: Int64.from(10) }), // Same row (x=5), different column
        }),
      });

      LaserModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 50 damage when target is in same column', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new LaserSpellCast({
        spellId: laserSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new LaserData({
          position: new Position({ x: Int64.from(10), y: Int64.from(5) }), // Same column (y=5), different row
        }),
      });

      LaserModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 0 damage when target is neither in same row nor column', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new LaserSpellCast({
        spellId: laserSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new LaserData({
          position: new Position({ x: Int64.from(7), y: Int64.from(8) }), // Different row and column
        }),
      });

      LaserModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });
  });

  describe('Teleport Spell', () => {
    let teleportSpell: any;

    beforeEach(() => {
      teleportSpell = mageSpells.find((spell) => spell.name === 'Teleport');
    });

    it('should have correct spell properties', () => {
      expect(teleportSpell.name).toBe('Teleport');
      expect(teleportSpell.description).toBe('Teleport to a random position');
      expect(teleportSpell.image).toBe('/wizards/skills/teleport.png');
      expect(teleportSpell.cooldown.toString()).toBe('1');
    });

    it('should change player position to target position', () => {
      const initialX = stater.state.playerStats.position.value.x.toString();
      const initialY = stater.state.playerStats.position.value.y.toString();

      const targetPosition = new Position({
        x: Int64.from(10),
        y: Int64.from(15),
      });

      const spellCast = new TeleportSpellCast({
        spellId: teleportSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new TeleportData({
          position: targetPosition,
        }),
      });

      TeleportModifier(stater, spellCast, opponentState);

      const finalX = stater.state.playerStats.position.value.x.toString();
      const finalY = stater.state.playerStats.position.value.y.toString();

      expect(finalX).toBe('10');
      expect(finalY).toBe('15');
      expect(finalX).not.toBe(initialX);
      expect(finalY).not.toBe(initialY);
    });

    it('should not affect player HP', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new TeleportSpellCast({
        spellId: teleportSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new TeleportData({
          position: new Position({ x: Int64.from(10), y: Int64.from(15) }),
        }),
      });

      TeleportModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(finalHp).toBe(initialHp);
    });
  });

  describe('Heal Spell', () => {
    let healSpell: any;

    beforeEach(() => {
      healSpell = mageSpells.find((spell) => spell.name === 'Heal');
    });

    it('should have correct spell properties', () => {
      expect(healSpell.name).toBe('Heal');
      expect(healSpell.description).toBe('Heal yourself for 100 health');
      expect(healSpell.image).toBe('/wizards/skills/heal.png');
      expect(healSpell.cooldown.toString()).toBe('1');
    });

    it('should increase player HP by 50', () => {
      // Set HP lower than max so we can see the heal
      stater.state.playerStats.hp = Int64.from(50);
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new HealSpellCast({
        spellId: healSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new HealData({}),
      });

      HealModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) + 50);
    });

    it('should not exceed max HP', () => {
      // HP is already at max (100)
      const spellCast = new HealSpellCast({
        spellId: healSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new HealData({}),
      });

      HealModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(100); // Should be capped at max HP
    });

    it('should not affect player position', () => {
      const initialX = stater.state.playerStats.position.value.x.toString();
      const initialY = stater.state.playerStats.position.value.y.toString();

      const spellCast = new HealSpellCast({
        spellId: healSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new HealData({}),
      });

      HealModifier(stater, spellCast, opponentState);

      const finalX = stater.state.playerStats.position.value.x.toString();
      const finalY = stater.state.playerStats.position.value.y.toString();

      expect(finalX).toBe(initialX);
      expect(finalY).toBe(initialY);
    });

    it('should work when player is at low health', () => {
      // Set player to low health
      stater.state.playerStats.hp = Int64.from(10);
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new HealSpellCast({
        spellId: healSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new HealData({}),
      });

      HealModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(60); // 10 + 50
    });
  });

  describe('Integration Tests with Stater', () => {
    it('should apply lightning spell through stater.applySpellCast', () => {
      const lightningSpell = mageSpells.find(
        (spell) => spell.name === 'Lightning'
      );
      expect(lightningSpell).toBeDefined();
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new LightningBoldSpellCast({
        spellId: lightningSpell!.id,
        caster: Field(42),
        target: Field(42), // Target is the player
        additionalData: new LightningBoldData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Direct hit
        }),
      });

      stater.applySpellCast(spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 80);
    });

    it('should apply heal spell through stater.applySpellCast', () => {
      const healSpell = mageSpells.find((spell) => spell.name === 'Heal');
      expect(healSpell).toBeDefined();
      // Set HP lower so we can see the heal
      stater.state.playerStats.hp = Int64.from(50);
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new HealSpellCast({
        spellId: healSpell!.id,
        caster: Field(42),
        target: Field(42), // Target is the player
        additionalData: new HealData({}),
      });

      stater.applySpellCast(spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) + 50);
    });

    it('should apply teleport spell through stater.applySpellCast', () => {
      const teleportSpell = mageSpells.find(
        (spell) => spell.name === 'Teleport'
      );
      expect(teleportSpell).toBeDefined();

      const spellCast = new TeleportSpellCast({
        spellId: teleportSpell!.id,
        caster: Field(42),
        target: Field(42), // Target is the player
        additionalData: new TeleportData({
          position: new Position({ x: Int64.from(20), y: Int64.from(25) }),
        }),
      });

      stater.applySpellCast(spellCast, opponentState);

      const finalX = stater.state.playerStats.position.value.x.toString();
      const finalY = stater.state.playerStats.position.value.y.toString();

      expect(finalX).toBe('20');
      expect(finalY).toBe('25');
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

      const lightningSpell = mageSpells.find(
        (spell) => spell.name === 'Lightning'
      );
      expect(lightningSpell).toBeDefined();

      const spellCast = new LightningBoldSpellCast({
        spellId: lightningSpell!.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new LightningBoldData({
          position: new Position({ x: Int64.from(-5), y: Int64.from(-5) }), // Same position
        }),
      });

      LightningBoldModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 80); // Should still deal full damage
    });

    it('should handle healing when player is at zero health', () => {
      // Set player to zero health
      stater.state.playerStats.hp = Int64.from(0);

      const healSpell = mageSpells.find((spell) => spell.name === 'Heal');
      expect(healSpell).toBeDefined();

      const spellCast = new HealSpellCast({
        spellId: healSpell!.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new HealData({}),
      });

      HealModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(50);
    });

    it('should handle multiple spell applications', () => {
      const lightningSpell = mageSpells.find(
        (spell) => spell.name === 'Lightning'
      );
      const healSpell = mageSpells.find((spell) => spell.name === 'Heal');

      expect(lightningSpell).toBeDefined();

      // Apply lightning (damage)
      const damageSpell = new LightningBoldSpellCast({
        spellId: lightningSpell!.id,
        caster: Field(42),
        target: Field(42), // Target is the player
        additionalData: new LightningBoldData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      });

      stater.applySpellCast(damageSpell, opponentState);
      const afterDamageHp = parseInt(stater.state.playerStats.hp.toString());
      expect(afterDamageHp).toBe(20); // 100 - 80 = 20

      // Apply heal
      const healingSpell = new HealSpellCast({
        spellId: healSpell!.id,
        caster: Field(42),
        target: Field(42), // Target is the player
        additionalData: new HealData({}),
      });

      stater.applySpellCast(healingSpell, opponentState);
      const afterHealHp = parseInt(stater.state.playerStats.hp.toString());
      expect(afterHealHp).toBe(70); // 20 + 50 = 70
    });
  });
});
