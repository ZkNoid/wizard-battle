import { allEffects } from "./effects";
import { allSpells } from "./spells";
import {
  Effect,
  MapStructure,
  Position,
  type Spell,
} from "./types/matchmaking.types";
import { allWizards } from "./wizards";

interface ICommittable {
  getCommit: () => string; // In general hash of included fields
}

export class Action implements ICommittable {
  spellId: string;
  position: Position;
  target: string;
  additionalData: any;
  constructor(
    spellId: string,
    position: Position,
    target: string,
    additionalData: any = null,
  ) {
    this.spellId = spellId;
    this.position = position;
    this.target = target;
    this.additionalData = additionalData;
  }

  getCommit() {
    // TODO: Implement
    return "ActionCommit";
  }
}

export class UserState implements ICommittable {
  playerId: string;
  wizardId: string;
  map: MapStructure; // All information about the map
  health: number; // How much health do wizard have
  skillsInfo: Spell[]; // Information about skills and its cooldowns
  position: Position;
  effects: Effect[];

  constructor(
    playerId: string,
    wizardId: string,
    map: MapStructure,
    health: number,
    skillsInfo: Spell[],
    position: Position,
    effects: Effect[],
  ) {
    this.playerId = playerId;
    this.wizardId = wizardId;
    this.map = map;
    this.health = health;
    this.skillsInfo = skillsInfo;
    this.position = position;
    this.effects = effects;
  }

  getCommit() {
    // TODO: Implement
    return "UserStateCommit";
  }
}

export type PublicState = Partial<UserState>;

class StateCommitData implements ICommittable {
  stateHash: string;
  actionHash: string;
  gameId: string;
  turn: number;

  constructor(
    stateHash: string,
    actionHash: string,
    gameId: string,
    turn: number,
  ) {
    this.stateHash = stateHash;
    this.actionHash = actionHash;
    this.gameId = gameId;
    this.turn = turn;
  }

  getCommit() {
    // TODO: Implement
    return "StateCommitDataCommit";
  }
}

class StateCommit {
  data: StateCommitData;
  signature: string;

  constructor(data: StateCommitData, signature: string) {
    this.data = data;
    this.signature = signature;
  }
}

class Signer {
  private privateKey: string;

  constructor(privateKey: string) {
    this.privateKey = privateKey;
  }

  sign(message: string) {
    // TODO: Implement
    return "signed";
  }
}

// Stater is a class that is used to store the state of the user. Each user has its own Stater instance.
// It applies actions to update the state, create state commits and store state history for final reveal
export class Stater extends Signer {
  stateHistory: UserState[] = [];
  gameId: string;
  turn: number;

  constructor(initialState: UserState, gameId: string) {
    const pk = "SomePrivateKey"; // TODO: Get session private key
    super(pk);
    this.stateHistory = [initialState];
    this.gameId = gameId;
    this.turn = 0;
  }

  applyActions(actions: Action[]) {
    // let newState = structuredClone(
    //   this.stateHistory[this.stateHistory.length - 1]
    // );
    // TODO: Make copy of object
    let publicState = this.getPublicState();
    let newState = this.stateHistory[this.stateHistory.length - 1];

    if (!newState) {
      throw new Error("No state found");
    }

    newState = new UserState(
      newState.playerId,
      newState.wizardId,
      newState.map,
      newState.health,
      newState.skillsInfo,
      newState.position,
      newState.effects,
    );

    newState.position = new Position(newState.position.x, newState.position.y);

    console.log("actions", actions);
    for (const action of actions) {
      // Apply action to the state
      const spell = allSpells.find((s) => s.id === action.spellId);
      if (spell) {
        console.log("newState", newState);
        spell.effect2(
          newState,
          publicState,
          newState.effects,
          action.position,
          action.additionalData,
        );
      }
    }

    for (const effect of newState.effects) {
      const effectInfo = allEffects.find((e) => e.effectId === effect.effectId);
      if (effectInfo) {
        effectInfo.apply(newState, publicState);
      }
    }

    this.stateHistory.push(newState);

    return {
      commit: this.getCurrentCommit(actions),
      publicState,
    };
  }

  getCurrentState() {
    return this.stateHistory[this.stateHistory.length - 1];
  }

  getCurrentPosition() {
    const currentState = this.getCurrentState();
    if (!currentState) {
      throw new Error("No state found");
    }
    return currentState.position;
  }

  getCurrentCommit(lastAppliedActions: Action[]) {
    const stateCommit =
      this.stateHistory[this.stateHistory.length - 1]?.getCommit();
    const actionsCommit = calculateActionsCommit(lastAppliedActions);
    const commitData = new StateCommitData(
      stateCommit!,
      actionsCommit,
      this.gameId,
      this.turn,
    );
    const signature = this.sign(commitData.getCommit());
    return new StateCommit(commitData, signature);
  }

  getStateHistory() {
    return this.stateHistory;
  }

  getPublicState(): PublicState {
    const currentState = this.stateHistory[this.stateHistory.length - 1];

    let wizard = allWizards.find((w) => w.id === currentState!.wizardId);
    if (!wizard) {
      throw new Error("Wizard not found");
    }

    const result: any = {};
    for (const field of wizard.publicFields!) {
      result[field] = (currentState as any)[field];
    }

    result["playerId"] = currentState!.playerId;
    result["wizardId"] = currentState!.wizardId;
    return result;
  }
}
function calculateActionsCommit(lastAppliedActions: Action[]): string {
  // TODO: Implement
  return lastAppliedActions.map((action) => action.spellId).join(",");
}
