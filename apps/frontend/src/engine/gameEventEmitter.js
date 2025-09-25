import { EventEmitter } from 'events';
export class GameEventEmitter extends EventEmitter {
    constructor() {
        super();
    }
    static getInstance() {
        if (!GameEventEmitter.instance) {
            GameEventEmitter.instance = new GameEventEmitter();
        }
        return GameEventEmitter.instance;
    }
    // Simple API for movement on the tilemap
    move(entityId, x, y) {
        // Checking the boundaries of the tilemap (0-7)
        if (x < 0 || x >= 8 || y < 0 || y >= 8) {
            console.warn(`Invalid tilemap coordinates: x=${x}, y=${y}. Must be 0-7.`);
            return;
        }
        const event = {
            entityId,
            x,
            y,
        };
        this.emit('move', event);
    }
    onMove(callback) {
        this.on('move', callback);
    }
    offMove(callback) {
        this.off('move', callback);
    }
    // Simple API for animations
    playAnimation(entityId, animationName, loop = true, oneTime = false, scale) {
        const event = {
            entityId,
            animationName,
            loop: oneTime ? false : loop,
            oneTime,
            scale,
        };
        this.emit('playAnimation', event);
    }
    // Convenience method for one-time animations
    playAnimationOneTime(entityId, animationName, scale) {
        this.playAnimation(entityId, animationName, false, true, scale);
    }
    stopAnimation(entityId) {
        const event = {
            entityId,
        };
        this.emit('stopAnimation', event);
    }
    onPlayAnimation(callback) {
        this.on('playAnimation', callback);
    }
    offPlayAnimation(callback) {
        this.off('playAnimation', callback);
    }
    onStopAnimation(callback) {
        this.on('stopAnimation', callback);
    }
    offStopAnimation(callback) {
        this.off('stopAnimation', callback);
    }
    // Animation completion events
    animationComplete(entityId, animationName) {
        const event = {
            entityId,
            animationName,
        };
        this.emit('animationComplete', event);
    }
    onAnimationComplete(callback) {
        this.on('animationComplete', callback);
    }
    offAnimationComplete(callback) {
        this.off('animationComplete', callback);
    }
    // Throw effect API - plays animation at specific tile coordinates
    throwEffect(overlayId, animationName, x, y, scale, duration) {
        // Checking the boundaries of the tilemap (0-7)
        if (x < 0 || x >= 8 || y < 0 || y >= 8) {
            console.warn(`Invalid tilemap coordinates: x=${x}, y=${y}. Must be 0-7.`);
            return;
        }
        const event = {
            overlayId,
            animationName,
            x,
            y,
            scale,
            duration,
        };
        this.emit('throwEffect', event);
    }
    onThrowEffect(callback) {
        this.on('throwEffect', callback);
    }
    offThrowEffect(callback) {
        this.off('throwEffect', callback);
    }
}
export const gameEventEmitter = GameEventEmitter.getInstance();
//# sourceMappingURL=gameEventEmitter.js.map