import { CircuitString, Field, Int64, UInt64, PrivateKey } from 'o1js';
import { Stater } from '../stater';
import { State } from '../state';
import {
  PlayerStats,
  Position,
  SpellStats,
  Effect,
  PositionOption,
} from '../structs';
import {
  phantomDuelistSpells,
  SpectralArrowModifier,
  SpectralArrowData,
  SpectralArrowSpellCast,
  ShadowVeilModifier,
  ShadowVeilData,
  ShadowVeilSpellCast,
  SpectralProjectionModifier,
  SpectralProjectionData,
  SpectralProjectionSpellCast,
  DusksEmbraceModifier,
  DusksEmbraceData,
  DusksEmbraceSpellCast,
  PhantomEchoModifier,
  PhantomEchoData,
  PhantomEchoSpellCast,
  ShadowStrikeModifier,
  ShadowStrikeData,
  ShadowStrikeSpellCast,
  ShadowDashModifier,
  ShadowDashData,
  ShadowDashSpellCast,
  ShadowDashMoveModifier,
  ShadowDashMoveData,
  ShadowDashMoveSpellCast,
  WhirlingBladesModifier,
  WhirlingBladesData,
  WhirlingBladesSpellCast,
} from './phantom_duelist';
import { WizardId } from '../../wizards';

describe('Phantom Duelist Spells', () => {
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
      wizardId: WizardId.PHANTOM_DUELIST,
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
      wizardId: WizardId.PHANTOM_DUELIST,
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

  describe('Phantom Duelist Spells Array', () => {
    it('should contain all expected phantom duelist spells', () => {
      expect(phantomDuelistSpells).toHaveLength(9);

      const spellNames = phantomDuelistSpells.map((spell) => spell.name);
      expect(spellNames).toContain('SpectralArrow');
      expect(spellNames).toContain('ShadowVeil');
      expect(spellNames).toContain('SpectralProjection');
      expect(spellNames).toContain('DusksEmbrace');
      expect(spellNames).toContain('PhantomEcho');
      expect(spellNames).toContain('ShadowStrike');
      expect(spellNames).toContain('ShadowDash');
      expect(spellNames).toContain('ShadowDashMove');
      expect(spellNames).toContain('WhirlingBlades');
    });

    it('should have all spells with PHANTOM_DUELIST wizard ID', () => {
      phantomDuelistSpells.forEach((spell) => {
        expect(spell.wizardId).toBe(WizardId.PHANTOM_DUELIST);
      });
    });

    it('should have proper spell structure', () => {
      phantomDuelistSpells.forEach((spell) => {
        expect(spell.id).toBeInstanceOf(Field);
        expect(spell.cooldown).toBeInstanceOf(Field);
        expect(typeof spell.name).toBe('string');
        expect(typeof spell.description).toBe('string');
        expect(typeof spell.image).toBe('string');
        expect(typeof spell.modifier).toBe('function');
      });
    });
  });

  describe('Spectral Arrow Spell', () => {
    let spectralArrowSpell: any;

    beforeEach(() => {
      spectralArrowSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'SpectralArrow'
      );
    });

    it('should have correct spell properties', () => {
      expect(spectralArrowSpell.name).toBe('SpectralArrow');
      expect(spectralArrowSpell.description).toBe(
        'Deal 50 damage to a single target.'
      );
      expect(spectralArrowSpell.image).toBe(
        '/wizards/skills/spectralArrow.png'
      );
      expect(spectralArrowSpell.cooldown.toString()).toBe('1');
    });

    it('should deal 50 damage on direct hit (distance = 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new SpectralArrowSpellCast({
        spellId: spectralArrowSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new SpectralArrowData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Same position as player
        }),
      });

      SpectralArrowModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 0 damage on miss (distance > 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new SpectralArrowSpellCast({
        spellId: spectralArrowSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new SpectralArrowData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Distance 1 from player
        }),
      });

      SpectralArrowModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });
  });

  describe('Shadow Veil Spell', () => {
    let shadowVeilSpell: any;

    beforeEach(() => {
      shadowVeilSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'ShadowVeil'
      );
    });

    it('should have correct spell properties', () => {
      expect(shadowVeilSpell.name).toBe('ShadowVeil');
      expect(shadowVeilSpell.description).toBe(
        'Become invisible for 2 turns. Next attack deals +50% damage and reveals you.'
      );
      expect(shadowVeilSpell.image).toBe('/wizards/skills/shadowVeil.png');
      expect(shadowVeilSpell.cooldown.toString()).toBe('5');
    });

    it('should apply invisibility effect for 2 turns', () => {
      const spellCast = new ShadowVeilSpellCast({
        spellId: shadowVeilSpell.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new ShadowVeilData({}),
      });

      ShadowVeilModifier(stater, spellCast, opponentState);

      // Check that invisibility effect was applied
      const invisibleEffectId = CircuitString.fromString(
        'ShadowVeilInvisible'
      ).hash();
      const hasInvisibleEffect = stater.state.publicStateEffects.some(
        (effect) =>
          effect.effectId.equals(invisibleEffectId).toBoolean() &&
          effect.duration.equals(Field(2)).toBoolean()
      );

      expect(hasInvisibleEffect).toBe(true);
    });

    it('should not affect HP', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new ShadowVeilSpellCast({
        spellId: shadowVeilSpell.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new ShadowVeilData({}),
      });

      ShadowVeilModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(finalHp).toBe(initialHp);
    });
  });

  describe('Spectral Projection Spell', () => {
    let spectralProjectionSpell: any;

    beforeEach(() => {
      spectralProjectionSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'SpectralProjection'
      );

      // Set up spells that should be transformed
      const spectralArrowId =
        CircuitString.fromString('SpectralArrow').hash();
      const dusksEmbraceId = CircuitString.fromString('DusksEmbrace').hash();
      const phantomEchoId = CircuitString.fromString('PhantomEcho').hash();

      stater.state.spellStats[0]!.spellId = spectralArrowId;
      stater.state.spellStats[1]!.spellId = dusksEmbraceId;
      stater.state.spellStats[2]!.spellId = phantomEchoId;
    });

    it('should have correct spell properties', () => {
      expect(spectralProjectionSpell.name).toBe('SpectralProjection');
      expect(spectralProjectionSpell.description).toBe(
        "Create a spectral projection on opponent's field for 3 turns, transforming skills into melee variants."
      );
      expect(spectralProjectionSpell.image).toBe(
        '/wizards/skills/spectralProjection.png'
      );
      expect(spectralProjectionSpell.cooldown.toString()).toBe('6');
    });

    it('should transform SpectralArrow to ShadowStrike', () => {
      const shadowStrikeId = CircuitString.fromString('ShadowStrike').hash();

      const spellCast = new SpectralProjectionSpellCast({
        spellId: spectralProjectionSpell.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new SpectralProjectionData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      });

      SpectralProjectionModifier(stater, spellCast, opponentState);

      expect(
        stater.state.spellStats[0]!.spellId.equals(shadowStrikeId).toBoolean()
      ).toBe(true);
    });

    it('should transform DusksEmbrace to ShadowDash', () => {
      const shadowDashId = CircuitString.fromString('ShadowDash').hash();

      const spellCast = new SpectralProjectionSpellCast({
        spellId: spectralProjectionSpell.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new SpectralProjectionData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      });

      SpectralProjectionModifier(stater, spellCast, opponentState);

      expect(
        stater.state.spellStats[1]!.spellId.equals(shadowDashId).toBoolean()
      ).toBe(true);
    });

    it('should transform PhantomEcho to WhirlingBlades', () => {
      const whirlingBladesId =
        CircuitString.fromString('WhirlingBlades').hash();

      const spellCast = new SpectralProjectionSpellCast({
        spellId: spectralProjectionSpell.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new SpectralProjectionData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      });

      SpectralProjectionModifier(stater, spellCast, opponentState);

      expect(
        stater.state.spellStats[2]!.spellId
          .equals(whirlingBladesId)
          .toBoolean()
      ).toBe(true);
    });

    it('should apply SpectralProjectionReturn effect for 3 turns', () => {
      const spellCast = new SpectralProjectionSpellCast({
        spellId: spectralProjectionSpell.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new SpectralProjectionData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      });

      SpectralProjectionModifier(stater, spellCast, opponentState);

      const returnEffectId = CircuitString.fromString(
        'SpectralProjectionReturn'
      ).hash();
      const hasReturnEffect = stater.state.onEndEffects.some(
        (effect) =>
          effect.effectId.equals(returnEffectId).toBoolean() &&
          effect.duration.equals(Field(3)).toBoolean()
      );

      expect(hasReturnEffect).toBe(true);
    });
  });

  describe("Dusk's Embrace Spell", () => {
    let dusksEmbraceSpell: any;

    beforeEach(() => {
      dusksEmbraceSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'DusksEmbrace'
      );
    });

    it('should have correct spell properties', () => {
      expect(dusksEmbraceSpell.name).toBe('DusksEmbrace');
      expect(dusksEmbraceSpell.description).toBe(
        'Deal 50 damage to a horizontal line and apply Weaken (-30% Defence) for 2 turns if hit.'
      );
      expect(dusksEmbraceSpell.image).toBe('/wizards/skills/dusksEmbrace.png');
      expect(dusksEmbraceSpell.cooldown.toString()).toBe('2');
    });

    it('should deal 50 damage when target is on same row (same y)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new DusksEmbraceSpellCast({
        spellId: dusksEmbraceSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new DusksEmbraceData({
          position: new Position({ x: Int64.from(10), y: Int64.from(5) }), // Same row (y=5)
        }),
      });

      DusksEmbraceModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 0 damage when target is on different row', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new DusksEmbraceSpellCast({
        spellId: dusksEmbraceSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new DusksEmbraceData({
          position: new Position({ x: Int64.from(5), y: Int64.from(6) }), // Different row (y=6)
        }),
      });

      DusksEmbraceModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });

    it('should apply Weaken effect when hit', () => {
      const spellCast = new DusksEmbraceSpellCast({
        spellId: dusksEmbraceSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new DusksEmbraceData({
          position: new Position({ x: Int64.from(10), y: Int64.from(5) }), // Same row (y=5)
        }),
      });

      DusksEmbraceModifier(stater, spellCast, opponentState);

      const weakenEffectId = CircuitString.fromString('Weaken').hash();
      const hasWeakenEffect = stater.state.endOfRoundEffects.some(
        (effect) =>
          effect.effectId.equals(weakenEffectId).toBoolean() &&
          effect.duration.equals(Field(2)).toBoolean() &&
          effect.param.equals(Field(30)).toBoolean()
      );

      expect(hasWeakenEffect).toBe(true);
    });
  });

  describe('Phantom Echo Spell', () => {
    let phantomEchoSpell: any;

    beforeEach(() => {
      phantomEchoSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'PhantomEcho'
      );
    });

    it('should have correct spell properties', () => {
      expect(phantomEchoSpell.name).toBe('PhantomEcho');
      expect(phantomEchoSpell.description).toBe(
        'Deal 30 damage to a diamond 3x3 area. If hit, opponent becomes visible and takes +50% damage for 1 turn.'
      );
      expect(phantomEchoSpell.image).toBe('/wizards/skills/phantomEcho.png');
      expect(phantomEchoSpell.cooldown.toString()).toBe('3');
    });

    it('should deal 30 damage on direct hit (distance = 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new PhantomEchoSpellCast({
        spellId: phantomEchoSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new PhantomEchoData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Same position
        }),
      });

      PhantomEchoModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 30);
    });

    it('should deal 30 damage at manhattan distance 1', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new PhantomEchoSpellCast({
        spellId: phantomEchoSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new PhantomEchoData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Distance 1
        }),
      });

      PhantomEchoModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 30);
    });

    it('should deal 0 damage at manhattan distance 2', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new PhantomEchoSpellCast({
        spellId: phantomEchoSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new PhantomEchoData({
          position: new Position({ x: Int64.from(7), y: Int64.from(5) }), // Distance 2
        }),
      });

      PhantomEchoModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });

    it('should apply Revealed and Vulnerable effects when hit', () => {
      const spellCast = new PhantomEchoSpellCast({
        spellId: phantomEchoSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new PhantomEchoData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Direct hit
        }),
      });

      PhantomEchoModifier(stater, spellCast, opponentState);

      const revealedEffectId = CircuitString.fromString('Revealed').hash();
      const hasRevealedEffect = stater.state.publicStateEffects.some(
        (effect) =>
          effect.effectId.equals(revealedEffectId).toBoolean() &&
          effect.duration.equals(Field(1)).toBoolean()
      );

      const vulnerableEffectId = CircuitString.fromString('Vulnerable').hash();
      const hasVulnerableEffect = stater.state.endOfRoundEffects.some(
        (effect) =>
          effect.effectId.equals(vulnerableEffectId).toBoolean() &&
          effect.duration.equals(Field(1)).toBoolean() &&
          effect.param.equals(Field(50)).toBoolean()
      );

      expect(hasRevealedEffect).toBe(true);
      expect(hasVulnerableEffect).toBe(true);
    });
  });

  describe('Shadow Strike Spell (Spectral Form)', () => {
    let shadowStrikeSpell: any;

    beforeEach(() => {
      shadowStrikeSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'ShadowStrike'
      );
    });

    it('should have correct spell properties', () => {
      expect(shadowStrikeSpell.name).toBe('ShadowStrike');
      expect(shadowStrikeSpell.description).toBe(
        'Deal 50 damage with +20% critical chance. (Spectral Form)'
      );
      expect(shadowStrikeSpell.image).toBe('/wizards/skills/shadowStrike.png');
      expect(shadowStrikeSpell.cooldown.toString()).toBe('1');
    });

    it('should deal at least 50 damage on direct hit', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new ShadowStrikeSpellCast({
        spellId: shadowStrikeSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new ShadowStrikeData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Same position
        }),
      });

      ShadowStrikeModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      // Either 50 (normal) or 100 (crit) damage
      const damage = parseInt(initialHp) - parseInt(finalHp);
      expect(damage).toBeGreaterThanOrEqual(50);
      expect(damage).toBeLessThanOrEqual(100);
    });

    it('should deal 0 damage on miss', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new ShadowStrikeSpellCast({
        spellId: shadowStrikeSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new ShadowStrikeData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Distance 1
        }),
      });

      ShadowStrikeModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });
  });

  describe('Shadow Dash Spell (Spectral Form)', () => {
    let shadowDashSpell: any;

    beforeEach(() => {
      shadowDashSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'ShadowDash'
      );
    });

    it('should have correct spell properties', () => {
      expect(shadowDashSpell.name).toBe('ShadowDash');
      expect(shadowDashSpell.description).toBe(
        'Dash at opponent dealing up to +100% extra damage depending on distance. (Spectral Form)'
      );
      expect(shadowDashSpell.image).toBe('/wizards/skills/shadowDash.png');
      expect(shadowDashSpell.cooldown.toString()).toBe('2');
    });

    it('should deal base 50 damage at distance 0', () => {
      // Set opponent at same position as player
      opponentState.playerStats.position = new PositionOption({
        value: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        isSome: Field(1),
      });

      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new ShadowDashSpellCast({
        spellId: shadowDashSpell.id,
        caster: Field(1),
        target: Field(42),
        additionalData: new ShadowDashData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Direct hit
        }),
      });

      ShadowDashModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal increased damage at distance 7 (max bonus)', () => {
      // Set opponent far from player (distance 7)
      opponentState.playerStats.position = new PositionOption({
        value: new Position({ x: Int64.from(5), y: Int64.from(12) }), // Distance 7 from (5,5)
        isSome: Field(1),
      });

      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new ShadowDashSpellCast({
        spellId: shadowDashSpell.id,
        caster: Field(1),
        target: Field(42),
        additionalData: new ShadowDashData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Direct hit
        }),
      });

      ShadowDashModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      // At distance 7: base 50 + bonus 50 = 100 damage
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 100);
    });

    it('should deal scaled damage at distance 3', () => {
      // Set opponent at distance 3 from player
      opponentState.playerStats.position = new PositionOption({
        value: new Position({ x: Int64.from(5), y: Int64.from(8) }), // Distance 3 from (5,5)
        isSome: Field(1),
      });

      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new ShadowDashSpellCast({
        spellId: shadowDashSpell.id,
        caster: Field(1),
        target: Field(42),
        additionalData: new ShadowDashData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Direct hit
        }),
      });

      ShadowDashModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      // At distance 3: base 50 + bonus floor(3*50/7) = 50 + 21 = 71 damage
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 71);
    });

    it('should deal 0 damage on miss', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new ShadowDashSpellCast({
        spellId: shadowDashSpell.id,
        caster: Field(1),
        target: Field(42),
        additionalData: new ShadowDashData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Miss
        }),
      });

      ShadowDashModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });
  });

  describe('Shadow Dash Move Spell (Spectral Form)', () => {
    let shadowDashMoveSpell: any;

    beforeEach(() => {
      shadowDashMoveSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'ShadowDashMove'
      );
    });

    it('should have correct spell properties', () => {
      expect(shadowDashMoveSpell.name).toBe('ShadowDashMove');
      expect(shadowDashMoveSpell.description).toBe(
        'Move to dash target position. (Companion spell for ShadowDash)'
      );
      expect(shadowDashMoveSpell.target).toBe('ally');
      expect(shadowDashMoveSpell.hidden).toBe(true);
      expect(shadowDashMoveSpell.cooldown.toString()).toBe('0');
    });

    it('should update player position to target position', () => {
      const initialX = stater.state.playerStats.position.value.x.toString();
      const initialY = stater.state.playerStats.position.value.y.toString();

      const targetPosition = new Position({
        x: Int64.from(10),
        y: Int64.from(15),
      });

      const spellCast = new ShadowDashMoveSpellCast({
        spellId: shadowDashMoveSpell.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new ShadowDashMoveData({
          position: targetPosition,
        }),
      });

      ShadowDashMoveModifier(stater, spellCast, opponentState);

      const finalX = stater.state.playerStats.position.value.x.toString();
      const finalY = stater.state.playerStats.position.value.y.toString();

      expect(finalX).toBe('10');
      expect(finalY).toBe('15');
      expect(finalX).not.toBe(initialX);
      expect(finalY).not.toBe(initialY);
    });

    it('should not affect player HP', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new ShadowDashMoveSpellCast({
        spellId: shadowDashMoveSpell.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new ShadowDashMoveData({
          position: new Position({ x: Int64.from(10), y: Int64.from(15) }),
        }),
      });

      ShadowDashMoveModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(finalHp).toBe(initialHp);
    });

    it('should be linked to ShadowDash via companionSpellId', () => {
      const shadowDashSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'ShadowDash'
      );
      expect(shadowDashSpell).toBeDefined();
      expect(shadowDashSpell!.companionSpellId).toBeDefined();
      expect(
        shadowDashSpell!.companionSpellId!
          .equals(shadowDashMoveSpell.id)
          .toBoolean()
      ).toBe(true);
    });
  });

  describe('Whirling Blades Spell (Spectral Form)', () => {
    let whirlingBladesSpell: any;

    beforeEach(() => {
      whirlingBladesSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'WhirlingBlades'
      );
    });

    it('should have correct spell properties', () => {
      expect(whirlingBladesSpell.name).toBe('WhirlingBlades');
      expect(whirlingBladesSpell.description).toBe(
        'Deal 50 damage to a 3x3 area. (Spectral Form)'
      );
      expect(whirlingBladesSpell.image).toBe(
        '/wizards/skills/whirlingBlades.png'
      );
      expect(whirlingBladesSpell.cooldown.toString()).toBe('3');
    });

    it('should deal 50 damage at center (distance = 0)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new WhirlingBladesSpellCast({
        spellId: whirlingBladesSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new WhirlingBladesData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }), // Same position
        }),
      });

      WhirlingBladesModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 50 damage at corner of 3x3 (Chebyshev distance = 1)', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new WhirlingBladesSpellCast({
        spellId: whirlingBladesSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new WhirlingBladesData({
          position: new Position({ x: Int64.from(6), y: Int64.from(6) }), // Diagonal corner
        }),
      });

      WhirlingBladesModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 50 damage at edge of 3x3', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new WhirlingBladesSpellCast({
        spellId: whirlingBladesSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new WhirlingBladesData({
          position: new Position({ x: Int64.from(6), y: Int64.from(5) }), // Adjacent
        }),
      });

      WhirlingBladesModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should deal 0 damage outside 3x3 area', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new WhirlingBladesSpellCast({
        spellId: whirlingBladesSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new WhirlingBladesData({
          position: new Position({ x: Int64.from(7), y: Int64.from(5) }), // Distance 2
        }),
      });

      WhirlingBladesModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });

    it('should deal 0 damage at diagonal distance 2', () => {
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new WhirlingBladesSpellCast({
        spellId: whirlingBladesSpell.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new WhirlingBladesData({
          position: new Position({ x: Int64.from(7), y: Int64.from(7) }), // Chebyshev distance 2
        }),
      });

      WhirlingBladesModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp)); // No damage
    });
  });

  describe('Integration Tests with Stater', () => {
    it('should apply SpectralArrow through stater.applySpellCast', () => {
      const spectralArrowSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'SpectralArrow'
      );
      expect(spectralArrowSpell).toBeDefined();
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new SpectralArrowSpellCast({
        spellId: spectralArrowSpell!.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new SpectralArrowData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      });

      stater.applySpellCast(spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should apply WhirlingBlades through stater.applySpellCast', () => {
      const whirlingBladesSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'WhirlingBlades'
      );
      expect(whirlingBladesSpell).toBeDefined();
      const initialHp = stater.state.playerStats.hp.toString();

      const spellCast = new WhirlingBladesSpellCast({
        spellId: whirlingBladesSpell!.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new WhirlingBladesData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      });

      stater.applySpellCast(spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
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

      const spectralArrowSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'SpectralArrow'
      );
      expect(spectralArrowSpell).toBeDefined();

      const spellCast = new SpectralArrowSpellCast({
        spellId: spectralArrowSpell!.id,
        caster: Field(42),
        target: Field(1),
        additionalData: new SpectralArrowData({
          position: new Position({ x: Int64.from(-5), y: Int64.from(-5) }), // Same position
        }),
      });

      SpectralArrowModifier(stater, spellCast, opponentState);

      const finalHp = stater.state.playerStats.hp.toString();
      expect(parseInt(finalHp)).toBe(parseInt(initialHp) - 50);
    });

    it('should handle multiple spell applications', () => {
      const spectralArrowSpell = phantomDuelistSpells.find(
        (spell) => spell.name === 'SpectralArrow'
      );
      expect(spectralArrowSpell).toBeDefined();

      // Apply first spell
      const spellCast1 = new SpectralArrowSpellCast({
        spellId: spectralArrowSpell!.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new SpectralArrowData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      });

      stater.applySpellCast(spellCast1, opponentState);
      const afterFirstHp = parseInt(stater.state.playerStats.hp.toString());
      expect(afterFirstHp).toBe(50); // 100 - 50 = 50

      // Apply second spell
      const spellCast2 = new SpectralArrowSpellCast({
        spellId: spectralArrowSpell!.id,
        caster: Field(42),
        target: Field(42),
        additionalData: new SpectralArrowData({
          position: new Position({ x: Int64.from(5), y: Int64.from(5) }),
        }),
      });

      stater.applySpellCast(spellCast2, opponentState);
      const afterSecondHp = parseInt(stater.state.playerStats.hp.toString());
      expect(afterSecondHp).toBe(0); // 50 - 50 = 0
    });
  });
});

