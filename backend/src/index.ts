import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRouter from './routes/auth';
import shopRouter from './routes/shop';
import workRouter from './routes/work';
import leaderboardRouter from './routes/leaderboard';
import gameRouter from './routes/game';
import businessRouter from './routes/business';
import stocksRouter from './routes/stocks';
import { setupMatchmaking } from './sockets/matchmaking';
import { seedStocks, startStockTicker } from './services/stockService';

dotenv.config();

export const prisma = new PrismaClient();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://casino-star-frontend.onrender.com'
];

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Blokada serwera - Przerwa Techniczna
app.use((req, res, next) => {
  if (req.path === '/api/health') {
    return next();
  }
  res.status(503).json({
    error: 'Przerwa techniczna serwera. Trwają prace konserwacyjne. Zapraszamy wkrótce!'
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/shop', shopRouter);
app.use('/api/work', workRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/game', gameRouter);
app.use('/api/business', businessRouter);
app.use('/api/stocks', stocksRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
setupMatchmaking(io);

// Seed houses on startup
async function seedHouses() {
  const houses = [
    {
      id: 1,
      name: 'Rudera',
      price: 0,
      sleepBonus: 20,
      hasFridge: false,
      hasTap: false,
      freeFood: false,
    },
    {
      id: 2,
      name: 'Kawalerka',
      price: 10000,
      sleepBonus: 33,
      hasFridge: true,
      hasTap: false,
      freeFood: false,
    },
    {
      id: 3,
      name: 'Mieszkanie',
      price: 25000,
      sleepBonus: 50,
      hasFridge: true,
      hasTap: true,
      freeFood: false,
    },
    {
      id: 4,
      name: 'Willa',
      price: 100000,
      sleepBonus: 100,
      hasFridge: true,
      hasTap: true,
      freeFood: true,
    },
  ];

  for (const house of houses) {
    await prisma.house.upsert({
      where: { name: house.name },
      update: { price: house.price, sleepBonus: house.sleepBonus, hasFridge: house.hasFridge, hasTap: house.hasTap, freeFood: house.freeFood },
      create: house,
    });
  }

  console.log('✅ Houses seeded successfully');
}



const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, async () => {
  console.log(`🚀 Casino Star backend running on port ${PORT}`);
  await seedHouses();
  await seedStocks();
  startStockTicker();
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
