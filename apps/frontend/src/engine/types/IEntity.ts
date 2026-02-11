export enum EntityType {
  BLUE_SQUARE = 'blue-square',
  RED_SQUARE = 'red-square',
  WIZARD = 'wizard',
  ARCHER = 'archer',
  PHANTOM_DUELIST = 'phantom-duelist',
  SPECTRAL_PHANTOM_DUELIST = 'spectral-phantom-duelist',
  DECOY = 'decoy',
}

export interface IEntity {
  id: string;
  type: EntityType;
  tilemapPosition: {
    x: number;
    y: number;
  };
  /**
   * If set, this entity will mirror animations from the entity with this ID.
   * Used for spectral projections that follow the original entity's animations.
   */
  mirrorEntityId?: string;
}
