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
  loop?: boolean; // Optional loop parameter for animation
  effectId: string; // Auto-generated effect ID
}

// Type for removing effects by ID
export interface RemoveEffectEvent {
  effectId: string;
  overlayId?: string; // Optional overlayId to filter effects
}

// Parameters for throwEffect function
export interface ThrowEffectParams {
  overlayId: string;
  animationName: string;
  x: number; // tilemap coordinate (0-7)
  y: number; // tilemap coordinate (0-7)
  scale?: number;
  duration?: number; // Optional duration override
  loop?: boolean; // Optional loop parameter for animation
}

export class GameEventEmitter extends EventEmitter {
  private static instance: GameEventEmitter;
  private effectCounter = 0;

  private constructor() {
    super();
  }

  static getInstance(): GameEventEmitter {
    if (!GameEventEmitter.instance) {
      GameEventEmitter.instance = new GameEventEmitter();
    }
    return GameEventEmitter.instance;
  }

  // Generate unique effect ID
  private generateEffectId(): string {
    return `effect_${++this.effectCounter}_${Date.now()}`;
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
  throwEffect({
    overlayId,
    animationName,
    x,
    y,
    scale,
    duration,
    loop,
  }: ThrowEffectParams): string {
    // Checking the boundaries of the tilemap (0-7)
    if (x < 0 || x >= 8 || y < 0 || y >= 8) {
      console.warn(`Invalid tilemap coordinates: x=${x}, y=${y}. Must be 0-7.`);
      return '';
    }

    // Generate unique effect ID
    const effectId = this.generateEffectId();

    const event: ThrowEffectEvent = {
      overlayId,
      animationName,
      x,
      y,
      scale,
      duration,
      loop,
      effectId,
    };
    this.emit('throwEffect', event);

    return effectId;
  }

  onThrowEffect(callback: (event: ThrowEffectEvent) => void) {
    this.on('throwEffect', callback);
  }

  offThrowEffect(callback: (event: ThrowEffectEvent) => void) {
    this.off('throwEffect', callback);
  }

  // Remove effect API - removes effect by ID
  removeEffect(effectId: string, overlayId?: string) {
    const event: RemoveEffectEvent = {
      effectId,
      overlayId,
    };
    this.emit('removeEffect', event);
  }

  onRemoveEffect(callback: (event: RemoveEffectEvent) => void) {
    this.on('removeEffect', callback);
  }

  offRemoveEffect(callback: (event: RemoveEffectEvent) => void) {
    this.off('removeEffect', callback);
  }
}

export const gameEventEmitter = GameEventEmitter.getInstance();
