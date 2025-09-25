import { EventEmitter } from 'events';
export interface MoveEntityEvent {
    entityId: string;
    x: number;
    y: number;
}
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
export interface ThrowEffectEvent {
    overlayId: string;
    animationName: string;
    x: number;
    y: number;
    scale?: number;
    duration?: number;
}
export declare class GameEventEmitter extends EventEmitter {
    private static instance;
    private constructor();
    static getInstance(): GameEventEmitter;
    move(entityId: string, x: number, y: number): void;
    onMove(callback: (event: MoveEntityEvent) => void): void;
    offMove(callback: (event: MoveEntityEvent) => void): void;
    playAnimation(entityId: string, animationName: string, loop?: boolean, oneTime?: boolean, scale?: number): void;
    playAnimationOneTime(entityId: string, animationName: string, scale?: number): void;
    stopAnimation(entityId: string): void;
    onPlayAnimation(callback: (event: PlayAnimationEvent) => void): void;
    offPlayAnimation(callback: (event: PlayAnimationEvent) => void): void;
    onStopAnimation(callback: (event: StopAnimationEvent) => void): void;
    offStopAnimation(callback: (event: StopAnimationEvent) => void): void;
    animationComplete(entityId: string, animationName: string): void;
    onAnimationComplete(callback: (event: AnimationCompleteEvent) => void): void;
    offAnimationComplete(callback: (event: AnimationCompleteEvent) => void): void;
    throwEffect(overlayId: string, animationName: string, x: number, y: number, scale?: number, duration?: number): void;
    onThrowEffect(callback: (event: ThrowEffectEvent) => void): void;
    offThrowEffect(callback: (event: ThrowEffectEvent) => void): void;
}
export declare const gameEventEmitter: GameEventEmitter;
//# sourceMappingURL=gameEventEmitter.d.ts.map