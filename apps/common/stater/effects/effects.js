"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EffectsId = exports.allEffectsInfo = void 0;
const o1js_1 = require("o1js");
const structs_1 = require("../structs");
const invisibleEffect = {
    id: (0, o1js_1.Field)(1),
    name: 'Invisible',
    apply: (state, publicState, param) => {
        console.log('Applying invisible effect');
        publicState.playerStats.position = new structs_1.PositionOption({
            value: new structs_1.Position({
                x: o1js_1.Int64.from(0),
                y: o1js_1.Int64.from(0),
            }),
            isSome: (0, o1js_1.Field)(0),
        });
    },
};
const bleedingEffect = {
    id: o1js_1.CircuitString.fromString('Bleeding').hash(),
    name: 'Bleeding',
    apply: (state, publicState, param) => {
        console.log('Applying bleeding effect');
        state.playerStats.hp = state.playerStats.hp.sub(o1js_1.Int64.from(20));
    },
};
const slowingRestorationEffect = {
    id: o1js_1.CircuitString.fromString('SlowingRestoration').hash(),
    name: 'SlowingRestoration',
    apply: (state, publicState, param) => {
        console.log('Applying slowing restoration effect');
        state.playerStats.speed = state.playerStats.speed.add(o1js_1.Int64.from(1));
    },
};
const slowingEffect = {
    id: o1js_1.CircuitString.fromString('Slowing').hash(),
    name: 'Slowing',
    apply: (state, publicState, param) => {
        console.log('Applying slowing effect');
        state.playerStats.speed = state.playerStats.speed.sub(o1js_1.Int64.from(1));
    },
};
const decoyEffect = {
    id: o1js_1.CircuitString.fromString('Decoy').hash(),
    name: 'Decoy',
    apply: (state, publicState, param) => {
        console.log('Applying decoy effect');
        // Change to provable
        let number = +param;
        let x = number % 8;
        let y = Math.floor(number / 8);
        console.log('Decoy position', x, y);
        publicState.playerStats.position = new structs_1.PositionOption({
            value: new structs_1.Position({
                x: o1js_1.Int64.from(x),
                y: o1js_1.Int64.from(y),
            }),
            isSome: (0, o1js_1.Field)(1),
        });
    },
};
const cloudEffect = {
    id: o1js_1.CircuitString.fromString('Cloud').hash(),
    name: 'Cloud',
    apply: (state, publicState, param) => {
        console.log('Applying cloud effect');
        let number = +param;
        let x = number % 8;
        let y = Math.floor(number / 8);
        let cloudCenter = new structs_1.Position({
            x: o1js_1.Int64.from(x),
            y: o1js_1.Int64.from(y),
        });
        const emptyPosition = new structs_1.PositionOption({
            value: new structs_1.Position({
                x: o1js_1.Int64.from(0),
                y: o1js_1.Int64.from(0),
            }),
            isSome: (0, o1js_1.Field)(0),
        });
        const inCloud = state.playerStats.position.value
            .manhattanDistance(cloudCenter)
            .lessThanOrEqual(o1js_1.UInt64.from(2));
        publicState.playerStats.position = o1js_1.Provable.if(inCloud, structs_1.PositionOption, emptyPosition, publicState.playerStats.position);
    },
};
// Reverse of SpectralProjectionModifier - transforms melee skills back to ranged:
// - Shadow Strike → Spectral Arrow
// - Shadow Dash → Dusk's Embrace
// - Whirling Blades → Phantom Echo
const spectralProjectionReturnEffect = {
    id: o1js_1.CircuitString.fromString('SpectralProjectionReturn').hash(),
    name: 'SpectralProjectionReturn',
    apply: (state, publicState, param) => {
        console.log('Applying SpectralProjectionReturn effect');
        const spectralArrowId = o1js_1.CircuitString.fromString('SpectralArrow').hash();
        const shadowStrikeId = o1js_1.CircuitString.fromString('ShadowStrike').hash();
        const dusksEmbraceId = o1js_1.CircuitString.fromString('DusksEmbrace').hash();
        const shadowDashId = o1js_1.CircuitString.fromString('ShadowDash').hash();
        const phantomEchoId = o1js_1.CircuitString.fromString('PhantomEcho').hash();
        const whirlingBladesId = o1js_1.CircuitString.fromString('WhirlingBlades').hash();
        // Transform skills back in a provable way using Provable.switch
        for (let i = 0; i < state.spellStats.length; i++) {
            const currentSpellId = state.spellStats[i].spellId;
            // Check each condition for reverse transformation
            const isShadowStrike = currentSpellId.equals(shadowStrikeId);
            const isShadowDash = currentSpellId.equals(shadowDashId);
            const isWhirlingBlades = currentSpellId.equals(whirlingBladesId);
            const isOther = isShadowStrike
                .or(isShadowDash)
                .or(isWhirlingBlades)
                .not();
            // Use Provable.switch to select the original spell ID
            const finalSpellId = o1js_1.Provable.switch([isShadowStrike, isShadowDash, isWhirlingBlades, isOther], o1js_1.Field, [spectralArrowId, dusksEmbraceId, phantomEchoId, currentSpellId]);
            state.spellStats[i].spellId = finalSpellId;
        }
    },
};
exports.allEffectsInfo = [
    invisibleEffect,
    bleedingEffect,
    decoyEffect,
    cloudEffect,
    slowingRestorationEffect,
    slowingEffect,
    spectralProjectionReturnEffect,
];
const EffectsId = {};
exports.EffectsId = EffectsId;
exports.allEffectsInfo.forEach((effect) => {
    EffectsId[effect.name] = effect.id;
});
