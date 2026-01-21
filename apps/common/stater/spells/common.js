"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allCommonSpells = exports.MoveModifier = exports.MoveCast = exports.MoveSpellCast = exports.MoveData = void 0;
const o1js_1 = require("o1js");
const structs_1 = require("../structs");
const wizards_1 = require("../../wizards");
class MoveData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.MoveData = MoveData;
class MoveSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: MoveData,
}) {
    hash() {
        return o1js_1.Poseidon.hash([
            this.caster,
            this.spellId,
            this.target,
            this.additionalData.position.hash(),
        ]);
    }
}
exports.MoveSpellCast = MoveSpellCast;
const MoveCast = (state, caster, target, position) => {
    return new MoveSpellCast({
        spellId: o1js_1.CircuitString.fromString('Move').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.MoveCast = MoveCast;
const MoveModifier = (stater, spellCast, opponentState) => {
    console.log('MoveModifier', stater.state, spellCast);
    // Fix rehydration
    console.log(stater.state.playerStats.position.value.x);
    stater.state.playerStats.position = new structs_1.PositionOption({
        value: spellCast.additionalData.position,
        isSome: (0, o1js_1.Field)(1),
    });
    console.log(stater.state.playerStats.position.value.x);
};
exports.MoveModifier = MoveModifier;
exports.allCommonSpells = [
    {
        id: o1js_1.CircuitString.fromString('Move').hash(),
        wizardId: wizards_1.WizardId.COMMON,
        cooldown: (0, o1js_1.Field)(1),
        name: 'Move',
        description: 'Move to a new position',
        image: '/wizards/skills/1.svg',
        modifierData: MoveData,
        modifier: exports.MoveModifier,
        spellCast: MoveSpellCast,
        cast: exports.MoveCast,
        target: 'ally',
        priority: 1,
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('Move').hash(),
            cooldown: o1js_1.Int64.from(1),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
];
