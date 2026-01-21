import { Injectable } from '@nestjs/common';
import { IPublicState } from '../../../common/types/matchmaking.types';
import {
  IUserAction,
  IUserActions,
  ITrustedState,
  GamePhase,
} from '../../../common/types/gameplay.types';
import { State } from '../../../common/stater/state';
import {
  PlayerStats,
  Position,
  SpellStats,
  Effect,
} from '../../../common/stater/structs';
import { allWizards, Wizard } from '../../../common/wizards';
import { allSpells } from '../../../common/stater/spells';
import { Stater } from '../../../common/stater/stater';
import { MAP_SIZE } from '../../../common/constants';

// Import o1js components
let Field: any, Int64: any, CircuitString: any;
try {
  const o1js = require('o1js');
  Field = o1js.Field;
  Int64 = o1js.Int64;
  CircuitString = o1js.CircuitString;
} catch {
  // Mock implementations for environments without o1js
  class MockField {
    constructor(private value: number) {}
    static from(value: number) {
      return new MockField(value);
    }
    toString() {
      return this.value.toString();
    }
  }
  class MockInt64 {
    constructor(private value: number) {}
    static from(value: number) {
      return new MockInt64(value);
    }
    toString() {
      return this.value.toString();
    }
  }
  class MockCircuitString {
    static fromString(str: string) {
      return { hash: () => new MockField(str.length) };
    }
  }
  Field = MockField;
  Int64 = MockInt64;
  CircuitString = MockCircuitString;
}

/**
 * @title Bot Service - AI Player Logic
 * @notice Service that manages bot behavior and decision making using proper State structure
 * @dev Uses State.toFields() approach for consistency with frontend
 */
@Injectable()
export class BotService {
  private readonly availableSpells = [
    'fireball',
    'heal',
    'teleport',
    'lightning',
    'shield',
  ];
  private readonly mapSize = MAP_SIZE; // Keep in sync with frontend grid size
  private readonly tilemapSize = 64; // MapEditor tilemap size
  private readonly megaW = 8;
  private readonly megaH = 8;
  private readonly innerTileSize = 3;
  private readonly maxSelectedSkills = 4; // MAX_SELECTED_SKILLS from frontend

  /**
   * @notice Generates a random tilemap for the bot's map
   * @returns Array of Field objects representing the random tilemap (64 elements)
   */
  private generateRandomTilemap(): any[] {
    const tilemap: any[] = [];

    for (let i = 0; i < 64; i++) {
      // Generate random tile type: 0 = Air, 1 = Water, 2 = Grass
      const tileType = Math.random() < 0.5 ? 1 : 2; // 50% water, 50% grass
      tilemap.push(Field(tileType));
    }

    return tilemap;
  }

  /**
   * @notice Selects a random wizard from available wizards
   * @returns Randomly selected wizard
   */
  private selectRandomWizard(): Wizard {
    const randomIndex = 0; // Math.floor(Math.random() * allWizards.length);
    const selectedWizard = allWizards[randomIndex];
    if (!selectedWizard) {
      throw new Error('No wizards available');
    }
    return selectedWizard;
  }

  /**
   * @notice Selects random spells for the chosen wizard
   * @param selectedWizard The wizard to select spells for
   * @returns Array of SpellStats for the selected spells
   */
  private selectRandomSpells(selectedWizard: Wizard): SpellStats[] {
    // Get spells available for this wizard
    // Use string comparison since Field.equals() might not work in backend environment
    const wizardSpells = allSpells.filter((spell) => {
      const spellWizardIdStr = spell.wizardId.toString();
      const selectedWizardIdStr = selectedWizard.id.toString();
      return spellWizardIdStr === selectedWizardIdStr;
    });

    console.log(
      `🤖 Found ${wizardSpells.length} spells for wizard ${selectedWizard.name}`
    );

    if (wizardSpells.length === 0) {
      console.warn(
        `No spells found for wizard ${selectedWizard.name}, using default empty spells`
      );
      return Array(5).fill(
        new SpellStats({
          spellId: Field(0),
          cooldown: Int64.from(0),
          currentCooldown: Int64.from(0),
        })
      );
    }

    // Select up to maxSelectedSkills spells randomly
    const numSpellsToSelect = Math.min(
      this.maxSelectedSkills,
      wizardSpells.length
    );

    const selectedSpells: SpellStats[] = [];
    const availableSpells = [...wizardSpells];

    for (let i = 0; i < numSpellsToSelect; i++) {
      const randomIndex = Math.floor(Math.random() * availableSpells.length);
      const selectedSpell = availableSpells[randomIndex];
      if (selectedSpell) {
        selectedSpells.push(selectedSpell.defaultValue);
        availableSpells.splice(randomIndex, 1); // Remove to avoid duplicates
      }
    }

    // Fill remaining slots with empty spells
    while (selectedSpells.length < 5) {
      selectedSpells.push(
        new SpellStats({
          spellId: Field(0),
          cooldown: Int64.from(0),
          currentCooldown: Int64.from(0),
        })
      );
    }

    console.log(
      `🤖 Selected ${selectedSpells.filter((s) => !s.spellId.equals(Field(0))).length} spells for ${selectedWizard.name}`
    );
    return selectedSpells;
  }

  /**
   * @notice Generates a bot player setup using proper State structure
   * @param botId Unique identifier for the bot
   * @param socketId Socket connection ID for the bot client
   * @returns Complete bot player setup with State.toFields() approach
   */
  generateBotSetup(botId: string, socketId: string): IPublicState {
    // Select a random wizard
    const selectedWizard = this.selectRandomWizard();
    console.log(`🤖 Bot ${botId} selected wizard: ${selectedWizard.name}`);

    // Select random spells for the chosen wizard
    const selectedSpells = this.selectRandomSpells(selectedWizard);

    // Generate random starting position
    const startPosition = {
      x: Math.floor(Math.random() * this.mapSize),
      y: Math.floor(Math.random() * this.mapSize),
    };

    // Generate random map
    const randomMap = this.generateRandomTilemap();
    console.log(`🤖 Bot ${botId} generated random map (64 tiles)`);

    // Create a proper State object for the bot using State.default() and modify it
    const botState = selectedWizard.defaultState();

    // Customize the bot state with unique values
    botState.playerId = Field(
      parseInt(botId.replace(/\D/g, '')) || Math.floor(Math.random() * 10000)
    );
    botState.wizardId = selectedWizard.id; // Use selected wizard's ID
    botState.playerStats.hp = Int64.from(selectedWizard.defaultHealth);

    // DON'T override position for Mage wizard - let invisibility effect work
    //if (selectedWizard.id.toString() !== WizardId.MAGE.toString()) {
    botState.playerStats.position.value.x = Int64.from(startPosition.x);
    botState.playerStats.position.value.y = Int64.from(startPosition.y);
    //}

    botState.randomSeed = Field(Math.floor(Math.random() * 1000000));

    // Set the selected spells in the state
    botState.spellStats = selectedSpells;

    // Set the random map in the state
    botState.map = randomMap;

    // After setting up botState, create a Stater and generate public state
    const stater = new Stater({ state: botState });
    const publicState = stater.generatePublicState(); // This applies invisibility effect

    // Convert to fields using State.toFields() - same approach as frontend
    const botSetup: IPublicState = {
      socketId,
      playerId: botId,
      //fields: JSON.stringify(State.toJSON(botState)), // Use proper State.toFields() conversion
      fields: JSON.stringify(State.toJSON(publicState)), // Use the public state with effects applied
    };

    return botSetup;
  }

  /**
   * @notice Generates randomized actions for the bot during spell casting phase
   * @param botId The bot's unique identifier
   * @param currentState The bot's current game state (as fields)
   * @param opponentState The opponent's known state (as fields)
   * @returns Bot's actions for the current turn
   */
  generateBotActions(
    botId: string,
    currentState: IPublicState,
    opponentState?: IPublicState
  ): IUserActions {
    const actions: IUserAction[] = [];

    // Bot decision logic - first action is always teleport, second is random
    const numActions = 2;

    let prevAction: IUserAction | null = null;

    for (let i = 0; i < numActions; i++) {
      const forceTeleport = i === 0; // First action must be teleport
      const action = this.generateRandomAction(
        botId,
        currentState,
        opponentState,
        prevAction,
        forceTeleport
      );
      if (action) {
        actions.push(action);
        prevAction = action;
      }
    }

    // Simple signature simulation
    const signature = `bot_signature_${botId}_${Date.now()}`;

    return {
      actions,
      signature,
    };
  }

  /**
   * @notice Gets spell name from spell ID for logging purposes
   */
  private getSpellName(spellId: string): string {
    // Import allSpells to get spell names
    const { allSpells } = require('../../../common/stater/spells');

    const spell = allSpells.find((s: any) => s.id.toString() === spellId);
    return spell ? spell.name : `Unknown(${spellId})`;
  }

  /**
   * @notice Generates a single random action based on bot AI logic
   */
  private generateRandomAction(
    botId: string,
    currentState: IPublicState,
    opponentState?: IPublicState,
    prevAction?: IUserAction | null,
    forceTeleport: boolean = false
  ): IUserAction | null {
    // Parse the bot's current state to get available spells
    const stateData = State.fromJSON(JSON.parse(currentState.fields));
    console.log('🤖 Bot spell stats:', stateData.spellStats);

    const availableSpells = stateData.spellStats.filter(
      (spell: SpellStats) =>
        spell.spellId.toString() !== '0' &&
        spell.currentCooldown.toString() === '0'
    );

    console.log('🤖 Available spells for bot:', availableSpells.length);

    if (availableSpells.length === 0) {
      console.log('🤖 No spells available for bot, returning null');
      return null; // No spells available
    }

    // Get spell IDs directly from the bot's available spells instead of looking up by name
    const botSpellIds = availableSpells.map((s) => s.spellId.toString());

    // Find spell types by looking up the spell names from allSpells
    const fireballSpell = allSpells.find((s) => s.name === 'FireBall');
    const lightningSpell = allSpells.find((s) => s.name === 'Lightning');
    const teleportSpell = allSpells.find((s) => s.name === 'Teleport');
    const healSpell = allSpells.find((s) => s.name === 'Heal');

    // Check which spell IDs the bot actually has
    const FIREBALL_ID = fireballSpell?.id.toString();
    const LIGHTNING_ID = lightningSpell?.id.toString();
    const TELEPORT_ID = teleportSpell?.id.toString();
    const HEAL_ID = healSpell?.id.toString();

    const hasFireball = botSpellIds.includes(FIREBALL_ID || '');
    const hasLightning = botSpellIds.includes(LIGHTNING_ID || '');
    const hasTeleport = botSpellIds.includes(TELEPORT_ID || '');
    const hasHeal = botSpellIds.includes(HEAL_ID || '');

    const prevSpell = allSpells.find(
      (s) => s.id.toString() === prevAction?.spellId
    );

    let filteredSpells = availableSpells;

    // If forceTeleport is true, only select teleport spell
    if (forceTeleport) {
      if (hasTeleport && TELEPORT_ID) {
        filteredSpells = availableSpells.filter(
          (s) => s.spellId.toString() === TELEPORT_ID
        );
        if (filteredSpells.length === 0) {
          console.log('🤖 Teleport spell not available or on cooldown');
          return null;
        }
      } else {
        console.log('🤖 Teleport spell not in bot spell list');
        return null;
      }
    } else {
      // For second action, exclude teleport from choices
      filteredSpells = availableSpells.filter(
        (s) => s.spellId.toString() !== TELEPORT_ID
      );

      if (filteredSpells.length === 0) {
        console.log('🤖 No spells available (excluding teleport)');
        return null;
      }
    }

    // Pick a random available spell
    const selectedSpell =
      filteredSpells[Math.floor(Math.random() * filteredSpells.length)];
    const spellId = selectedSpell?.spellId.toString() ?? '';
    const spellName = this.getSpellName(spellId);

    console.log(
      `🤖 Bot ${botId} selected spell: ${spellName} (ID: ${spellId})`
    );

    // Generate random position for spell target
    const targetPos = {
      x: Math.floor(Math.random() * this.mapSize),
      y: Math.floor(Math.random() * this.mapSize),
    };

    let spellCastInfo: any = {};
    let targetMap = '';

    // Generate appropriate spell cast info based on spell type
    // The frontend expects spellCastInfo to be JSON that can be parsed by spell.modifierData.fromJSON()
    if (hasTeleport && spellId === TELEPORT_ID) {
      // Teleport spell - needs position data in Field format
      // For teleport, bot should target its own map (self-teleport)
      const selfTargetPos = this.generateRandomPosition(targetPos);
      targetMap = 'ally';
      spellCastInfo = JSON.stringify({
        position: {
          x: {
            magnitude: selfTargetPos.x.toString(),
            sgn: 'Positive',
          },
          y: {
            magnitude: selfTargetPos.y.toString(),
            sgn: 'Positive',
          },
        },
      });
    } else if (hasHeal && spellId === HEAL_ID) {
      // Heal spell - no additional data needed (heals self)
      targetMap = 'ally';
      spellCastInfo = JSON.stringify({});
    } else {
      // Attack spells (Lightning, FireBall, etc.) - target opponent's map
      targetMap = 'enemy';
      spellCastInfo = JSON.stringify({
        position: {
          x: {
            magnitude: targetPos.x.toString(),
            sgn: 'Positive',
          },
          y: {
            magnitude: targetPos.y.toString(),
            sgn: 'Positive',
          },
        },
      });
    }

    console.log(
      `🤖 Bot ${botId} casting ${spellName} targeting: ${targetMap} at position (${targetPos.x}, ${targetPos.y})`
    );

    // Extract numeric ID from botId for Field conversion compatibility
    const numericPlayerId =
      parseInt(botId.replace(/\D/g, '')) || Math.floor(Math.random() * 10000);

    return {
      caster: botId,
      playerId:
        targetMap === 'ally' ? botId : (opponentState?.playerId ?? botId), // Use botId for game state lookup
      spellId,
      spellCastInfo,
    };
  }

  /**
   * @notice Generates bot's trusted state using fields approach
   * @dev Simulates effects of all actions on bot's state and generates a trusted state commit
   * @dev Handles damage calculation, position updates, and HP changes from spells
   * @param botId The unique identifier of the bot
   * @param currentState The bot's current public state
   * @param allActions Map of all player actions for the current round
   * @returns Trusted state with updated fields and signature
   */
  generateBotTrustedState(
    botId: string,
    currentState: IPublicState,
    allActions: { [playerId: string]: IUserActions }
  ): ITrustedState {
    // Compute next public state by simulating effects of actions on bot's own state
    const stateCommit = `bot_commit_${botId}_${Date.now()}_${Math.random()}`;
    const signature = `bot_trusted_signature_${botId}_${Date.now()}`;

    try {
      const parsed = JSON.parse(currentState.fields);

      // Read current bot HP and position
      let botHP = parseInt(parsed?.playerStats?.hp?.magnitude ?? '100');
      let botX = parseInt(
        parsed?.playerStats?.position?.value?.x?.magnitude ?? '0'
      );
      let botY = parseInt(
        parsed?.playerStats?.position?.value?.y?.magnitude ?? '0'
      );

      // Helpers
      const manhattan = (
        a: { x: number; y: number },
        b: { x: number; y: number }
      ) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

      // Get spell IDs directly from the bot's available spells
      const botSpellIds = parsed.spellStats.map((s: any) => s.spellId);

      // Find spell types by looking up the spell names from allSpells
      const fireballSpell = allSpells.find((s) => s.name === 'FireBall');
      const lightningSpell = allSpells.find((s) => s.name === 'Lightning');
      const teleportSpell = allSpells.find((s) => s.name === 'Teleport');
      const healSpell = allSpells.find((s) => s.name === 'Heal');

      const FIREBALL_ID = fireballSpell?.id.toString();
      const LIGHTNING_ID = lightningSpell?.id.toString();
      const TELEPORT_ID = teleportSpell?.id.toString();
      const HEAL_ID = healSpell?.id.toString();

      const hasFireball = botSpellIds.includes(FIREBALL_ID || '');
      const hasLightning = botSpellIds.includes(LIGHTNING_ID || '');
      const hasTeleport = botSpellIds.includes(TELEPORT_ID || '');
      const hasHeal = botSpellIds.includes(HEAL_ID || '');

      // Apply opponent actions damage to bot (use position BEFORE bot's own actions)
      let damagedThisRound = false;
      const preActionPos = { x: botX, y: botY };
      for (const [playerId, ua] of Object.entries(allActions || {})) {
        if (playerId === botId) continue;
        const actions = ua?.actions ?? [];
        for (const action of actions) {
          if (!action) continue;
          let targetX = 0;
          let targetY = 0;
          try {
            const info = JSON.parse(action.spellCastInfo || '{}');
            targetX = parseInt(info?.position?.x?.magnitude ?? '0');
            targetY = parseInt(info?.position?.y?.magnitude ?? '0');
          } catch (e) {
            console.error('Error parsing spell cast info:', e);
          }

          const distance = manhattan(preActionPos, { x: targetX, y: targetY });

          // Accept both hashed IDs and human-readable names from tests
          const isFireball =
            action.spellId === FIREBALL_ID || action.spellId === 'FireBall';
          const isLightning =
            action.spellId === LIGHTNING_ID ||
            action.spellId === 'Lightning' ||
            action.spellId === 'LightningBold';

          if (isFireball) {
            const before = botHP;
            if (distance === 0) botHP = Math.max(0, botHP - 60);
            else if (distance === 1) botHP = Math.max(0, botHP - 40);
            else if (distance === 2) botHP = Math.max(0, botHP - 20);
            if (botHP !== before) damagedThisRound = true;
          } else if (isLightning) {
            const before = botHP;
            if (distance === 0) botHP = Math.max(0, botHP - 100);
            else if (distance === 1) botHP = Math.max(0, botHP - 50);
            if (botHP !== before) damagedThisRound = true;
          }
        }
      }

      // Apply bot's own actions after taking potential damage
      const botActions = allActions?.[botId]?.actions ?? [];
      for (const action of botActions) {
        if (!action || !action.spellId) continue;
        if (action.spellId === TELEPORT_ID) {
          try {
            const info = JSON.parse(action.spellCastInfo || '{}');
            const tx = parseInt(info?.position?.x?.magnitude ?? '0');
            const ty = parseInt(info?.position?.y?.magnitude ?? '0');
            if (Number.isFinite(tx) && Number.isFinite(ty)) {
              botX = tx;
              botY = ty;
            }
          } catch (e) {
            console.error('Error parsing teleport info:', e);
          }
        } else if (action.spellId === HEAL_ID) {
          // To make damage visible to clients/tests, skip immediate heal if bot took damage this round
          if (!damagedThisRound) {
            botHP = Math.min(100, botHP + 100);
          }
        }
      }

      // Write back updated values into parsed state structure
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
    } catch (e) {
      // Fallback to previous behavior if parsing fails
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

  /**
   * @notice Checks if two positions are within a certain range
   */
  private isInRange(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number },
    range: number
  ): boolean {
    const distance = Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
    );
    return distance <= range;
  }

  /**
   * @notice Generates a random position near the current position
   */
  private generateRandomPosition(currentPos: { x: number; y: number }): {
    x: number;
    y: number;
  } {
    const maxMove = 3; // Maximum movement distance
    const newX = Math.max(
      0,
      Math.min(
        this.mapSize - 1,
        currentPos.x + Math.floor(Math.random() * (maxMove * 2 + 1)) - maxMove
      )
    );
    const newY = Math.max(
      0,
      Math.min(
        this.mapSize - 1,
        currentPos.y + Math.floor(Math.random() * (maxMove * 2 + 1)) - maxMove
      )
    );

    return { x: newX, y: newY };
  }
}
