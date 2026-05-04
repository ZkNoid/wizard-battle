import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { OperationStatus } from '../../schemas/pending-operation.schema.js';

export interface OperationEvent {
  operationId: string;
  tournamentId: string;
  status: OperationStatus;
  unsignedTxJson?: string;
  txHash?: string;
  error?: string;
  updatedAt: Date;
}

export interface OperationStreamData {
  status: string;
  unsignedTxJson?: string;
  txHash?: string;
  error?: string;
  updatedAt: string;
}

@Injectable()
export class OperationEventsService {
  private readonly logger = new Logger(OperationEventsService.name);
  private readonly operationUpdates$ = new Subject<OperationEvent>();

  emit(event: OperationEvent): void {
    this.logger.debug(
      `Emitting event for operation ${event.operationId}: ${event.status}`
    );
    this.operationUpdates$.next(event);
  }

  getOperationStream(operationId: string): Observable<OperationStreamData> {
    return this.operationUpdates$.pipe(
      filter((event) => event.operationId === operationId),
      map((event) => ({
        status: event.status,
        unsignedTxJson: event.unsignedTxJson,
        txHash: event.txHash,
        error: event.error,
        updatedAt: event.updatedAt.toISOString(),
      }))
    );
  }

  isTerminalStatus(status: OperationStatus): boolean {
    return [
      OperationStatus.Confirmed,
      OperationStatus.Failed,
    ].includes(status);
  }
}
