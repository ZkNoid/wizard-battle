import { Int64, Poseidon, Provable, Struct, UInt64, CircuitString } from "o1js";
import { Stater } from "../stater";
import { Position, SpellCast } from "../structs";

export class LightningBoldData extends Struct({
  position: Position,
}) {}

export const LightningBold = (
  state: Stater,
  spellCast: SpellCast<LightningBoldData>,
) => {
  const selfPosition = state.state.playerStats.position;
  const targetPosition = spellCast.additionalData.position;

  const distance = selfPosition.manhattanDistance(targetPosition);

  const damage = Int64.from(100);
  const damage2 = Int64.from(50);

  const directHit = distance.lessThan(UInt64.from(1));
  const nearbyHit = distance.lessThan(UInt64.from(2));
  const distantHit = directHit.not().and(nearbyHit.not());

  const damageToApply = Provable.switch(
    [directHit, nearbyHit, distantHit],
    Int64,
    [damage, damage2, Int64.from(0)],
  );

  state.state.playerStats.hp = state.state.playerStats.hp.sub(damageToApply);
};

export class FireBallData extends Struct({
  position: Position,
}) {}

export const FireBall = (state: Stater, spellCast: SpellCast<FireBallData>) => {
  const selfPosition = state.state.playerStats.position;
  const targetPosition = spellCast.additionalData.position;

  const distance = selfPosition.manhattanDistance(targetPosition);

  const damage = Int64.from(60);
  const damage2 = Int64.from(40);
  const damage3 = Int64.from(20);

  const directHit = distance.lessThan(UInt64.from(1));
  const nearbyHit = distance.lessThan(UInt64.from(2));
  const farHit = distance.lessThan(UInt64.from(3));
  const distantHit = directHit.not().and(nearbyHit.not()).and(farHit.not());

  const damageToApply = Provable.switch(
    [directHit, nearbyHit, farHit, distantHit],
    Int64,
    [damage, damage2, damage3, Int64.from(0)],
  );

  state.state.playerStats.hp = state.state.playerStats.hp.sub(damageToApply);
};

export class LaserData extends Struct({
  position: Position,
}) {}

export const Laser = (state: Stater, spellCast: SpellCast<LaserData>) => {
  const selfPosition = state.state.playerStats.position;
  const targetPosition = spellCast.additionalData.position;

  const sameRow = selfPosition.x.equals(targetPosition.x);
  const sameColumn = selfPosition.y.equals(targetPosition.y);
  const hit = sameRow.or(sameColumn);

  const damage = Int64.from(50);

  const damageToApply = Provable.switch([hit], Int64, [damage]);

  state.state.playerStats.hp = state.state.playerStats.hp.sub(damageToApply);
};

export class TeleportData extends Struct({
  position: Position,
}) {}

export const Teleport = (state: Stater, spellCast: SpellCast<TeleportData>) => {
  state.state.playerStats.position = spellCast.additionalData.position;
};

export class HealData extends Struct({}) {}

export const Heal = (state: Stater, spellCast: SpellCast<HealData>) => {
  state.state.playerStats.hp = state.state.playerStats.hp.add(Int64.from(100));
};

export const mageSpells = [
  {
    id: CircuitString.fromString("LightningBold").hash(),
    modifyer: LightningBold,
  },
  {
    id: CircuitString.fromString("FireBall").hash(),
    modifyer: FireBall,
  },
  {
    id: CircuitString.fromString("Teleport").hash(),
    modifyer: Teleport,
  },
  {
    id: CircuitString.fromString("Heal").hash(),
    modifyer: Heal,
  },
];
