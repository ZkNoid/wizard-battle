"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformedGameTurn = exports.TransformedGameEnd = exports.TransformedDead = exports.TransformedUpdateUserStates = exports.TransformedTrustedState = exports.TransformedUserActions = exports.TransformedUserAction = exports.GamePhase = void 0;
/**
 * @notice Enumeration of the 5 phases in each game turn
 * @dev Each phase has specific timing and player interactions
 * SPELL_CASTING: Players submit their intended actions
 * SPELL_PROPAGATION: Server broadcasts all actions to all players
 * SPELL_EFFECTS: Players apply actions locally and compute new state
 * END_OF_ROUND: Players submit their computed trusted states
 * STATE_UPDATE: Server broadcasts all states for opponent updates
 */
var GamePhase;
(function (GamePhase) {
    GamePhase["SPELL_CASTING"] = "spell_casting";
    GamePhase["SPELL_PROPAGATION"] = "spell_propagation";
    GamePhase["SPELL_EFFECTS"] = "spell_effects";
    GamePhase["END_OF_ROUND"] = "end_of_round";
    GamePhase["STATE_UPDATE"] = "state_update";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
/*//////////////////////////////////////////////////////////////
                        TRANSFORMED CLASSES
//////////////////////////////////////////////////////////////*/
class TransformedUserAction {
    constructor(caster, playerId, spellId, spellCastInfo) {
        this.caster = caster;
        this.playerId = playerId;
        this.spellId = spellId;
        this.spellCastInfo = spellCastInfo;
    }
}
exports.TransformedUserAction = TransformedUserAction;
class TransformedUserActions {
    constructor(actions, signature) {
        this.actions = actions;
        this.signature = signature;
    }
}
exports.TransformedUserActions = TransformedUserActions;
class TransformedTrustedState {
    constructor(playerId, stateCommit, publicState, signature) {
        this.playerId = playerId;
        this.stateCommit = stateCommit;
        this.publicState = publicState;
        this.signature = signature;
    }
}
exports.TransformedTrustedState = TransformedTrustedState;
class TransformedUpdateUserStates {
    constructor(states) {
        this.states = states;
    }
}
exports.TransformedUpdateUserStates = TransformedUpdateUserStates;
class TransformedDead {
    constructor(playerId) {
        this.playerId = playerId;
    }
}
exports.TransformedDead = TransformedDead;
class TransformedGameEnd {
    constructor(winnerId) {
        this.winnerId = winnerId;
    }
}
exports.TransformedGameEnd = TransformedGameEnd;
class TransformedGameTurn {
    constructor(turnId, phase, timeRemaining, playersReady) {
        this.turnId = turnId;
        this.phase = phase;
        this.timeRemaining = timeRemaining;
        this.playersReady = playersReady;
    }
}
exports.TransformedGameTurn = TransformedGameTurn;
