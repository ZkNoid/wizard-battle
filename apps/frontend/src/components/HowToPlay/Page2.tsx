'use client';

import { Button } from '../shared/Button';

export function Page2() {
  return (
    <div className="gap-7.5 mt-7.5 flex flex-col">
      <div className="gap-7.5 flex flex-col">
        <div className="flex flex-col gap-4">
          <span className="font-pixel text-main-gray text-xl font-bold">
            3. Create a Map
          </span>
          <div className="flex flex-row gap-5">
            <span className="font-pixel text-main-gray text-lg">
              Choose an arena map for your battle. You will need to place terain
              features on your map that will offers different strategic
              advantages. Think carefully about how the environment will affect
              your tactics.
            </span>
            {/* Map tile previews */}
            <div className="gap-7.5 flex flex-row items-center">
              {['Lakes', 'Mountains', 'Meadows'].map((title, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center gap-1"
                >
                  <div className="border-main-gray border-3 h-20 w-20" />
                  <span className="font-pixel text-main-gray text-xs">
                    {title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <span className="font-pixel text-main-gray text-xl font-bold">
            4. Find an opponent
          </span>
          <span className="font-pixel text-main-gray text-lg">
            Join the matchmaking queue to find an opponent with a similar
            experience level or choose to play against a bot.
          </span>
        </div>
        <div className="flex flex-row items-center gap-2">
          <Button
            text="Play"
            variant="gray"
            onClick={() => {}}
            className="h-15 w-90"
          />
          <span className="font-pixel text-main-gray text-xl">→</span>
          <Button
            text="Start matchmaking"
            variant="gray"
            onClick={() => {}}
            className="h-15 w-90"
          />
        </div>
      </div>
    </div>
  );
}
