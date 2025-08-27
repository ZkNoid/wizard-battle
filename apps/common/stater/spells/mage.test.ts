import { Field, Int64, CircuitString } from 'o1js';
import { Stater } from '../stater';
import { State } from '../state';
import {
  PlayerStats,
  Position,
  SpellCast,
  SpellStats,
  Effect,
} from '../structs';
import {
  mageSpells,
  LightningBoldModifyer,
  LightningBoldData,
  FireBallModifyer,
  FireBallData,
  LaserModifyer,
  LaserData,
  TeleportModifyer,
  TeleportData,
  HealModifyer,
  HealData,
} from './mage';
import { WizardId } from '../../wizards';

describe('Mage Spells', () => {
  let initialState: State;
  let stater: Stater;

  beforeEach(() => {
    // Create initial state with a player at position (5, 5) with 100 HP
    const playerStats = new PlayerStats({
      hp: Int64.from(100),
      position: new Position({
        x: Int64.from(5),
        y: Int64.from(5),
      }),
    });

    const spellStats = Array(5)
      .fill(null)
      .map(
        (_, i) =>
          new SpellStats({
            spellId: Field(i + 1),
            cooldown: Int64.from(3),
            currentColldown: Int64.from(0),
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
          })
      );

    initialState = new State({
      playerId: Field(42),
      wizardId: WizardId.MAGE,
      playerStats,
      spellStats,
      effects,
      map: [...Array(64).fill(Field(0))],
      turnId: Int64.from(1),
      randomSeed: Field(123),
    });

    stater = new Stater({
      state: initialState,
      randomSeed: Field(123),
    });
  });

  describe('Mage Spells Array', () => {
    it('should contain all expected mage spells', () => {
      expect(mageSpells).toHaveLength(5);

      const spellNames = mageSpells.map((spell) => spell.name);
      expect(spellNames).toContain('Lightning');
      expect(spellNames).toContain('Fire Ball');
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
        expect(typeof spell.modifyer).toBe('function');
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
      expect(lightningBoldSpell.image).toBe('/wizards/skills/1.svg');
      expect(lightningBoldSpell.cooldown.toString()).toBe('1');
    });

    it('should deal 100 damage on direct hit (distance = 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<LightningBoldData> = {
        spellId: lightningBoldSpell.id,
        target: Field(1),
        additionalData: new LightningBoldData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Same position as player
        }),
      };

      LightningBoldModifyer(stater.state, spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 100);
    });

    it('should deal 50 damage on nearby hit (distance = 1)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<LightningBoldData> = {
        spellId: lightningBoldSpell.id,
        target: Field(1),
        additionalData: new LightningBoldData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Distance 1 from player
        }),
      };

      LightningBoldModifyer(stater.state, spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 0 damage on distant hit (distance >= 2)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<LightningBoldData> = {
        spellId: lightningBoldSpell.id,
        target: Field(1),
        additionalData: new LightningBoldData({
          position: new Position({ x: Int64.from(8), y: Int64.from(5) }), // Distance 3 from player
        }),
      };

      LightningBoldModifyer(stater.state, spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });
  });

  describe('Fire Ball Spell', () => {
    let fireBallSpell: any;

    beforeEach(() => {
      fireBallSpell = mageSpells.find((spell) => spell.name === 'Fire Ball');
    });

    it('should have correct spell properties', () => {
      expect(fireBallSpell.name).toBe('Fire Ball');
      expect(fireBallSpell.description).toBe(
        'A ball of fire. Deals damage to a single target'
      );
      expect(fireBallSpell.image).toBe('/wizards/skills/2.svg');
      expect(fireBallSpell.cooldown.toString()).toBe('1');
    });

    it('should deal 60 damage on direct hit (distance = 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<FireBallData> = {
        spellId: fireBallSpell.id,
        target: Field(1),
        additionalData: new FireBallData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Same position as player
        }),
      };

      FireBallModifyer(stater.state, spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 60);
    });

    it('should deal 40 damage on nearby hit (distance = 1)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<FireBallData> = {
        spellId: fireBallSpell.id,
        target: Field(1),
        additionalData: new FireBallData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Distance 1 from player
        }),
      };

      FireBallModifyer(stater.state, spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 40);
    });

    it('should deal 20 damage on far hit (distance = 2)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<FireBallData> = {
        spellId: fireBallSpell.id,
        target: Field(1),
        additionalData: new FireBallData({
          position: new Position({ x: Int64.from(7), y: Int64.from(5) }), // Distance 2 from player
        }),
      };

      FireBallModifyer(stater.state, spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 20);
    });

    it('should deal 0 damage on distant hit (distance >= 3)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<FireBallData> = {
        spellId: fireBallSpell.id,
        target: Field(1),
        additionalData: new FireBallData({
          position: new Position({ x: Int64.from(8), y: Int64.from(5) }), // Distance 3 from player
        }),
      };

      FireBallModifyer(stater.state, spellCast);

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
      expect(laserSpell.image).toBe('/wizards/skills/5.svg');
      expect(laserSpell.cooldown.toString()).toBe('1');
    });

    it('should deal 50 damage when target is in same row', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<LaserData> = {
        spellId: laserSpell.id,
        target: Field(1),
        additionalData: new LaserData({
          position: new Position({ x: Int64.from(5), y: Int64.from(10) }), // Same row (x=5), different column
        }),
      };

      LaserModifyer(stater.state, spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 50 damage when target is in same column', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<LaserData> = {
        spellId: laserSpell.id,
        target: Field(1),
        additionalData: new LaserData({
          position: new Position({ x: Int64.from(10), y: Int64.from(5) }), // Same column (y=5), different row
        }),
      };

      LaserModifyer(stater.state, spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 0 damage when target is neither in same row nor column', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<LaserData> = {
        spellId: laserSpell.id,
        target: Field(1),
        additionalData: new LaserData({
          position: new Position({ x: Int64.from(7), y: Int64.from(8) }), // Different row and column
        }),
      };

      LaserModifyer(stater.state, spellCast);

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
      expect(teleportSpell.image).toBe('/wizards/skills/3.svg');
      expect(teleportSpell.cooldown.toString()).toBe('1');
    });

    it('should change player position to target position', () => {
      const initialX = stater.state.playerStats.position.x.toString();
      const initialY = stater.state.playerStats.position.y.toString();

      const targetPosition = new Position({
        x: Int64.from(10),
        y: Int64.from(15),
      });

      const spellCast: SpellCast<TeleportData> = {
        spellId: teleportSpell.id,
        target: Field(1),
        additionalData: new TeleportData({
          position: targetPosition,
        }),
      };

      TeleportModifyer(stater.state, spellCast);

      const finalX = stater.state.playerStats.position.x.toString();
      const finalY = stater.state.playerStats.position.y.toString();

      expect(finalX).toBe('10');
      expect(finalY).toBe('15');
      expect(finalX).not.toBe(initialX);
      expect(finalY).not.toBe(initialY);
    });

    it('should not affect player HP', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<TeleportData> = {
        spellId: teleportSpell.id,
        target: Field(1),
        additionalData: new TeleportData({
          position: new Position({ x: Int64.from(10), y: Int64.from(15) }),
        }),
      };

      TeleportModifyer(stater.state, spellCast);

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
      expect(healSpell.image).toBe('/wizards/skills/4.svg');
      expect(healSpell.cooldown.toString()).toBe('1');
    });

    it('should increase player HP by 100', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<HealData> = {
        spellId: healSpell.id,
        target: Field(1),
        additionalData: new HealData({}),
      };

      HealModifyer(stater.state, spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) + 100);
    });

    it('should not affect player position', () => {
      const initialX = stater.state.playerStats.position.x.toString();
      const initialY = stater.state.playerStats.position.y.toString();

      const spellCast: SpellCast<HealData> = {
        spellId: healSpell.id,
        target: Field(1),
        additionalData: new HealData({}),
      };

      HealModifyer(stater.state, spellCast);

      const finalX = stater.state.playerStats.position.x.toString();
      const finalY = stater.state.playerStats.position.y.toString();

      expect(finalX).toBe(initialX);
      expect(finalY).toBe(initialY);
    });

    it('should work when player is at low health', () => {
      // Set player to low health
      stater.state.playerStats.hp = Int64.from(10);
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<HealData> = {
        spellId: healSpell.id,
        target: Field(1),
        additionalData: new HealData({}),
      };

      HealModifyer(stater.state, spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(110); // 10 + 100
    });
  });

  describe('Integration Tests with Stater', () => {
    it('should apply lightning spell through stater.applySpellCast', () => {
      const lightningSpell = mageSpells.find(
        (spell) => spell.name === 'Lightning'
      );
      expect(lightningSpell).toBeDefined();
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<LightningBoldData> = {
        spellId: lightningSpell!.id,
        target: Field(1),
        additionalData: new LightningBoldData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Direct hit
        }),
      };

      stater.applySpellCast(spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 100);
    });

    it('should apply heal spell through stater.applySpellCast', () => {
      const healSpell = mageSpells.find((spell) => spell.name === 'Heal');
      expect(healSpell).toBeDefined();
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast: SpellCast<HealData> = {
        spellId: healSpell!.id,
        target: Field(1),
        additionalData: new HealData({}),
      };

      stater.applySpellCast(spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) + 100);
    });

    it('should apply teleport spell through stater.applySpellCast', () => {
      const teleportSpell = mageSpells.find(
        (spell) => spell.name === 'Teleport'
      );
      expect(teleportSpell).toBeDefined();

      const spellCast: SpellCast<TeleportData> = {
        spellId: teleportSpell!.id,
        target: Field(1),
        additionalData: new TeleportData({
          position: new Position({ x: Int64.from(20), y: Int64.from(25) }),
        }),
      };

      stater.applySpellCast(spellCast);

      const finalX = stater.state.playerStats.position.x.toString();
      const finalY = stater.state.playerStats.position.y.toString();

      expect(finalX).toBe('20');
      expect(finalY).toBe('25');
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative coordinates for distance calculations', () => {
      // Move player to negative coordinates
      stater.state.playerStats.position = new Position({
        x: Int64.from(-5),
        y: Int64.from(-5),
      });
      const initialHp = stater.state.playerStats.hp.toString();

      const lightningSpell = mageSpells.find(
        (spell) => spell.name === 'Lightning'
      );
      expect(lightningSpell).toBeDefined();

      const spellCast: SpellCast<LightningBoldData> = {
        spellId: lightningSpell!.id,
        target: Field(1),
        additionalData: new LightningBoldData({
          position: new Position({ x: Int64.from(-5), y: Int64.from(-5) }), // Same position
        }),
      };

      LightningBoldModifyer(stater.state, spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 100); // Should still deal full damage
    });

    it('should handle healing when player is at zero health', () => {
      // Set player to zero health
      stater.state.playerStats.hp = Int64.from(0);

      const healSpell = mageSpells.find((spell) => spell.name === 'Heal');
      expect(healSpell).toBeDefined();

      const spellCast: SpellCast<HealData> = {
        spellId: healSpell!.id,
        target: Field(1),
        additionalData: new HealData({}),
      };

      HealModifyer(stater.state, spellCast);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(100);
    });

    it('should handle multiple spell applications', () => {
      const lightningSpell = mageSpells.find(
        (spell) => spell.name === 'Lightning'
      );
      const healSpell = mageSpells.find((spell) => spell.name === 'Heal');

      expect(lightningSpell).toBeDefined();

      // Apply lightning (damage)
      const damageSpell: SpellCast<LightningBoldData> = {
        spellId: lightningSpell!.id,
        target: Field(1),
        additionalData: new LightningBoldData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      };

      stater.applySpellCast(damageSpell);
      const afterDamageHp = parseInt(stater.state.playerStats.hp.toString());
      expect(afterDamageHp).toBe(0); // 100 - 100 = 0

      // Apply heal
      const healingSpell: SpellCast<HealData> = {
        spellId: healSpell!.id,
        target: Field(1),
        additionalData: new HealData({}),
      };

      stater.applySpellCast(healingSpell);
      const afterHealHp = parseInt(stater.state.playerStats.hp.toString());
      expect(afterHealHp).toBe(100); // 0 + 100 = 100
    });
  });
});
