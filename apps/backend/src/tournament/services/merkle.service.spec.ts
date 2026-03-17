import { Test, TestingModule } from '@nestjs/testing';
import { MerkleService } from './merkle.service.js';
import { MerkleMap, Field, PublicKey } from 'o1js';
import { TournamentDocument, TournamentStatus } from '../schemas/tournament.schema.js';

describe('MerkleService', () => {
  let service: MerkleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MerkleService],
    }).compile();

    service = module.get<MerkleService>(MerkleService);
  });

  describe('buildParticipantsMap', () => {
    it('should build empty map for no participants', () => {
      const map = service.buildParticipantsMap(new Map());
      const emptyMap = new MerkleMap();
      expect(map.getRoot().toString()).toBe(emptyMap.getRoot().toString());
    });

    it('should build map from Map object', () => {
      const participants = new Map<string, boolean>([
        ['B62qiy32p8kAKnny8ZFwoMhYpBppM1DWVCqAPBYNcXnsAHhnfAAuXgg', true],
        ['B62qjSytpSK7aEauBprjXDSZwc9ai4YMv9tpmXLQK14Fn8W1tZiJvmB', true],
      ]);

      const map = service.buildParticipantsMap(participants);

      expect(map.getRoot().toString()).not.toBe(new MerkleMap().getRoot().toString());
    });

    it('should build map from plain object', () => {
      const participants = {
        'B62qiy32p8kAKnny8ZFwoMhYpBppM1DWVCqAPBYNcXnsAHhnfAAuXgg': true,
      };

      const map = service.buildParticipantsMap(participants);

      const pubKey = PublicKey.fromBase58(
        'B62qiy32p8kAKnny8ZFwoMhYpBppM1DWVCqAPBYNcXnsAHhnfAAuXgg'
      );
      const key = MerkleService.keyForPublicKey(pubKey);
      const value = map.get(key);

      expect(value.toString()).toBe('1');
    });
  });

  describe('verifyParticipantNotRegistered', () => {
    it('should return true for unregistered participant', () => {
      const participants = new Map<string, boolean>([
        ['B62qiy32p8kAKnny8ZFwoMhYpBppM1DWVCqAPBYNcXnsAHhnfAAuXgg', true],
      ]);
      const map = service.buildParticipantsMap(participants);

      const result = service.verifyParticipantNotRegistered(
        map,
        'B62qjSytpSK7aEauBprjXDSZwc9ai4YMv9tpmXLQK14Fn8W1tZiJvmB'
      );

      expect(result).toBe(true);
    });

    it('should return false for registered participant', () => {
      const participants = new Map<string, boolean>([
        ['B62qiy32p8kAKnny8ZFwoMhYpBppM1DWVCqAPBYNcXnsAHhnfAAuXgg', true],
      ]);
      const map = service.buildParticipantsMap(participants);

      const result = service.verifyParticipantNotRegistered(
        map,
        'B62qiy32p8kAKnny8ZFwoMhYpBppM1DWVCqAPBYNcXnsAHhnfAAuXgg'
      );

      expect(result).toBe(false);
    });
  });

  describe('computeNewParticipantsRoot', () => {
    it('should compute new root after adding participant', () => {
      const map = service.buildParticipantsMap(new Map());
      const initialRoot = map.getRoot().toString();

      const { newRoot, witness } = service.computeNewParticipantsRoot(
        map,
        'B62qiy32p8kAKnny8ZFwoMhYpBppM1DWVCqAPBYNcXnsAHhnfAAuXgg'
      );

      expect(newRoot.toString()).not.toBe(initialRoot);
      expect(witness).toBeDefined();
    });
  });

  describe('keyFor', () => {
    it('should generate consistent keys', () => {
      const id = Field(123);
      const key1 = MerkleService.keyFor(id);
      const key2 = MerkleService.keyFor(id);

      expect(key1.toString()).toBe(key2.toString());
    });

    it('should generate different keys for different ids', () => {
      const key1 = MerkleService.keyFor(Field(1));
      const key2 = MerkleService.keyFor(Field(2));

      expect(key1.toString()).not.toBe(key2.toString());
    });
  });

  describe('keyForPublicKey', () => {
    it('should generate consistent keys for public keys', () => {
      const pubKey = PublicKey.fromBase58(
        'B62qiy32p8kAKnny8ZFwoMhYpBppM1DWVCqAPBYNcXnsAHhnfAAuXgg'
      );
      const key1 = MerkleService.keyForPublicKey(pubKey);
      const key2 = MerkleService.keyForPublicKey(pubKey);

      expect(key1.toString()).toBe(key2.toString());
    });
  });
});
