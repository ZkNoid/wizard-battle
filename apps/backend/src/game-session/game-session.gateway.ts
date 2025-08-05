import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { MatchmakingService } from '../matchmaking/matchmaking.service';

@WebSocketGateway({
    cors: { origin: '*' },
    adapter: (() => {
        const pubClient = createClient({ url: 'redis://localhost:6379' });
        const subClient = pubClient.duplicate();
        pubClient.on('error', err => console.error('Redis Pub Client Error', err));
        subClient.on('error', err => console.error('Redis Sub Client Error', err));
        pubClient.on('connect', () => console.log('Redis Pub Client Connected'));
        subClient.on('connect', () => console.log('Redis Sub Client Connected'));
        Promise.all([pubClient.connect(), subClient.connect()]).catch(err => console.error('Redis Connection Error', err));
        return createAdapter(pubClient, subClient);
    })(),
})
export class GameSessionGateway {
    @WebSocketServer()
    server!: Server;

    constructor(private readonly matchmakingService: MatchmakingService) { }

    afterInit() {
        console.log('WebSocket Gateway initialized');
        this.matchmakingService.setServer(this.server);
    }

    handleConnection(socket: Socket) {
        console.log(`Client connected: ${socket.id}, Process ID: ${process.pid}`);
    }

    handleDisconnect(socket: Socket) {
        console.log(`Client disconnected: ${socket.id}`);
        this.matchmakingService.leaveMatchmaking(socket);
    }

    @SubscribeMessage('joinMatchmaking')
    async handleJoinMatchmaking(socket: Socket, data: { level: number }) {
        return await this.matchmakingService.joinMatchmaking(socket, data.level);
    }

    @SubscribeMessage('gameMessage')
    async handleGameMessage(socket: Socket, data: { roomId: string; message: any }) {
        const match = await this.matchmakingService.getMatchInfo(data.roomId);
        if (match && this.server) {
            console.log(`Broadcasting gameMessage to room ${data.roomId}: ${JSON.stringify(data.message)}`);
            this.server.to(data.roomId).emit('gameMessage', {
                roomId: data.roomId,
                sender: socket.id,
                message: data.message,
            });
        } else {
            console.error(`Failed to broadcast gameMessage: match=${!!match}, server=${!!this.server}, roomId=${data.roomId}`);
        }
    }
}