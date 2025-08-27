import { Injectable } from '@nestjs/common';
import { IPublicState, ISpell } from '../../../common/types/matchmaking.types';
import { IUserAction, IUserActions, ITrustedState, GamePhase } from '../../../common/types/gameplay.types';

// Mock Field class for bot service (since o1js may not be available in all environments)
class MockField {
  constructor(private value: number) {}
  static from(value: number) {
    return new MockField(value);
  }
}

// Use mock Field if o1js is not available
let Field: any;
try {
  Field = require('o1js').Field;
} catch {
  Field = MockField;
}

/**
 * @title Bot Service - AI Player Logic
 * @notice Service that manages bot behavior and decision making
 * @dev Provides randomized spell casting and state management for bot players
 */
@Injectable()
export class BotService {
  private readonly availableSpells = ['fireball', 'heal', 'teleport', 'lightning', 'shield'];
  private readonly mapSize = 10; // Assuming 10x10 map

  /**
   * @notice Generates a bot player setup with randomized initial state
   * @param botId Unique identifier for the bot
   * @param socketId Socket connection ID for the bot client
   * @returns Complete bot player setup matching IPublicState interface
   */
  generateBotSetup(botId: string, socketId: string): IPublicState {
    // Generate random starting position
    const startPosition = {
      x: Math.floor(Math.random() * this.mapSize),
      y: Math.floor(Math.random() * this.mapSize)
    };

    // Create bot setup matching the player structure
    const botSetup: IPublicState = {
      socketId,
      playerId: botId,
      fields: [Field(100), Field(startPosition.x), Field(startPosition.y)], // HP, x, y as Fields
      hp: 100,
      position: startPosition,
      effects: []
    };

    return botSetup;
  }

  /**
   * @notice Generates randomized actions for the bot during spell casting phase
   * @param botId The bot's unique identifier
   * @param currentState The bot's current game state
   * @param opponentState The opponent's known state (for targeting)
   * @returns Bot's actions for the current turn
   */
  generateBotActions(botId: string, currentState: IPublicState, opponentState?: IPublicState): IUserActions {
    const actions: IUserAction[] = [];
    
    // Bot decision logic - simple AI that casts 1-2 spells per turn
    const numActions = Math.random() < 0.7 ? 1 : 2; // 70% chance for 1 action, 30% for 2
    
    for (let i = 0; i < numActions; i++) {
      const action = this.generateRandomAction(botId, currentState, opponentState);
      if (action) {
        actions.push(action);
      }
    }

    // Simple signature simulation (in real implementation, this would be cryptographic)
    const signature = `bot_signature_${botId}_${Date.now()}`;

    return {
      actions,
      signature
    };
  }

  /**
   * @notice Generates a single random action based on bot AI logic
   * @param botId The bot's unique identifier
   * @param currentState The bot's current state
   * @param opponentState The opponent's state for targeting decisions
   * @returns A single action or null if no valid action
   */
  private generateRandomAction(botId: string, currentState: IPublicState, opponentState?: IPublicState): IUserAction | null {
    // Simple AI decision tree
    const lowHp = currentState.hp < 30;
    const mediumHp = currentState.hp < 60;
    
    let spellId: string;
    let spellCastInfo: any = {};

    if (lowHp && Math.random() < 0.8) {
      // Low HP: 80% chance to heal
      spellId = 'heal';
      spellCastInfo = { target: 'self' };
    } else if (opponentState && this.isInRange(currentState.position, opponentState.position, 3)) {
      // Opponent in range: attack
      const attackSpells = ['fireball', 'lightning'];
      spellId = attackSpells[Math.floor(Math.random() * attackSpells.length)] || 'fireball';
      spellCastInfo = {
        target: opponentState.position,
        targetPlayerId: opponentState.playerId
      };
    } else if (Math.random() < 0.3) {
      // 30% chance to move/teleport
      spellId = 'teleport';
      spellCastInfo = {
        target: this.generateRandomPosition(currentState.position)
      };
    } else {
      // Default: cast a random offensive spell at random location
      spellId = this.availableSpells[Math.floor(Math.random() * this.availableSpells.length)] || 'fireball';
      spellCastInfo = {
        target: this.generateRandomPosition(currentState.position)
      };
    }

    return {
      playerId: botId,
      spellId,
      spellCastInfo
    };
  }

  /**
   * @notice Generates bot's trusted state after applying spell effects
   * @param botId The bot's unique identifier
   * @param currentState The bot's state before effects
   * @param allActions All actions from the turn (for effect calculation)
   * @returns Bot's computed trusted state
   */
  generateBotTrustedState(
    botId: string, 
    currentState: IPublicState, 
    allActions: { [playerId: string]: IUserActions }
  ): ITrustedState {
    // Simulate effect calculation (simplified)
    const updatedState = this.simulateSpellEffects(currentState, allActions);
    
    // Generate state commitment (simplified)
    const stateCommit = `bot_commit_${botId}_${Date.now()}_${Math.random()}`;
    
    // Simple signature simulation
    const signature = `bot_trusted_signature_${botId}_${Date.now()}`;

    return {
      playerId: botId,
      stateCommit,
      publicState: updatedState,
      signature
    };
  }

  /**
   * @notice Simulates spell effects on bot state
   * @param currentState Bot's current state
   * @param allActions All player actions from the turn
   * @returns Updated bot state after effects
   */
  private simulateSpellEffects(
    currentState: IPublicState, 
    allActions: { [playerId: string]: IUserActions }
  ): IPublicState {
    let updatedState = { ...currentState };
    
    // Simple effect simulation
    // In a real game, this would process all spell interactions
    Object.values(allActions).forEach(playerActions => {
      playerActions.actions.forEach(action => {
        if (action.spellId === 'heal' && action.playerId === currentState.playerId) {
          // Bot healed itself
          updatedState.hp = Math.min(100, updatedState.hp + 20);
        } else if (action.spellCastInfo?.targetPlayerId === currentState.playerId) {
          // Bot was targeted by opponent
          if (action.spellId === 'fireball' || action.spellId === 'lightning') {
            updatedState.hp = Math.max(0, updatedState.hp - 25);
          }
        }
      });
    });

    // Update Fields to match new state
    updatedState.fields = [
      Field(updatedState.hp),
      Field(updatedState.position.x),
      Field(updatedState.position.y)
    ];

    return updatedState;
  }

  /**
   * @notice Checks if two positions are within a certain range
   */
  private isInRange(pos1: { x: number; y: number }, pos2: { x: number; y: number }, range: number): boolean {
    const distance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
    return distance <= range;
  }

  /**
   * @notice Generates a random position near the current position
   */
  private generateRandomPosition(currentPos: { x: number; y: number }): { x: number; y: number } {
    const maxMove = 3; // Maximum movement distance
    const newX = Math.max(0, Math.min(this.mapSize - 1, 
      currentPos.x + Math.floor(Math.random() * (maxMove * 2 + 1)) - maxMove
    ));
    const newY = Math.max(0, Math.min(this.mapSize - 1,
      currentPos.y + Math.floor(Math.random() * (maxMove * 2 + 1)) - maxMove
    ));
    
    return { x: newX, y: newY };
  }
}
