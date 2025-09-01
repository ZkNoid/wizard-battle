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
  private readonly mapSize = 10; // Assuming 10x10 map

  /**
   * @notice Generates a bot player setup using proper State structure
   * @param botId Unique identifier for the bot
   * @param socketId Socket connection ID for the bot client
   * @returns Complete bot player setup with State.toFields() approach
   */
  generateBotSetup(botId: string, socketId: string): IPublicState {
    // Generate random starting position
    const startPosition = {
      x: Math.floor(Math.random() * this.mapSize),
      y: Math.floor(Math.random() * this.mapSize),
    };

    // Create a proper State object for the bot using State.default() and modify it
    const botState = State.default();

    // Customize the bot state with unique values
    botState.playerId = Field(
      parseInt(botId.replace(/\D/g, '')) || Math.floor(Math.random() * 10000)
    );
    botState.wizardId = CircuitString.fromString('BotMage').hash();
    botState.playerStats.hp = Int64.from(100);
    botState.playerStats.position.value.x = Int64.from(startPosition.x);
    botState.playerStats.position.value.y = Int64.from(startPosition.y);
    botState.randomSeed = Field(Math.floor(Math.random() * 1000000));

    // Convert to fields using State.toFields() - same approach as frontend
    const botSetup: IPublicState = {
      socketId,
      playerId: botId,
      fields: JSON.stringify(State.toJSON(botState)), // Use proper State.toFields() conversion
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

    // Bot decision logic - simple AI that casts 1-2 spells per turn
    const numActions = Math.random() < 0.7 ? 1 : 2; // 70% chance for 1 action, 30% for 2

    for (let i = 0; i < numActions; i++) {
      const action = this.generateRandomAction(
        botId,
        currentState,
        opponentState
      );
      if (action) {
        actions.push(action);
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
   * @notice Generates a single random action based on bot AI logic
   */
  private generateRandomAction(
    botId: string,
    currentState: IPublicState,
    opponentState?: IPublicState
  ): IUserAction | null {
    // Simple bot AI - for now we'll use random actions since we can't easily parse fields in backend
    // In a real implementation, you'd have proper field parsing logic
    const currentPos = {
      x: Math.floor(Math.random() * this.mapSize),
      y: Math.floor(Math.random() * this.mapSize),
    };

    let spellId: string;
    let spellCastInfo: any = {};

    if (Math.random() < 0.2) {
      // 20% chance to heal
      spellId = 'heal';
      spellCastInfo = { target: 'self' };
    } else if (Math.random() < 0.3) {
      // 30% chance to move/teleport
      spellId = 'teleport';
      spellCastInfo = {
        target: this.generateRandomPosition(currentPos),
      };
    } else {
      // Default: cast a random offensive spell at random location
      const attackSpells = ['fireball', 'lightning'];
      spellId =
        attackSpells[Math.floor(Math.random() * attackSpells.length)] ||
        'fireball';
      spellCastInfo = {
        target: this.generateRandomPosition(currentPos),
      };
    }

    return {
      playerId: botId,
      spellId,
      spellCastInfo,
    };
  }

  /**
   * @notice Generates bot's trusted state using fields approach
   */
  generateBotTrustedState(
    botId: string,
    currentState: IPublicState,
    allActions: { [playerId: string]: IUserActions }
  ): ITrustedState {
    // For now, return the current state with minimal changes
    // In a real implementation, you'd properly simulate spell effects
    const stateCommit = `bot_commit_${botId}_${Date.now()}_${Math.random()}`;
    const signature = `bot_trusted_signature_${botId}_${Date.now()}`;

    return {
      playerId: botId,
      stateCommit,
      publicState: {
        socketId: currentState.socketId,
        playerId: botId,
        fields: currentState.fields, // Keep the same fields for now
      },
      signature,
    };
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
