export function Page3() {
  return (
    <div className="gap-7.5 mt-7.5 mr-10 flex flex-col">
      <div className="gap-7.5 flex flex-col">
        <div className="flex flex-col gap-4">
          <span className="font-pixel text-main-gray text-xl font-bold">
            5. Start Battle
          </span>
          <span className="font-pixel text-main-gray text-lg">
            At the start of the game, you&apos;ll have access to information
            about your opponent, including their character type and map. The
            game is played in turns, with each player taking actions
            sequentially. On your turn, you can perform the following actions:
          </span>
          <span className="font-pixel text-main-gray text-xl font-bold">
            Movement
          </span>
          <span className="font-pixel text-main-gray text-lg">
            Position your hero strategically on the map to gain advantages or
            evade attacks.
          </span>
          <span className="font-pixel text-main-gray text-xl font-bold">
            Casting Spells
          </span>
          <span className="font-pixel text-main-gray text-lg">
            Use your selected skills to cast powerful spells against your
            opponent. Each spell has its own range, effects, and cooldowns, so
            plan accordingly!
          </span>
        </div>
      </div>
    </div>
  );
}
