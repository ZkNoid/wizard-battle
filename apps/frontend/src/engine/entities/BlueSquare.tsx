import type { IEntity } from '../types/IEntity';

export function BlueSquare({ entity }: { entity: IEntity }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-md border-2 border-blue-700 bg-blue-500 text-xs font-bold text-white shadow-lg">
      ENEMY
    </div>
  );
}
