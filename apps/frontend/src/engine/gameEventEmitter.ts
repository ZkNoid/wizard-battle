import { EventEmitter } from 'events';

// Types of events for movement on the tilemap
export interface MoveEntityEvent {
  entityId: string;
  x: number; // tilemap coordinate (0-7)
  y: number; // tilemap coordinate (0-7)
}

// Types of events for animations
export interface PlayAnimationEvent {
  entityId: string;
  animationName: string;
  loop?: boolean;
}

export interface StopAnimationEvent {
  entityId: string;
}

class GameEventEmitter extends EventEmitter {
  private static instance: GameEventEmitter;

  private constructor() {
    super();
  }

  static getInstance(): GameEventEmitter {
    if (!GameEventEmitter.instance) {
      GameEventEmitter.instance = new GameEventEmitter();
    }
    return GameEventEmitter.instance;
  }

  // Simple API for movement on the tilemap
  move(entityId: string, x: number, y: number) {
    // Checking the boundaries of the tilemap (0-7)
    if (x < 0 || x >= 8 || y < 0 || y >= 8) {
      console.warn(`Invalid tilemap coordinates: x=${x}, y=${y}. Must be 0-7.`);
      return;
    }

    const event: MoveEntityEvent = {
      entityId,
      x,
      y,
    };
    this.emit('move', event);
  }

  onMove(callback: (event: MoveEntityEvent) => void) {
    this.on('move', callback);
  }

  offMove(callback: (event: MoveEntityEvent) => void) {
    this.off('move', callback);
  }

  // Simple API for animations
  playAnimation(entityId: string, animationName: string, loop = true) {
    const event: PlayAnimationEvent = {
      entityId,
      animationName,
      loop,
    };
    this.emit('playAnimation', event);
  }

  stopAnimation(entityId: string) {
    const event: StopAnimationEvent = {
      entityId,
    };
    this.emit('stopAnimation', event);
  }

  onPlayAnimation(callback: (event: PlayAnimationEvent) => void) {
    this.on('playAnimation', callback);
  }

  offPlayAnimation(callback: (event: PlayAnimationEvent) => void) {
    this.off('playAnimation', callback);
  }

  onStopAnimation(callback: (event: StopAnimationEvent) => void) {
    this.on('stopAnimation', callback);
  }

  offStopAnimation(callback: (event: StopAnimationEvent) => void) {
    this.off('stopAnimation', callback);
  }
}

export const gameEventEmitter = GameEventEmitter.getInstance();
