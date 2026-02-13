import { CircuitString, Field, Int64, Provable, UInt64 } from 'o1js';
import { State } from '../state';
import { Position, PositionOption } from '../structs';

export interface IEffectInfo {
  id: Field;
  name: string;

  apply: (state: State, publicState: State, param: Field) => void;
}

const invisibleEffect: IEffectInfo = {
  id: Field(1),
  name: 'Invisible',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying invisible effect');
    publicState.playerStats.position = new PositionOption({
      value: new Position({
        x: Int64.from(0),
        y: Int64.from(0),
      }),
      isSome: Field(0),
    });
  },
};

const shadowVeilInvisibleEffect: IEffectInfo = {
  id: CircuitString.fromString('ShadowVeilInvisible').hash(),
  name: 'ShadowVeilInvisible',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying ShadowVeilInvisible effect');
    publicState.playerStats.position = new PositionOption({
      value: new Position({
        x: Int64.from(0),
        y: Int64.from(0),
      }),
      isSome: Field(0),
    });
  },
};

const bleedingEffect: IEffectInfo = {
  id: CircuitString.fromString('Bleeding').hash(),
  name: 'Bleeding',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying bleeding effect');
    state.playerStats.hp = state.playerStats.hp.sub(Int64.from(20));
  },
};

const slowingRestorationEffect: IEffectInfo = {
  id: CircuitString.fromString('SlowingRestoration').hash(),
  name: 'SlowingRestoration',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying slowing restoration effect');
    state.playerStats.speed = state.playerStats.speed.add(Int64.from(1));
  },
};

const slowingEffect: IEffectInfo = {
  id: CircuitString.fromString('Slowing').hash(),
  name: 'Slowing',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying slowing effect');
    state.playerStats.speed = state.playerStats.speed.sub(Int64.from(1));
  },
};

const decoyEffect: IEffectInfo = {
  id: CircuitString.fromString('Decoy').hash(),
  name: 'Decoy',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying decoy effect');
    // Change to provable
    let number = +param;
    let x = number % 8;
    let y = Math.floor(number / 8);
    console.log('Decoy position', x, y);
    publicState.playerStats.position = new PositionOption({
      value: new Position({
        x: Int64.from(x),
        y: Int64.from(y),
      }),
      isSome: Field(1),
    });
  },
};

const cloudEffect: IEffectInfo = {
  id: CircuitString.fromString('Cloud').hash(),
  name: 'Cloud',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying cloud effect');
    let number = +param;
    let x = number % 8;
    let y = Math.floor(number / 8);
    let cloudCenter = new Position({
      x: Int64.from(x),
      y: Int64.from(y),
    });

    const emptyPosition = new PositionOption({
      value: new Position({
        x: Int64.from(0),
        y: Int64.from(0),
      }),
      isSome: Field(0),
    });

    const inCloud = state.playerStats.position.value
      .manhattanDistance(cloudCenter)
      .lessThanOrEqual(UInt64.from(2));

    publicState.playerStats.position = Provable.if(
      inCloud,
      PositionOption,
      emptyPosition,
      publicState.playerStats.position
    );
  },
};

const weakenEffect: IEffectInfo = {
  id: CircuitString.fromString('Weaken').hash(),
  name: 'Weaken',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying weaken effect');
    // -30% defense - reduce defense by 30 (based on base defense of 100)
    state.playerStats.defense = state.playerStats.defense.sub(UInt64.from(30));
  },
};

const weakenRestorationEffect: IEffectInfo = {
  id: CircuitString.fromString('WeakenRestoration').hash(),
  name: 'WeakenRestoration',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying weaken restoration effect');
    // Restore +30 defense
    state.playerStats.defense = state.playerStats.defense.add(UInt64.from(30));
  },
};

const revealedEffect: IEffectInfo = {
  id: CircuitString.fromString('Revealed').hash(),
  name: 'Revealed',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying revealed effect');
    // Force to show current position
    publicState.playerStats.position = new PositionOption({
      value: state.playerStats.position.value,
      isSome: Field(1),
    });
  },
};

const vulnerableEffect: IEffectInfo = {
  id: CircuitString.fromString('Vulnerable').hash(),
  name: 'Vulnerable',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying vulnerable effect');
    // Receive +50% damage - reduce defense by 50 (based on base defense of 100)
    state.playerStats.defense = state.playerStats.defense.sub(UInt64.from(50));
  },
};

const vulnerableRestorationEffect: IEffectInfo = {
  id: CircuitString.fromString('VulnerableRestoration').hash(),
  name: 'VulnerableRestoration',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying vulnerable restoration effect');
    // Restore +50 defense
    state.playerStats.defense = state.playerStats.defense.add(UInt64.from(50));
  },
};

const immobilizeEffect: IEffectInfo = {
  id: CircuitString.fromString('Immobilize').hash(),
  name: 'Immobilize',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying immobilize effect');
    // Cannot move - reduce speed by 1 (to 0)
    state.playerStats.speed = state.playerStats.speed.sub(Int64.from(1));
  },
};

const immobilizeRestorationEffect: IEffectInfo = {
  id: CircuitString.fromString('ImmobilizeRestoration').hash(),
  name: 'ImmobilizeRestoration',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying immobilize restoration effect');
    // Restore speed by 1
    state.playerStats.speed = state.playerStats.speed.add(Int64.from(1));
  },
};

// Reverse of SpectralProjectionModifier - transforms melee skills back to ranged:
// - Shadow Strike → Spectral Arrow
// - Shadow Dash → Dusk's Embrace
// - Whirling Blades → Phantom Echo
const spectralProjectionReturnEffect: IEffectInfo = {
  id: CircuitString.fromString('SpectralProjectionReturn').hash(),
  name: 'SpectralProjectionReturn',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying SpectralProjectionReturn effect');

    const spectralArrowId = CircuitString.fromString('SpectralArrow').hash();
    const shadowStrikeId = CircuitString.fromString('ShadowStrike').hash();
    const dusksEmbraceId = CircuitString.fromString('DusksEmbrace').hash();
    const shadowDashId = CircuitString.fromString('ShadowDash').hash();
    const phantomEchoId = CircuitString.fromString('PhantomEcho').hash();
    const whirlingBladesId = CircuitString.fromString('WhirlingBlades').hash();

    // Transform skills back in a provable way using Provable.switch
    for (let i = 0; i < state.spellStats.length; i++) {
      const currentSpellId = state.spellStats[i]!.spellId;

      // Check each condition for reverse transformation
      const isShadowStrike = currentSpellId.equals(shadowStrikeId);
      const isShadowDash = currentSpellId.equals(shadowDashId);
      const isWhirlingBlades = currentSpellId.equals(whirlingBladesId);
      const isOther = isShadowStrike
        .or(isShadowDash)
        .or(isWhirlingBlades)
        .not();

      // Use Provable.switch to select the original spell ID
      const finalSpellId = Provable.switch(
        [isShadowStrike, isShadowDash, isWhirlingBlades, isOther],
        Field,
        [spectralArrowId, dusksEmbraceId, phantomEchoId, currentSpellId]
      );

      state.spellStats[i]!.spellId = finalSpellId;
    }
  },
};

export const allEffectsInfo: IEffectInfo[] = [
  invisibleEffect,
  shadowVeilInvisibleEffect,
  bleedingEffect,
  decoyEffect,
  cloudEffect,
  slowingRestorationEffect,
  slowingEffect,
  weakenEffect,
  weakenRestorationEffect,
  revealedEffect,
  vulnerableEffect,
  vulnerableRestorationEffect,
  immobilizeEffect,
  immobilizeRestorationEffect,
  spectralProjectionReturnEffect,
];

const EffectsId: Record<string, Field> = {};

allEffectsInfo.forEach((effect) => {
  EffectsId[effect.name] = effect.id;
});

export { EffectsId };
