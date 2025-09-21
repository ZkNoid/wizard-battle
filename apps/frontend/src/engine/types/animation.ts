export interface SpriteFrame {
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  duration: number;
  spriteSourceSize?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  sourceSize?: {
    w: number;
    h: number;
  };
}

export interface SpritesheetData {
  frames: Record<string, SpriteFrame>;
  meta: {
    image: string;
    size: {
      w: number;
      h: number;
    };
  };
}

export interface Animation {
  name: string;
  frames: SpriteFrame[];
  loop: boolean;
  totalDuration: number;
  oneTime?: boolean;
  scale?: number;
}

export interface AnimationPlayEvent {
  entityId: string;
  animationName: string;
  loop?: boolean;
}

export interface AnimationStopEvent {
  entityId: string;
}

// Animation configuration for entities
export interface AnimationConfig {
  name: string;
  spritesheetJson: string;
  spritesheetImage: string;
  loop?: boolean;
  scale?: number;
}

// Throw effect event for playing animations at specific tile coordinates
export interface ThrowEffectEvent {
  x: number; // tilemap coordinate (0-7)
  y: number; // tilemap coordinate (0-7)
  animationName: string;
  scale?: number;
  duration?: number; // Optional duration override
}
