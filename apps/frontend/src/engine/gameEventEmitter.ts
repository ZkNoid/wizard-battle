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
  oneTime?: boolean;
  scale?: number;
}

export interface StopAnimationEvent {
  entityId: string;
}

export interface AnimationCompleteEvent {
  entityId: string;
  animationName: string;
}

// Type for throwing effects at specific tile coordinates
export interface ThrowEffectEvent {
  overlayId: string;
  animationName: string;
  x: number; // tilemap coordinate (0-7)
  y: number; // tilemap coordinate (0-7)
  scale?: number;
  duration?: number; // Optional duration override
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
  playAnimation(
    entityId: string,
    animationName: string,
    loop = true,
    oneTime = false,
    scale?: number
  ) {
    const event: PlayAnimationEvent = {
      entityId,
      animationName,
      loop: oneTime ? false : loop,
      oneTime,
      scale,
    };
    this.emit('playAnimation', event);
  }

  // Convenience method for one-time animations
  playAnimationOneTime(
    entityId: string,
    animationName: string,
    scale?: number
  ) {
    this.playAnimation(entityId, animationName, false, true, scale);
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

  // Animation completion events
  animationComplete(entityId: string, animationName: string) {
    const event: AnimationCompleteEvent = {
      entityId,
      animationName,
    };
    this.emit('animationComplete', event);
  }

  onAnimationComplete(callback: (event: AnimationCompleteEvent) => void) {
    this.on('animationComplete', callback);
  }

  offAnimationComplete(callback: (event: AnimationCompleteEvent) => void) {
    this.off('animationComplete', callback);
  }

  // Throw effect API - plays animation at specific tile coordinates
  throwEffect(
    overlayId: string,
    animationName: string,
    x: number,
    y: number,
    scale?: number,
    duration?: number
  ) {
    // Checking the boundaries of the tilemap (0-7)
    if (x < 0 || x >= 8 || y < 0 || y >= 8) {
      console.warn(`Invalid tilemap coordinates: x=${x}, y=${y}. Must be 0-7.`);
      return;
    }

    const event: ThrowEffectEvent = {
      overlayId,
      animationName,
      x,
      y,
      scale,
      duration,
    };
    this.emit('throwEffect', event);
  }

  onThrowEffect(callback: (event: ThrowEffectEvent) => void) {
    this.on('throwEffect', callback);
  }

  offThrowEffect(callback: (event: ThrowEffectEvent) => void) {
    this.off('throwEffect', callback);
  }
}

export const gameEventEmitter = GameEventEmitter.getInstance();
