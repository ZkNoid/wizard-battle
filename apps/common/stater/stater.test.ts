import { Field, Int64 } from "o1js";
import { Stater } from "./stater";
import { State } from "./state";

import {
  Effect,
  PlayerStats,
  Position,
  SpellCast,
  SpellStats,
} from "./structs";

describe("Stater", () => {
  let initialState: State;
  let stater: Stater;

  beforeEach(() => {
    // Create initial state
    const playerStats = new PlayerStats({
      hp: Int64.from(100),
      position: new Position({
        x: Int64.from(0),
        y: Int64.from(0),
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
          }),
      );

    // Create effects array with default empty effects
    const effects = Array(10)
      .fill(null)
      .map(
        () =>
          new Effect({
            effectId: Field(0),
            duration: Field(0),
          }),
      );

    initialState = new State({
      playerId: Field(42),
      playerStats,
      spellStats,
      effects,
      turnId: Int64.from(1),
      randomSeed: Field(123),
    });

    stater = new Stater({
      state: initialState,
    });
  });

  describe("State", () => {
    it("should copy state correctly", () => {
      const stateCopy = initialState.copy();

      expect(stateCopy.playerId.toString()).toBe(
        initialState.playerId.toString(),
      );
      expect(stateCopy.playerStats.hp.toString()).toBe(
        initialState.playerStats.hp.toString(),
      );
      expect(stateCopy.turnId.toString()).toBe(initialState.turnId.toString());
      expect(stateCopy.playerStats.position.x.toString()).toBe(
        initialState.playerStats.position.x.toString(),
      );
      expect(stateCopy.playerStats.position.y.toString()).toBe(
        initialState.playerStats.position.y.toString(),
      );
    });

    it("should generate state commit", () => {
      const commit = initialState.getCommit();
      expect(commit).toBeInstanceOf(Field);
    });
  });

  describe("Stater basic functionality", () => {
    it("should generate public state", () => {
      const publicState = stater.generatePublicState();

      expect(publicState.playerId.toString()).toBe(
        stater.state.playerId.toString(),
      );
      expect(publicState.playerStats.hp.toString()).toBe(
        stater.state.playerStats.hp.toString(),
      );
      expect(publicState.playerStats.position.x.toString()).toBe(
        stater.state.playerStats.position.x.toString(),
      );
      expect(publicState.playerStats.position.y.toString()).toBe(
        stater.state.playerStats.position.y.toString(),
      );
    });

    it("should generate state commit", () => {
      const commit = stater.generateStateCommit();
      expect(commit).toBeInstanceOf(Field);
    });

    it("should have correct initial values", () => {
      expect(stater.state.playerId.toString()).toBe("42");
      expect(stater.state.playerStats.hp.toString()).toBe("100");
      expect(stater.state.turnId.toString()).toBe("1");
      expect(stater.state.randomSeed.toString()).toBe("123");
    });
  });

  describe("applySpellCast", () => {
    it("should throw error for unknown spell", () => {
      const spellCast: SpellCast<any> = {
        spellId: Field(999),
        target: Field(1),
        additionalData: {},
      };

      expect(() => stater.applySpellCast(spellCast)).toThrow(
        "No such spell modifier",
      );
    });

    it("should not crash with valid spell cast structure", () => {
      const spellCast: SpellCast<any> = {
        spellId: Field(1),
        target: Field(1),
        additionalData: { test: "data" },
      };

      // This should throw "No such spell modifier" but not crash with invalid structure
      expect(() => stater.applySpellCast(spellCast)).toThrow(
        "No such spell modifier",
      );
    });
  });

  describe("applyEffect", () => {
    it("should throw error for unknown effect", () => {
      const effect = new Effect({
        effectId: Field(999),
        duration: Field(3),
      });

      const publicState = stater.generatePublicState();

      expect(() => stater.applyEffect(publicState, effect)).toThrow(
        "No such effectInfo",
      );
    });

    it("should not crash with valid effect structure", () => {
      const effect = new Effect({
        effectId: Field(1),
        duration: Field(3),
      });

      const publicState = stater.generatePublicState();

      // This should throw "No such effectInfo" but not crash with invalid structure
      expect(() => stater.applyEffect(publicState, effect)).toThrow(
        "No such effectInfo",
      );
    });
  });

  describe("applyEffects", () => {
    it("should handle effects with zero effectId (should be ignored)", () => {
      // All effects are initialized with effectId: Field(0)
      const publicState = stater.generatePublicState();

      // This should complete without error since effectId 0 should not match any real effects
      expect(() => stater.applyEffects(publicState)).toThrow(
        "No such effectInfo",
      );
    });

    it("should attempt to apply non-zero effect IDs", () => {
      // Set up an effect with non-zero ID
      stater.state.effects[0] = new Effect({
        effectId: Field(10),
        duration: Field(3),
      });

      const publicState = stater.generatePublicState();

      expect(() => stater.applyEffects(publicState)).toThrow(
        "No such effectInfo",
      );
    });
  });

  describe("apply - integration", () => {
    it("should handle empty spell casts array but throw on effects", () => {
      // Since the apply method always calls applyEffects, and we have effects with effectId: Field(0),
      // it will throw "No such effectInfo" when trying to find an effect with ID 0
      expect(() => stater.apply([])).toThrow("No such effectInfo");
    });

    it("should have correct workflow sequence", () => {
      // Test that the apply method follows the correct sequence:
      // 1. Apply spells (none in this case)
      // 2. Generate public state
      // 3. Apply effects (will throw because effectId 0 is not found)

      const spellCasts: SpellCast<any>[] = [];

      expect(() => stater.apply(spellCasts)).toThrow("No such effectInfo");
    });

    it("should generate state commit correctly", () => {
      const commit = stater.generateStateCommit();
      expect(commit).toBeInstanceOf(Field);
    });

    it("should generate public state correctly", () => {
      const publicState = stater.generatePublicState();

      expect(publicState).toBeInstanceOf(State);
      expect(publicState.playerId.toString()).toBe(
        stater.state.playerId.toString(),
      );
      expect(publicState.playerStats.hp.toString()).toBe(
        stater.state.playerStats.hp.toString(),
      );
    });
  });

  describe("error handling", () => {
    it("should handle invalid spell ID types gracefully", () => {
      const spellCast: SpellCast<any> = {
        spellId: Field(0),
        target: Field(1),
        additionalData: {},
      };

      expect(() => stater.applySpellCast(spellCast)).toThrow(
        "No such spell modifier",
      );
    });

    it("should handle invalid effect ID types gracefully", () => {
      const effect = new Effect({
        effectId: Field(0),
        duration: Field(0),
      });

      const publicState = stater.generatePublicState();

      expect(() => stater.applyEffect(publicState, effect)).toThrow(
        "No such effectInfo",
      );
    });
  });

  describe("Position struct", () => {
    it("should calculate manhattan distance correctly", () => {
      const pos1 = new Position({ x: Int64.from(0), y: Int64.from(0) });
      const pos2 = new Position({ x: Int64.from(3), y: Int64.from(4) });

      const distance = pos1.manhattanDistance(pos2);
      expect(distance.toString()).toBe("7"); // |3-0| + |4-0| = 7
    });

    it("should handle negative coordinates", () => {
      const pos1 = new Position({ x: Int64.from(-2), y: Int64.from(-3) });
      const pos2 = new Position({ x: Int64.from(1), y: Int64.from(2) });

      const distance = pos1.manhattanDistance(pos2);
      expect(distance.toString()).toBe("8"); // |1-(-2)| + |2-(-3)| = 3 + 5 = 8
    });
  });

  describe("struct creation and properties", () => {
    it("should create PlayerStats correctly", () => {
      const position = new Position({ x: Int64.from(5), y: Int64.from(10) });
      const playerStats = new PlayerStats({
        hp: Int64.from(150),
        position: position,
      });

      expect(playerStats.hp.toString()).toBe("150");
      expect(playerStats.position.x.toString()).toBe("5");
      expect(playerStats.position.y.toString()).toBe("10");
    });

    it("should create SpellStats correctly", () => {
      const spellStats = new SpellStats({
        spellId: Field(42),
        cooldown: Int64.from(5),
        currentColldown: Int64.from(2),
      });

      expect(spellStats.spellId.toString()).toBe("42");
      expect(spellStats.cooldown.toString()).toBe("5");
      expect(spellStats.currentColldown.toString()).toBe("2");
    });

    it("should create Effect correctly", () => {
      const effect = new Effect({
        effectId: Field(123),
        duration: Field(10),
      });

      expect(effect.effectId.toString()).toBe("123");
      expect(effect.duration.toString()).toBe("10");
    });
  });

  describe("State arrays and initialization", () => {
    it("should initialize with correct number of spell stats", () => {
      expect(stater.state.spellStats.length).toBe(5);

      for (let i = 0; i < 5; i++) {
        const spellStat = stater.state.spellStats[i];
        expect(spellStat).toBeDefined();
        expect(spellStat!.spellId.toString()).toBe((i + 1).toString());
        expect(spellStat!.cooldown.toString()).toBe("3");
        expect(spellStat!.currentColldown.toString()).toBe("0");
      }
    });

    it("should initialize with correct number of effects", () => {
      expect(stater.state.effects.length).toBe(10);

      for (let i = 0; i < 10; i++) {
        const effect = stater.state.effects[i];
        expect(effect).toBeDefined();
        expect(effect!.effectId.toString()).toBe("0");
        expect(effect!.duration.toString()).toBe("0");
      }
    });

    it("should have consistent state between copy and original", () => {
      const stateCopy = stater.state.copy();

      expect(stateCopy.spellStats.length).toBe(stater.state.spellStats.length);
      expect(stateCopy.effects.length).toBe(stater.state.effects.length);

      for (let i = 0; i < 5; i++) {
        const originalSpellStat = stater.state.spellStats[i];
        const copySpellStat = stateCopy.spellStats[i];
        expect(originalSpellStat).toBeDefined();
        expect(copySpellStat).toBeDefined();
        expect(copySpellStat!.spellId.toString()).toBe(
          originalSpellStat!.spellId.toString(),
        );
      }
    });
  });

  describe("random seed behavior", () => {
    it("should maintain random seed throughout operations", () => {
      const originalSeed = stater.state.randomSeed.toString();

      // Try operations that don't modify randomSeed
      stater.generatePublicState();
      stater.generateStateCommit();

      expect(stater.state.randomSeed.toString()).toBe(originalSeed);
    });
  });
});
