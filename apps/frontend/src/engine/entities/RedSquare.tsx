import type { IEntity } from '../types/IEntity';

export function RedSquare({ entity }: { entity: IEntity }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-md border-2 border-red-700 bg-red-500 text-xs font-bold text-white shadow-lg">
      YOU
    </div>
  );
}
