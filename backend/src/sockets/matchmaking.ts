import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import {
  startGame,
  hit,
  stand,
  getHandValue,
  isBlackjack,
  createDeck,
  shuffle,
  Hand,
  GameOutcome,
} from '../services/blackjackService';
import { spin } from '../services/slotsService';
import { applyNeedsDecay } from '../services/needsService';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type GameType = 'blackjack' | 'slots';

interface QueueEntry {
  socketId: string;
  userId: string;
  nickname: string;
  bet: number;
}

interface RankedBlackjackRoom {
  player1: { socketId: string; userId: string; nickname: string; score: number; hand: Hand };
  player2: { socketId: string; userId: string; nickname: string; score: number; hand: Hand } | null;
  deck: ReturnType<typeof createDeck>;
  dealerHand: Hand;
  currentTurn: string; // userId
  roomId: string;
  isBot: boolean;
  bet: number;
}

interface RankedSlotsRoom {
  player1: { socketId: string; userId: string; nickname: string; virtualTokens: number };
  player2: { socketId: string; userId: string; nickname: string; virtualTokens: number } | null;
  roomId: string;
  isBot: boolean;
  round: number;
  bet: number;
}

// ────────────────────────────────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────────────────────────────────

const queues = new Map<GameType, QueueEntry[]>([
  ['blackjack', []],
  ['slots', []],
]);

const blackjackRooms = new Map<string, RankedBlackjackRoom>();
const slotsRooms = new Map<string, RankedSlotsRoom>();

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function verifyToken(token: string): { id: string; email: string; nickname: string } | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    return jwt.verify(token, secret) as { id: string; email: string; nickname: string };
  } catch {
    return null;
  }
}

function generateRoomId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Ranked Blackjack helpers
// ────────────────────────────────────────────────────────────────────────────

function broadcastBlackjackRoundState(io: Server, room: RankedBlackjackRoom) {
  io.to(room.roomId).emit('rankedBlackjackRound', {
    player1: { 
      nickname: room.player1.nickname, 
      score: room.player1.score, 
      handSize: room.player1.hand.length 
    },
    player2: room.player2
      ? { 
          nickname: room.player2.nickname, 
          score: room.player2.score, 
          handSize: room.player2.hand.length 
        }
      : null,
    dealerVisible: room.dealerHand[0],
    yourTurn: room.currentTurn,
  });
}

function startRankedBlackjackRound(
  io: Server,
  room: RankedBlackjackRoom
): void {
  const deck = shuffle(createDeck());
  room.deck = deck;

  const p1Hand: Hand = [deck.pop()!, deck.pop()!];
  const p2Hand: Hand = [deck.pop()!, deck.pop()!];
  room.dealerHand = [deck.pop()!, deck.pop()!];

  if (room.player1) room.player1.hand = p1Hand;
  if (room.player2) room.player2.hand = p2Hand;

  room.currentTurn = room.player1.userId;

  // Broadcast state to everyone in the room
  broadcastBlackjackRoundState(io, room);

  // Player 1 gets their hand
  io.to(room.player1.socketId).emit('yourHand', {
    hand: p1Hand,
    handValue: getHandValue(p1Hand),
  });

  if (room.player2) {
    io.to(room.player2.socketId).emit('yourHand', {
      hand: p2Hand,
      handValue: getHandValue(p2Hand),
    });
  }

  // If bot is player2, auto-play after 2s
  if (room.isBot) {
    setTimeout(() => {
      botPlayBlackjack(io, room);
    }, 2000);
  }
}

function botPlayBlackjack(io: Server, room: RankedBlackjackRoom): void {
  if (!room.player2) return;

  let botValue = getHandValue(room.player2.hand);

  // Simple bot strategy: hit until >= 17
  while (botValue < 17) {
    const card = room.deck.pop();
    if (!card) break;
    room.player2.hand.push(card);
    botValue = getHandValue(room.player2.hand);
  }

  resolveRankedBlackjackRound(io, room);
}

async function resolveRankedBlackjackRound(
  io: Server,
  room: RankedBlackjackRoom
): Promise<void> {
  // Dealer draws to 17
  while (getHandValue(room.dealerHand) < 17) {
    const card = room.deck.pop();
    if (!card) break;
    room.dealerHand.push(card);
  }

  const dealerValue = getHandValue(room.dealerHand);
  const p1Value = getHandValue(room.player1.hand);
  const p2Value = room.player2 ? getHandValue(room.player2.hand) : 0;

  // Determine round winners vs dealer
  const p1Busted = p1Value > 21;
  const p2Busted = p2Value > 21;
  const dealerBusted = dealerValue > 21;

  const p1WonDealer = !p1Busted && (dealerBusted || p1Value > dealerValue);
  const p2WonDealer = room.player2 && !p2Busted && (dealerBusted || p2Value > dealerValue);

  let p1Awarded = false;
  let p2Awarded = false;

  // Jeżeli obaj wygrali z krupierem, wygrywa ten z wyższą sumą kart
  if (p1WonDealer && p2WonDealer) {
    if (p1Value > p2Value) {
      p1Awarded = true;
    } else if (p2Value > p1Value) {
      p2Awarded = true;
    }
  } else if (p1WonDealer) {
    p1Awarded = true;
  } else if (p2WonDealer) {
    p2Awarded = true;
  }

  if (p1Awarded) room.player1.score++;
  if (p2Awarded && room.player2) room.player2.score++;

  io.to(room.roomId).emit('rankedBlackjackRoundResult', {
    player1: {
      nickname: room.player1.nickname,
      hand: room.player1.hand,
      handValue: p1Value,
      score: room.player1.score,
      wonRound: p1Awarded,
    },
    player2: room.player2
      ? {
          nickname: room.player2.nickname,
          hand: room.player2.hand,
          handValue: p2Value,
          score: room.player2.score,
          wonRound: p2Awarded,
        }
      : null,
    dealerHand: room.dealerHand,
    dealerValue,
  });

  // Check for match winner (first to 3 points, with overtime tie-break)
  const score1 = room.player1.score;
  const score2 = room.player2 ? room.player2.score : 0;

  let matchEnded = false;
  let winnerId = '';
  let loserId: string | undefined = undefined;

  if (score1 >= 3 || score2 >= 3) {
    if (score1 > score2) {
      matchEnded = true;
      winnerId = room.player1.userId;
      loserId = room.player2?.userId;
    } else if (score2 > score1) {
      matchEnded = true;
      winnerId = room.player2!.userId;
      loserId = room.player1.userId;
    }
    // Jeżeli jest remis (np. 3-3, 4-4), to gramy dogrywkę (matchEnded = false)
  }

  if (matchEnded) {
    await settleRankedMatch(io, room.roomId, winnerId, loserId, 'blackjack', blackjackRooms);
  } else {
    // Start next round after delay
    setTimeout(() => {
      startRankedBlackjackRound(io, room);
    }, 3000);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Ranked settlement
// ────────────────────────────────────────────────────────────────────────────

async function settleRankedMatch(
  io: Server,
  roomId: string,
  winnerId: string,
  loserId: string | undefined,
  gameType: string,
  rooms: Map<string, unknown>
): Promise<void> {
  const roomObj = rooms.get(roomId) as any;
  const bet = roomObj?.bet || 300;
  
  const WIN_REWARD = bet;
  const LOSS_PENALTY = Math.floor(bet / 2);

  try {
    await prisma.user.update({
      where: { id: winnerId },
      data: { tokens: { increment: WIN_REWARD } },
    });

    await prisma.playerStats.update({
      where: { userId: winnerId },
      data: { rankedWins: { increment: 1 }, gamesPlayed: { increment: 1 } },
    });

    if (loserId) {
      await prisma.user.update({
        where: { id: loserId },
        data: { tokens: { decrement: LOSS_PENALTY } },
      });

      await prisma.playerStats.update({
        where: { userId: loserId },
        data: { rankedLosses: { increment: 1 }, gamesPlayed: { increment: 1 } },
      });

      await applyNeedsDecay(loserId, 'ranked');
    }

    await applyNeedsDecay(winnerId, 'ranked');

    await prisma.matchHistory.create({
      data: {
        player1Id: winnerId,
        player2Id: loserId,
        gameType: `${gameType}_ranked`,
        winnerId,
        tokensDelta: WIN_REWARD,
      },
    });

    io.to(roomId).emit('matchResult', {
      winnerId,
      winReward: WIN_REWARD,
      lossPenalty: LOSS_PENALTY,
    });
  } catch (err) {
    console.error('Settle ranked match error:', err);
  } finally {
    rooms.delete(roomId);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Main setup
// ────────────────────────────────────────────────────────────────────────────

export function setupMatchmaking(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('joinQueue', async ({ gameType, token, bet }: { gameType: GameType; token: string; bet?: number }) => {
      const payload = verifyToken(token);
      if (!payload) {
        socket.emit('error', { message: 'Nieprawidłowy token autoryzacyjny' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { tokens: true, dollars: true }
      });

      if (!user) {
        socket.emit('error', { message: 'Użytkownik nie znaleziony' });
        return;
      }

      if (user.tokens < 0 || user.dollars < 0) {
        socket.emit('error', { message: 'Nie możesz grać z ujemnym stanem konta (długami)!' });
        return;
      }

      const chosenBet = bet && typeof bet === 'number' && bet > 0 ? bet : 300;

      if (user.tokens < chosenBet) {
        socket.emit('error', { message: `Nie masz wystarczająco dużo żetonów, aby zagrać za stawkę ${chosenBet}!` });
        return;
      }

      const queue = queues.get(gameType);
      if (!queue) {
        socket.emit('error', { message: 'Nieznany typ gry' });
        return;
      }

      // Remove from any existing queue
      for (const [, q] of queues) {
        const idx = q.findIndex((e) => e.userId === payload.id);
        if (idx !== -1) q.splice(idx, 1);
      }

      const entry: QueueEntry = { 
        socketId: socket.id, 
        userId: payload.id, 
        nickname: payload.nickname, 
        bet: chosenBet 
      };

      // Szukamy gracza w kolejce z DOKŁADNIE tą samą stawką chosenBet
      const matchingIdx = queue.findIndex(e => e.bet === chosenBet);

      if (matchingIdx !== -1) {
        const p2 = queue.splice(matchingIdx, 1)[0];
        const p1 = entry;
        const roomId = generateRoomId();

        const p1Socket = io.sockets.sockets.get(p1.socketId);
        const p2Socket = io.sockets.sockets.get(p2.socketId);

        p1Socket?.join(roomId);
        p2Socket?.join(roomId);

        io.to(roomId).emit('matchFound', {
          roomId,
          gameType,
          players: [p1.nickname, p2.nickname],
          bet: chosenBet
        });

        if (gameType === 'blackjack') {
          const room: RankedBlackjackRoom = {
            player1: { ...p1, score: 0, hand: [] },
            player2: { ...p2, score: 0, hand: [] },
            deck: [],
            dealerHand: [],
            currentTurn: p1.userId,
            roomId,
            isBot: false,
            bet: chosenBet
          };
          blackjackRooms.set(roomId, room);
          startRankedBlackjackRound(io, room);
        } else if (gameType === 'slots') {
          const room: RankedSlotsRoom = {
            player1: { ...p1, virtualTokens: 0 },
            player2: { ...p2, virtualTokens: 0 },
            roomId,
            isBot: false,
            round: 0,
            bet: chosenBet
          };
          slotsRooms.set(roomId, room);
          io.to(roomId).emit('rankedSlotsStart', { roomId });
        }
      } else {
        queue.push(entry);
        socket.emit('queueJoined', { gameType, position: queue.length });
        console.log(`${payload.nickname} joined ${gameType} queue at bet ${chosenBet} (size: ${queue.length})`);

        // Set bot timeout (25 seconds)
        const botTimeout = setTimeout(() => {
          const currentQueue = queues.get(gameType);
          if (!currentQueue) return;

          const idx = currentQueue.findIndex((e) => e.userId === payload.id);
          if (idx === -1) return; // Already matched

          const [player] = currentQueue.splice(idx, 1);
          const roomId = generateRoomId();
          const playerSocket = io.sockets.sockets.get(player.socketId);
          playerSocket?.join(roomId);

          socket.emit('matchFound', {
            roomId,
            gameType,
            players: [player.nickname, 'BOT'],
            isBot: true,
            bet: player.bet
          });

          if (gameType === 'blackjack') {
            const room: RankedBlackjackRoom = {
              player1: { ...player, score: 0, hand: [] },
              player2: { socketId: 'bot', userId: 'bot', nickname: 'BOT', score: 0, hand: [] },
              deck: [],
              dealerHand: [],
              currentTurn: player.userId,
              roomId,
              isBot: true,
              bet: player.bet
            };
            blackjackRooms.set(roomId, room);
            startRankedBlackjackRound(io, room);
          } else if (gameType === 'slots') {
            const room: RankedSlotsRoom = {
              player1: { ...player, virtualTokens: 0 },
              player2: { socketId: 'bot', userId: 'bot', nickname: 'BOT', virtualTokens: 0 },
              roomId,
              isBot: true,
              round: 0,
              bet: player.bet
            };
            slotsRooms.set(roomId, room);
            socket.emit('rankedSlotsStart', { roomId, isBot: true });
          }
        }, 25000);

        // Store timeout to allow cancellation
        (socket as Socket & { botTimeout?: ReturnType<typeof setTimeout> }).botTimeout = botTimeout;
      }
    });

    // ── Leave Queue ─────────────────────────────────────────────────────────
    socket.on('leaveQueue', ({ token }: { token: string }) => {
      const payload = verifyToken(token);
      if (!payload) return;

      for (const [, queue] of queues) {
        const idx = queue.findIndex((e) => e.userId === payload.id);
        if (idx !== -1) {
          queue.splice(idx, 1);
          break;
        }
      }

      const s = socket as Socket & { botTimeout?: ReturnType<typeof setTimeout> };
      if (s.botTimeout) {
        clearTimeout(s.botTimeout);
        delete s.botTimeout;
      }

      socket.emit('queueLeft');
    });

    // ── Ranked Blackjack Hit ────────────────────────────────────────────────
    socket.on('rankedHit', ({ roomId, token }: { roomId: string; token: string }) => {
      const payload = verifyToken(token);
      if (!payload) return;

      const room = blackjackRooms.get(roomId);
      if (!room) return;
      if (room.currentTurn !== payload.id) {
        socket.emit('error', { message: 'Nie twoja kolej' });
        return;
      }

      const isP1 = room.player1.userId === payload.id;
      const playerInRoom = isP1 ? room.player1 : room.player2;
      if (!playerInRoom) return;

      const card = room.deck.pop();
      if (!card) return;
      playerInRoom.hand.push(card);

      const handValue = getHandValue(playerInRoom.hand);

      socket.emit('yourHand', { hand: playerInRoom.hand, handValue });
      broadcastBlackjackRoundState(io, room);

      if (handValue > 21) {
        // Auto-stand on bust
        socket.emit('rankedBust', { handValue });
        
        if (!room.isBot) {
          if (isP1) {
            if (room.player2) {
              room.currentTurn = room.player2.userId;
              broadcastBlackjackRoundState(io, room);
            } else {
              resolveRankedBlackjackRound(io, room);
            }
          } else {
            resolveRankedBlackjackRound(io, room);
          }
        } else {
          botPlayBlackjack(io, room);
        }
      }
    });

    // ── Ranked Blackjack Stand ──────────────────────────────────────────────
    socket.on('rankedStand', ({ roomId, token }: { roomId: string; token: string }) => {
      const payload = verifyToken(token);
      if (!payload) return;

      const room = blackjackRooms.get(roomId);
      if (!room) return;
      if (room.currentTurn !== payload.id) {
        socket.emit('error', { message: 'Nie twoja kolej' });
        return;
      }

      const isP1 = room.player1.userId === payload.id;

      if (room.isBot) {
        botPlayBlackjack(io, room);
      } else {
        if (isP1) {
          if (room.player2) {
            room.currentTurn = room.player2.userId;
            broadcastBlackjackRoundState(io, room);
          } else {
            resolveRankedBlackjackRound(io, room);
          }
        } else {
          resolveRankedBlackjackRound(io, room);
        }
      }
    });

    // ── Ranked Slots Spin ───────────────────────────────────────────────────
    socket.on('rankedSpin', ({ roomId, token }: { roomId: string; token: string }) => {
      const payload = verifyToken(token);
      if (!payload) return;

      const room = slotsRooms.get(roomId);
      if (!room) return;

      const isP1 = room.player1.userId === payload.id;
      const player = isP1 ? room.player1 : room.player2;
      if (!player) return;

      const { reels, multiplier } = spin();
      const virtualBet = 10;
      const virtualWin = virtualBet * multiplier;
      player.virtualTokens += virtualWin;

      socket.emit('rankedSpinResult', {
        reels,
        multiplier,
        virtualTokens: player.virtualTokens,
        virtualWin,
      });

      room.round++;

      // Bot auto-spin if bot game
      if (room.isBot && room.player2) {
        const botResult = spin();
        const botWin = virtualBet * botResult.multiplier;
        room.player2.virtualTokens += botWin;
        socket.emit('botSpinResult', {
          reels: botResult.reels,
          multiplier: botResult.multiplier,
          virtualTokens: room.player2.virtualTokens,
        });
      }

      // Check win condition (first to 200 virtual tokens)
      const p1Wins = room.player1.virtualTokens >= 200;
      const p2Wins = room.player2 && room.player2.virtualTokens >= 200;

      if (p1Wins || p2Wins) {
        const winnerId = p1Wins ? room.player1.userId : room.player2!.userId;
        const loserId = p1Wins
          ? room.player2?.userId !== 'bot' ? room.player2?.userId : undefined
          : room.player1.userId;

        settleRankedMatch(io, roomId, winnerId, loserId, 'slots', slotsRooms);
      }
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);

      // Remove from queues
      for (const [, queue] of queues) {
        const idx = queue.findIndex((e) => e.socketId === socket.id);
        if (idx !== -1) {
          queue.splice(idx, 1);
          break;
        }
      }

      const s = socket as Socket & { botTimeout?: ReturnType<typeof setTimeout> };
      if (s.botTimeout) clearTimeout(s.botTimeout);
    });
  });
}
