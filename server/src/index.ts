import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './socketHandler';
import { initGameManager, getLeaderboardData } from './gameManager';
import 'dotenv/config';   

const PORT = process.env.PORT ;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ;

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
  // Graceful handling of various network conditions
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  transports: ['websocket', 'polling'], // fallback to polling for poor connections
});

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// REST: Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// REST: Leaderboard (for initial page loads without socket)
app.get('/api/leaderboard', (_req, res) => {
  try {
    const scores = getLeaderboardData();
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Initialize game manager (creates first question if needed)
initGameManager(io);

// Setup socket handlers
setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Math Quiz Server running on http://localhost:${PORT}`);
  console.log(`   WebSocket ready, accepting connections from ${CLIENT_ORIGIN}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  httpServer.close(() => process.exit(0));
});
