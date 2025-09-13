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
}

export interface AnimationPlayEvent {
  entityId: string;
  animationName: string;
  loop?: boolean;
}

export interface AnimationStopEvent {
  entityId: string;
}
