import { Injectable, Logger } from '@nestjs/common';
import { MerkleMap, Field, Poseidon, PublicKey, MerkleMapWitness, Bool, UInt64 } from 'o1js';
import { WinnerLeaf } from '../../../../mina-contracts/src/TournamentManager.js';
import { TournamentDocument, WinnerInfo } from '../schemas/tournament.schema.js';

export interface TournamentWitnessData {
  tournamentWitness: MerkleMapWitness;
  tournamentKey: Field;
}

export interface ParticipantWitnessData {
  participantWitness: MerkleMapWitness;
  participantKey: Field;
}

export interface WinnerWitnessData {
  winnerWitness: MerkleMapWitness;
  winnerKey: Field;
  winnerLeaf: WinnerLeaf;
}

@Injectable()
export class MerkleService {
  private readonly logger = new Logger(MerkleService.name);
  private readonly emptyRoot: string;

  constructor() {
    this.emptyRoot = new MerkleMap().getRoot().toString();
  }

  getEmptyRoot(): string {
    return this.emptyRoot;
  }

  static keyFor(tournamentId: Field): Field {
    return Poseidon.hash([tournamentId]);
  }

  static keyForPublicKey(pk: PublicKey): Field {
    return Poseidon.hash(pk.toFields());
  }

  buildTournamentsMap(tournaments: TournamentDocument[]): MerkleMap {
    const map = new MerkleMap();

    for (const tournament of tournaments) {
      const tournamentId = Field(tournament.tournamentId);
      const key = MerkleService.keyFor(tournamentId);
      const leafHash = this.computeTournamentLeafHash(tournament);
      map.set(key, leafHash);
    }

    return map;
  }

  buildParticipantsMap(
    participants: Map<string, boolean> | Record<string, boolean>
  ): MerkleMap {
    const map = new MerkleMap();

    const entries =
      participants instanceof Map
        ? Array.from(participants.entries())
        : Object.entries(participants);

    for (const [pubKeyStr, registered] of entries) {
      if (registered) {
        const pubKey = PublicKey.fromBase58(pubKeyStr);
        const key = MerkleService.keyForPublicKey(pubKey);
        map.set(key, Field(1));
      }
    }

    return map;
  }

  computeTournamentLeafHash(tournament: TournamentDocument): Field {
    const statusMap: Record<string, number> = {
      Created: 0,
      Registration: 1,
      Battle: 2,
      Claiming: 3,
    };

    const fields = [
      Field(statusMap[tournament.verified.status] ?? 0),
      Field(tournament.verified.registrationStartSlot),
      Field(tournament.verified.battleStartSlot),
      Field(tournament.verified.battleEndSlot),
      Field(BigInt(tournament.verified.ticketPrice)),
      Field(tournament.verified.prize1Percent),
      Field(tournament.verified.prize2Percent),
      Field(tournament.verified.prize3Percent),
      Field(tournament.verified.participantsRoot),
      Field(tournament.verified.winnersRoot),
      Field(BigInt(tournament.verified.prizePool)),
      Field(tournament.verified.participantCount),
    ];

    return Poseidon.hash(fields);
  }

  getTournamentWitness(
    tournamentsMap: MerkleMap,
    tournamentId: string
  ): TournamentWitnessData {
    const tournamentIdField = Field(tournamentId);
    const key = MerkleService.keyFor(tournamentIdField);
    const witness = tournamentsMap.getWitness(key);

    return {
      tournamentWitness: witness,
      tournamentKey: key,
    };
  }

  getParticipantWitness(
    participantsMap: MerkleMap,
    playerPubKey: string
  ): ParticipantWitnessData {
    const pubKey = PublicKey.fromBase58(playerPubKey);
    const key = MerkleService.keyForPublicKey(pubKey);
    const witness = participantsMap.getWitness(key);

    return {
      participantWitness: witness,
      participantKey: key,
    };
  }

  verifyTournamentWitness(
    witness: MerkleMapWitness,
    leafHash: Field,
    expectedRoot: string
  ): boolean {
    const [computedRoot] = witness.computeRootAndKey(leafHash);
    return computedRoot?.equals(Field(expectedRoot)).toBoolean() ?? false;
  }

  verifyParticipantNotRegistered(
    participantsMap: MerkleMap,
    playerPubKey: string
  ): boolean {
    const pubKey = PublicKey.fromBase58(playerPubKey);
    const key = MerkleService.keyForPublicKey(pubKey);
    const value = participantsMap.get(key);
    return value.equals(Field(0)).toBoolean();
  }

  computeNewParticipantsRoot(
    participantsMap: MerkleMap,
    playerPubKey: string
  ): { newRoot: Field; witness: MerkleMapWitness } {
    const pubKey = PublicKey.fromBase58(playerPubKey);
    const key = MerkleService.keyForPublicKey(pubKey);
    const witness = participantsMap.getWitness(key);

    participantsMap.set(key, Field(1));
    const newRoot = participantsMap.getRoot();

    return { newRoot, witness };
  }

  computeNewTournamentsRoot(
    tournamentsMap: MerkleMap,
    tournamentId: string,
    newLeafHash: Field
  ): { newRoot: Field; witness: MerkleMapWitness } {
    const tournamentIdField = Field(tournamentId);
    const key = MerkleService.keyFor(tournamentIdField);
    const witness = tournamentsMap.getWitness(key);

    tournamentsMap.set(key, newLeafHash);
    const newRoot = tournamentsMap.getRoot();

    return { newRoot, witness };
  }

  buildWinnersMap(
    winners: Map<string, WinnerInfo> | Record<string, WinnerInfo>
  ): MerkleMap {
    const map = new MerkleMap();

    const entries =
      winners instanceof Map
        ? Array.from(winners.entries())
        : Object.entries(winners);

    for (const [pubKeyStr, info] of entries) {
      const pubKey = PublicKey.fromBase58(pubKeyStr);
      const key = MerkleService.keyForPublicKey(pubKey);
      const leaf = new WinnerLeaf({
        prizeAmount: UInt64.from(BigInt(info.prizeAmount)),
        claimed: Bool(info.claimed),
      });
      map.set(key, leaf.hash());
    }

    return map;
  }

  getWinnerWitness(
    winnersMap: MerkleMap,
    playerPubKey: string,
    winnerInfo: WinnerInfo
  ): WinnerWitnessData {
    const pubKey = PublicKey.fromBase58(playerPubKey);
    const key = MerkleService.keyForPublicKey(pubKey);
    const witness = winnersMap.getWitness(key);
    const winnerLeaf = new WinnerLeaf({
      prizeAmount: UInt64.from(BigInt(winnerInfo.prizeAmount)),
      claimed: Bool(winnerInfo.claimed),
    });

    return { winnerWitness: witness, winnerKey: key, winnerLeaf };
  }
}
