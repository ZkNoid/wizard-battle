# 5-Phase Turn-Based Gameplay System

## Overview

This document describes the implementation of the 5-phase turn-based gameplay system for Wizard Battle. The system ensures fair, synchronized gameplay across multiple players with cryptographic security and anti-cheat protection.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Redis         │
│ GamePhaseManager│◄──►│ GameSessionGW   │◄──►│ Multi-Instance  │
│ + Stater        │    │ + GameStateServ │    │ State Storage   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Phase Flow Diagram

```
Turn N                    Turn N+1
┌──────────────────────────────────────────────────────────────┐
│ Phase 1: SPELL_CASTING                                       │
│ ├─ Players submit actions via submitActions()                │
│ ├─ Server stores actions and tracks readiness                │
│ └─ When all ready → Phase 2                                  │
├──────────────────────────────────────────────────────────────┤
│ Phase 2: SPELL_PROPAGATION                                   │
│ ├─ Server broadcasts all actions via allPlayerActions        │
│ ├─ Players receive complete action information               │
│ └─ Auto-advance after 1s → Phase 3                          │
├──────────────────────────────────────────────────────────────┤
│ Phase 3: SPELL_EFFECTS                                       │
│ ├─ Server signals applySpellEffects                         │
│ ├─ Players apply effects locally using Stater               │
│ ├─ Players generate cryptographic trusted states            │
│ └─ Auto-transition → Phase 4                                │
├──────────────────────────────────────────────────────────────┤
│ Phase 4: END_OF_ROUND                                        │
│ ├─ Players submit trusted states via submitTrustedState()   │
│ ├─ Server collects and validates states                     │
│ └─ When all ready → Phase 5                                 │
├──────────────────────────────────────────────────────────────┤
│ Phase 5: STATE_UPDATE                                        │
│ ├─ Server broadcasts all states via updateUserStates        │
│ ├─ Players update opponent information                      │
│ ├─ Auto-advance after 2s → New Turn                         │
│ └─ Clear turn data, increment counter                       │
└──────────────────────────────────────────────────────────────┘
```

## Detailed Phase Descriptions

### Phase 1: SPELL_CASTING
**Duration**: Until all players submit (with timeout)
**Player Action**: Select and submit spells to cast
**Server Action**: Collect and store all player actions

```typescript
// Client submits actions
gamePhaseManager.submitPlayerActions({
  actions: [
    { playerId: "player1", spellId: "fireball", spellCastInfo: { target: "player2" } }
  ],
  signature: "crypto_signature"
});

// Server processes
@SubscribeMessage('submitActions')
async handleSubmitActions(socket: Socket, data: { roomId: string; actions: IUserActions }) {
  // Store actions and check if all players ready
  await this.gameStateService.storePlayerActions(roomId, playerId, actions);
  const allReady = await this.gameStateService.markPlayerReady(roomId, playerId);
  if (allReady) await this.advanceToSpellPropagation(roomId);
}
```

### Phase 2: SPELL_PROPAGATION
**Duration**: 1 second (automatic)
**Player Action**: Receive and process all player actions
**Server Action**: Broadcast all actions to all players

```typescript
// Server broadcasts all actions
private async advanceToSpellPropagation(roomId: string) {
  const allActions = await this.gameStateService.getAllPlayerActions(roomId);
  this.server.to(roomId).emit('allPlayerActions', allActions);
  // Auto-advance after 1s
  setTimeout(() => this.advanceToSpellEffects(roomId), 1000);
}

// Client receives actions
socket.on('allPlayerActions', (allActions) => {
  // Store for local processing
  this.lastActions = allActions[this.getPlayerId()];
});
```

### Phase 3: SPELL_EFFECTS
**Duration**: Client-controlled (automatic processing)
**Player Action**: Apply spell effects locally using Stater
**Server Action**: Signal clients to begin processing

```typescript
// Server signals effect application
private async advanceToSpellEffects(roomId: string) {
  this.server.to(roomId).emit('applySpellEffects');
}

// Client applies effects and generates trusted state
socket.on('applySpellEffects', () => {
  // Apply all spell effects using Stater
  const newState = this.stater.applyActions(allReceivedActions);
  
  // Generate cryptographic commitment
  const trustedState = this.stater.generateTrustedState(playerId, actions);
  
  // Auto-submit to server
  socket.emit('submitTrustedState', { roomId, trustedState });
});
```

### Phase 4: END_OF_ROUND
**Duration**: Until all players submit trusted states
**Player Action**: Submit cryptographically verified state
**Server Action**: Collect and validate trusted states

```typescript
// Client submits trusted state (automatic from Phase 3)
socket.emit('submitTrustedState', {
  roomId: "game-room",
  trustedState: {
    playerId: "player1",
    stateCommit: "zk_commitment_hash",
    publicState: { hp: 75, position: { x: 10, y: 5 } },
    signature: "validity_proof"
  }
});

// Server processes trusted states
@SubscribeMessage('submitTrustedState')
async handleSubmitTrustedState(socket: Socket, data) {
  await this.gameStateService.storeTrustedState(roomId, playerId, trustedState);
  const allReady = await this.gameStateService.markPlayerReady(roomId, playerId);
  if (allReady) await this.advanceToStateUpdate(roomId);
}
```

### Phase 5: STATE_UPDATE
**Duration**: 2 seconds (automatic)
**Player Action**: Update opponent information
**Server Action**: Broadcast all trusted states

```typescript
// Server broadcasts all states
private async advanceToStateUpdate(roomId: string) {
  const trustedStates = await this.gameStateService.getAllTrustedStates(roomId);
  this.server.to(roomId).emit('updateUserStates', { states: trustedStates });
  // Start new turn after 2s
  setTimeout(() => this.startNextTurn(roomId), 2000);
}

// Client updates opponent data
socket.on('updateUserStates', (data) => {
  for (const state of data.states) {
    if (state.playerId !== this.getPlayerId()) {
      this.updateOpponentState(state); // Update opponent HP, position, effects
    }
  }
});
```

## Data Structures

### IUserActions
```typescript
interface IUserActions<T = any> {
  actions: IUserAction<T>[]; // Array of spells to cast
  signature: any;            // Cryptographic signature
}

interface IUserAction<T = any> {
  playerId: string;    // Who is casting
  spellId: string;     // What spell
  spellCastInfo: T;    // Spell-specific data (target, position, etc.)
}
```

### ITrustedState
```typescript
interface ITrustedState {
  playerId: string;        // Player identifier
  stateCommit: string;     // ZK commitment to private state
  publicState: IPublicState; // Visible information for opponents
  signature: any;          // Proof of validity
}
```

### GameState (Server-side)
```typescript
interface GameState {
  roomId: string;
  players: Array<{
    id: string;
    isAlive: boolean;
    currentActions?: IUserActions;    // Phase 1 data
    trustedState?: ITrustedState;     // Phase 4 data
  }>;
  turn: number;                       // Current turn number
  currentPhase: GamePhase;            // Current phase
  phaseStartTime: number;             // For timeout handling
  playersReady: string[];             // Phase completion tracking
  status: 'waiting' | 'active' | 'finished';
}
```

## Anti-Cheat & Security

### Cryptographic Verification
- **State Commitments**: Players cannot fake HP, position, or effects
- **Action Signatures**: Prevents action tampering or replay attacks  
- **Zero-Knowledge Proofs**: Server validates without seeing private data
- **Deterministic Processing**: Same actions always produce same results

### Server Authority
- **Phase Orchestration**: Server controls phase transitions and timing
- **Action Broadcasting**: Server ensures all players receive same data
- **Win Condition**: Server determines game end and winner
- **State Validation**: Server can reject invalid trusted states

### Multi-Instance Support
- **Redis State Storage**: Game state persists across server restarts
- **Cross-Instance Events**: Actions broadcast to all server instances
- **Socket Mapping**: Tracks which instance manages each connection
- **Consistent Timing**: Phase transitions synchronized across instances

## Error Handling

### Client-Side
- **Phase Validation**: Actions rejected if submitted in wrong phase
- **Connection Loss**: Reconnection and state recovery
- **Invalid Actions**: Graceful handling of malformed data

### Server-Side  
- **Timeout Handling**: Auto-advance phases if players don't respond
- **Player Disconnection**: Mark as dead and continue game
- **State Corruption**: Rollback and recovery mechanisms
- **Instance Failure**: Redis persistence enables recovery

## Performance Considerations

### Optimization Strategies
- **Parallel Processing**: Multiple tool calls for information gathering
- **Redis Pipelining**: Batch database operations
- **Event Batching**: Group related WebSocket events
- **State Compression**: Minimize network payload sizes

### Scalability Features
- **Horizontal Scaling**: Multiple server instances via Redis
- **Load Balancing**: Distribute players across instances
- **Database Sharding**: Partition games across Redis instances
- **CDN Integration**: Static assets served from edge locations

## Testing & Validation

### Test Coverage
- **Unit Tests**: Individual phase handlers and state management
- **Integration Tests**: Full 5-phase cycles with multiple players
- **Load Tests**: Multiple concurrent games and players
- **Security Tests**: Cryptographic verification and anti-cheat

### Test Scripts
```bash
# Run unit tests
npm run test

# Run integration tests  
npm run test:single-instance
npm run test:multi-instance
npm run test:gameplay

# Run all tests
npm run test:all-integration
```

## Monitoring & Debugging

### Logging
- **Phase Transitions**: Track timing and player readiness
- **Error Events**: Detailed error information and stack traces  
- **Performance Metrics**: Phase duration and player response times
- **Security Events**: Invalid actions and potential cheating attempts

### Debug Tools
- **Game State Inspector**: View current game state in Redis
- **Phase Timeline**: Track phase transitions and timing
- **Player Actions**: Inspect submitted actions and trusted states
- **Network Events**: Monitor WebSocket message flow

## Future Enhancements

### Planned Features
- **Spectator Mode**: Allow observers to watch games in progress
- **Replay System**: Record and playback complete games
- **Tournament Mode**: Bracket-style multiplayer competitions  
- **Advanced Analytics**: Player statistics and game balance metrics

### Technical Improvements
- **State Compression**: Reduce network bandwidth usage
- **Predictive Loading**: Pre-load next turn data
- **Dynamic Timeouts**: Adjust phase timing based on game complexity
- **Advanced Cryptography**: Enhanced zero-knowledge proof systems
