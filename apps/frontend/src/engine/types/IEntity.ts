export enum EntityType {
  BLUE_SQUARE = 'blue-square',
  RED_SQUARE = 'red-square',
  WIZARD = 'wizard',
  ARCHER = 'archer',
}

export interface IEntity {
  id: string;
  type: EntityType;
  tilemapPosition: {
    x: number;
    y: number;
  };
}
