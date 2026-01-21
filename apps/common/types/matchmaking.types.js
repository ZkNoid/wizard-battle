"use strict";
// import { Socket } from "socket.io-client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformedFoundMatch = exports.TransformedUpdateQueue = exports.TransformedRemoveFromQueue = exports.TransformedAddToQueueResponse = exports.TransformedAddToQueue = exports.TransformedPlayerSetup = exports.TransformedMap = exports.TransformedSpell = exports.TileTypeNew = void 0;
/*//////////////////////////////////////////////////////////////
                          NEW TYPES
//////////////////////////////////////////////////////////////*/
// New
var TileTypeNew;
(function (TileTypeNew) {
    TileTypeNew[TileTypeNew["Wood"] = 0] = "Wood";
    TileTypeNew[TileTypeNew["Water"] = 1] = "Water";
    TileTypeNew[TileTypeNew["Mountain"] = 2] = "Mountain";
})(TileTypeNew || (exports.TileTypeNew = TileTypeNew = {}));
/*//////////////////////////////////////////////////////////////
                              NEW CLASSES
    //////////////////////////////////////////////////////////////*/
class TransformedSpell {
    constructor(spellId, cooldown, active) {
        this.spellId = spellId;
        this.cooldown = cooldown;
        this.active = active;
    }
}
exports.TransformedSpell = TransformedSpell;
class TransformedMap {
    constructor(tiles) {
        this.tiles = tiles;
    }
}
exports.TransformedMap = TransformedMap;
class TransformedPlayerSetup {
    constructor(socketId, playerId, fields) {
        this.socketId = socketId;
        this.playerId = playerId;
        this.fields = fields;
    }
}
exports.TransformedPlayerSetup = TransformedPlayerSetup;
class TransformedAddToQueue {
    constructor(playerId, playerSetup, nonce, signature, setupProof) {
        this.playerId = playerId;
        this.playerSetup = playerSetup;
        this.nonce = nonce;
        this.signature = signature;
        this.setupProof = setupProof;
    }
}
exports.TransformedAddToQueue = TransformedAddToQueue;
class TransformedAddToQueueResponse {
    constructor(success, result) {
        this.success = success;
        this.result = result;
    }
}
exports.TransformedAddToQueueResponse = TransformedAddToQueueResponse;
class TransformedRemoveFromQueue {
    constructor(playerId, nonce, signature) {
        this.playerId = playerId;
        this.nonce = nonce;
        this.signature = signature;
    }
}
exports.TransformedRemoveFromQueue = TransformedRemoveFromQueue;
class TransformedUpdateQueue {
    constructor(playersAmount, estimatedTime) {
        this.playersAmount = playersAmount;
        this.estimatedTime = estimatedTime;
    }
}
exports.TransformedUpdateQueue = TransformedUpdateQueue;
class TransformedFoundMatch {
    constructor(roomId, opponentId, opponentSetup) {
        this.roomId = roomId;
        this.opponentId = opponentId;
        this.opponentSetup = opponentSetup;
    }
}
exports.TransformedFoundMatch = TransformedFoundMatch;
