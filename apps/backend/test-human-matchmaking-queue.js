/**
 * @title Human Matchmaking Queue Test
 * @notice Spawns up to 10 human players, enqueues them, and verifies pairing into separate rooms
 * @dev Uses Socket.IO to hit the backend gateway `joinMatchmaking` entrypoint.
 */

const { io } = require('socket.io-client');

// Minimal Field-like mock to match gateway's expected structure in test runs
class Field {
  constructor(value) {
    this.value = value;
  }
}

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3030';
const PLAYER_COUNT = Math.min(
  parseInt(process.env.PLAYER_COUNT || '10', 10),
  10
);
const CONNECT_TIMEOUT_MS = 8000;
const MATCH_TIMEOUT_MS = parseInt(process.env.MATCH_TIMEOUT_MS || '60000', 10);
const CLEANUP_TIMEOUT_MS = 3000;
const RETURN_COUNT = Math.max(
  0,
  Math.min(parseInt(process.env.RETURN_COUNT || '4', 10), 10)
); // even number recommended
const RETURN_SAME_ROOM = true; // enforce re-join to the same room

console.log('🧪 Starting Human Matchmaking Queue Test...');
console.log(`🌐 Server: ${SERVER_URL}`);
console.log(`👥 Players to enqueue: ${PLAYER_COUNT}`);

const players = []; // { id, socket, addAck, matched, roomId, opponentId }
const roomIdToPlayers = new Map();
const playerIdToRoom = new Map();
const initialPlayerRoom = new Map(); // snapshot of first matching

function createPlayerId(i) {
  return `hmq_player_${i}_${Date.now()}`;
}

function buildAddToQueue(socketId, playerId) {
  const playerSetup = {
    socketId,
    playerId,
    // fields: HP=100, pos x=1..N, pos y=1..N
    fields: [new Field(100), new Field(1), new Field(1)],
  };
  return {
    playerId,
    playerSetup,
    nonce: Date.now(),
    signature: `test_signature_${playerId}_${Date.now()}`,
    setupProof: `test_proof_${playerId}_${Date.now()}`,
  };
}

async function connectPlayers() {
  console.log('🔌 Connecting players...');
  await Promise.all(
    Array.from(
      { length: PLAYER_COUNT },
      (_, i) =>
        new Promise((resolve, reject) => {
          const id = createPlayerId(i + 1);
          const socket = io(SERVER_URL, {
            transports: ['websocket'],
            auth: { playerId: id },
          });

          const timeout = setTimeout(
            () => reject(new Error(`Connection timeout for ${id}`)),
            CONNECT_TIMEOUT_MS
          );

          socket.on('connect', () => {
            clearTimeout(timeout);
            console.log(`✅ Connected ${id} (${socket.id})`);
            players.push({
              id,
              socket,
              addAck: false,
              matched: false,
              roomId: null,
              opponentId: null,
            });

            // Register listeners per-player
            socket.on('addtoqueue', (resp) => {
              console.log(`📥 addtoqueue ${id}:`, resp?.success);
              const p = players.find((x) => x.id === id);
              if (p) p.addAck = !!resp?.success;
            });

            socket.on('matchFound', (payload) => {
              // Expect: { roomId, opponentId, opponentSetups: [...] }
              const p = players.find((x) => x.id === id);
              if (!p) return;
              p.matched = true;
              p.roomId = payload?.roomId || null;
              p.opponentId = payload?.opponentId || null;
              if (p.roomId) {
                if (!roomIdToPlayers.has(p.roomId))
                  roomIdToPlayers.set(p.roomId, new Set());
                roomIdToPlayers.get(p.roomId).add(p.id);
                playerIdToRoom.set(p.id, p.roomId);
              }
              console.log(
                `🎯 matchFound for ${id}: room=${p.roomId}, opponent=${p.opponentId}`
              );
            });

            resolve();
          });

          socket.on('connect_error', (err) => {
            clearTimeout(timeout);
            console.error(`❌ connect_error for ${id}:`, err?.message || err);
            reject(err);
          });
        })
    )
  );
}

async function enqueueAll() {
  console.log('📤 Enqueuing all players via joinMatchmaking...');
  for (const p of players) {
    const addToQueue = buildAddToQueue(p.socket.id, p.id);
    p.socket.emit('joinMatchmaking', { addToQueue });
  }

  // Wait a bit for addtoqueue acknowledgements
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

async function waitForMatches() {
  console.log('⏳ Waiting for matchFound events...');
  const start = Date.now();

  // We'll wait until either: all possible pairs matched, or timeout
  // With PLAYER_COUNT = N, expectedPairs = Math.floor(N/2)
  const expectedPairs = Math.floor(PLAYER_COUNT / 2);

  while (Date.now() - start < MATCH_TIMEOUT_MS) {
    // Count rooms with exactly 2 players
    let completeRooms = 0;
    for (const set of roomIdToPlayers.values()) {
      if (set.size >= 2) completeRooms++;
    }

    if (completeRooms >= expectedPairs) {
      console.log(
        `✅ Reached expected pairs: ${completeRooms}/${expectedPairs}`
      );
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  console.warn('⚠️ Timeout waiting for expected pairs');
}

function validateMatches() {
  console.log('\n🧾 Validating matches...');
  const expectedPairs = Math.floor(PLAYER_COUNT / 2);

  // 1) No player should be in multiple rooms
  const multiRoomPlayers = players.filter(
    (p) =>
      p.matched &&
      p.id &&
      playerIdToRoom.get(p.id) !== players.find((x) => x.id === p.id)?.roomId
  );
  if (multiRoomPlayers.length > 0) {
    console.log(
      '❌ Players matched into multiple rooms:',
      multiRoomPlayers.map((p) => p.id)
    );
  }

  // 2) Each room should contain at most 2 players from this batch
  const roomIssues = [];
  for (const [roomId, set] of roomIdToPlayers) {
    if (set.size > 2) roomIssues.push({ roomId, size: set.size });
  }
  if (roomIssues.length > 0) {
    console.log('❌ Rooms with more than 2 players detected:', roomIssues);
  }

  // 3) Total complete rooms should be expectedPairs
  const completeRooms = Array.from(roomIdToPlayers.values()).filter(
    (s) => s.size >= 2
  ).length;
  if (completeRooms !== expectedPairs) {
    console.log(
      `⚠️ Expected ${expectedPairs} complete rooms, got ${completeRooms}`
    );
  }

  // 4) Every matched player's opponent should be one of our players
  const unknownOpponents = players
    .filter(
      (p) =>
        p.matched && p.opponentId && !players.some((x) => x.id === p.opponentId)
    )
    .map((p) => ({ id: p.id, opponentId: p.opponentId }));
  if (unknownOpponents.length > 0) {
    console.log('⚠️ Opponents outside this batch:', unknownOpponents);
  }

  // Report summary
  const matchedCount = players.filter((p) => p.matched).length;
  console.log('—'.repeat(60));
  console.log('📊 MATCH SUMMARY');
  console.log(`Players matched: ${matchedCount}/${PLAYER_COUNT}`);
  console.log(`Rooms formed: ${completeRooms}`);
  console.log('Rooms:');
  for (const [roomId, set] of roomIdToPlayers) {
    console.log(`  ${roomId}: ${Array.from(set).join(', ')}`);
  }
  console.log('—'.repeat(60));

  const pass =
    multiRoomPlayers.length === 0 &&
    roomIssues.length === 0 &&
    completeRooms === expectedPairs &&
    matchedCount >= expectedPairs * 2;

  if (pass) {
    console.log(
      '🎉 PASS: All players were paired into distinct rooms correctly'
    );
  } else {
    console.log('💥 FAIL: Matchmaking pairing did not meet expectations');
  }

  return pass;
}

async function disconnectAndReconnectSelectedPlayers() {
  if (RETURN_COUNT < 2) return [];
  // Prefer selecting two players from the same complete room to test rejoin
  let selected = [];
  for (const [roomId, set] of roomIdToPlayers) {
    if (set.size >= 2) {
      selected = Array.from(set).slice(0, Math.min(RETURN_COUNT, 2));
      console.log(
        `\n🔁 Requeue scenario: disconnecting players from room ${roomId}:`,
        selected.join(', ')
      );
      break;
    }
  }
  if (selected.length === 0) {
    selected = players.slice(0, Math.min(RETURN_COUNT, 2)).map((p) => p.id);
    console.log(
      `\n🔁 Requeue scenario: disconnecting ${selected.length} players:`,
      selected.join(', ')
    );
  }

  // Save initial room mapping for later comparison
  for (const p of players) {
    if (p.roomId) initialPlayerRoom.set(p.id, p.roomId);
  }

  // Disconnect selected players
  for (const pid of selected) {
    const p = players.find((x) => x.id === pid);
    try {
      p.socket?.disconnect();
    } catch {}
  }

  // Small wait for backend cleanup
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Reconnect sockets for same player IDs
  for (const pid of selected) {
    await new Promise((resolve, reject) => {
      const socket = io(SERVER_URL, {
        transports: ['websocket'],
        auth: { playerId: pid },
      });
      const timeout = setTimeout(
        () => reject(new Error(`Reconnect timeout for ${pid}`)),
        CONNECT_TIMEOUT_MS
      );

      socket.on('connect', () => {
        clearTimeout(timeout);
        console.log(`✅ Reconnected ${pid} (${socket.id})`);
        const p = players.find((x) => x.id === pid);
        p.socket = socket;
        p.addAck = false;
        p.matched = false;
        p.roomId = null;
        p.opponentId = null;

        socket.on('addtoqueue', (resp) => {
          const pp = players.find((x) => x.id === pid);
          if (pp) pp.addAck = !!resp?.success;
        });

        socket.on('matchFound', (payload) => {
          const pp = players.find((x) => x.id === pid);
          if (!pp) return;
          pp.matched = true;
          pp.roomId = payload?.roomId || null;
          pp.opponentId = payload?.opponentId || null;
          if (pp.roomId) {
            if (!roomIdToPlayers.has(pp.roomId))
              roomIdToPlayers.set(pp.roomId, new Set());
            roomIdToPlayers.get(pp.roomId).add(pp.id);
            playerIdToRoom.set(pp.id, pp.roomId);
          }
          console.log(
            `🎯 (requeue) matchFound for ${pid}: room=${pp.roomId}, opponent=${pp.opponentId}`
          );
        });

        resolve();
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        console.error(
          `❌ reconnect connect_error for ${pid}:`,
          err?.message || err
        );
        reject(err);
      });
    });
  }

  return selected;
}

async function reenqueueSelectedPlayers(selectedIds) {
  console.log('📤 Re-enqueuing selected players...');
  for (const pid of selectedIds) {
    const p = players.find((x) => x.id === pid);
    const addToQueue = buildAddToQueue(p.socket.id, p.id);
    p.socket.emit('joinMatchmaking', { addToQueue });
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function waitForRematches(expectedRematchPairs, expectSameRoomIds) {
  console.log('⏳ Waiting for re-joins...');
  const start = Date.now();
  while (Date.now() - start < MATCH_TIMEOUT_MS) {
    if (
      RETURN_SAME_ROOM &&
      Array.isArray(expectSameRoomIds) &&
      expectSameRoomIds.length >= 1
    ) {
      const allBack = expectSameRoomIds.every((pid) => {
        const p = players.find((x) => x.id === pid);
        return (
          p?.matched && p.roomId && p.roomId === initialPlayerRoom.get(pid)
        );
      });
      if (allBack) {
        console.log('✅ Selected players re-joined their original room');
        return true;
      }
    } else {
      // Legacy different-room matching
      const reMatched = players.filter(
        (p) =>
          initialPlayerRoom.has(p.id) &&
          p.matched &&
          p.roomId &&
          p.roomId !== initialPlayerRoom.get(p.id)
      );
      const rePairs = Math.floor(reMatched.length / 2);
      if (rePairs >= expectedRematchPairs) {
        console.log(
          `✅ Re-matched pairs reached: ${rePairs}/${expectedRematchPairs}`
        );
        return true;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  console.warn('⚠️ Timeout waiting for re-joins');
  return false;
}

function validateRejoinsSameRoom(selectedIds) {
  console.log('\n🧾 Validating re-join to same room...');
  const issues = [];
  for (const pid of selectedIds) {
    const p = players.find((x) => x.id === pid);
    const beforeRoom = initialPlayerRoom.get(pid) || null;
    const afterRoom = p.roomId || null;
    if (!afterRoom || beforeRoom !== afterRoom) {
      issues.push({ pid, beforeRoom, afterRoom });
    }
  }
  if (issues.length > 0) {
    console.log('❌ Re-join validation issues:', issues);
    return false;
  }
  console.log('🎉 PASS: Disconnected players re-joined their original room');
  return true;
}

async function cleanup() {
  console.log('🧹 Cleaning up sockets...');
  for (const p of players) {
    try {
      p.socket?.disconnect();
    } catch {}
  }
  await new Promise((resolve) => setTimeout(resolve, CLEANUP_TIMEOUT_MS));
}

async function main() {
  try {
    await connectPlayers();
    await enqueueAll();
    await waitForMatches();
    const ok = validateMatches();
    // Requeue scenario (optional if RETURN_COUNT >= 2)
    let ok2 = true;
    if (RETURN_COUNT >= 2) {
      const selected = await disconnectAndReconnectSelectedPlayers();
      await reenqueueSelectedPlayers(selected);
      const gotRejoins = await waitForRematches(
        Math.floor(selected.length / 2),
        selected
      );
      ok2 = gotRejoins && validateRejoinsSameRoom(selected);
    }
    await cleanup();
    process.exit(ok && ok2 ? 0 : 1);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    await cleanup();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Interrupted');
  await cleanup();
  process.exit(1);
});

console.log('⏳ Connecting to server and enqueuing players...');
main();
