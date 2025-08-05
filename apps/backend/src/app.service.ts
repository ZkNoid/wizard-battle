import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { GameStateService } from './game-session/game-state.service';
import { MatchmakingService } from './matchmaking/matchmaking.service';

@Injectable()
export class AppService implements OnModuleDestroy {
    constructor(
        private readonly gameStateService: GameStateService,
        private readonly matchmakingService: MatchmakingService
    ) {}

    getHello(): string {
        return 'Hello World!';
    }

    async onModuleDestroy() {
        console.log('Shutting down application...');
        
        // Cleanup Redis connections and instance data
        try {
            await this.gameStateService.disconnect();
            await this.matchmakingService.disconnect();
            console.log('Successfully cleaned up Redis connections');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}
