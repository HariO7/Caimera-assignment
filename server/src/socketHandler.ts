import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  handleSubmitAnswer,
  getCurrentGameStateForClient,
  getLeaderboardData,
} from './gameManager';

interface JoinPayload {
  username: string;
  userId?: string; // Optional: re-joining with existing ID for score continuity
}

interface SubmitAnswerPayload {
  answer: string | number;
}

const connectedUsers = new Map<string, { userId: string; username: string }>();

export function setupSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Broadcast updated player count
    io.emit('player_count', io.engine.clientsCount);

    socket.on('join', (payload: JoinPayload) => {
      if (!payload?.username?.trim()) {
        socket.emit('error_msg', 'Username is required.');
        return;
      }

      const username = payload.username.trim().slice(0, 30);
      // Re-use existing userId if provided (reconnection scenario), else generate new
      const userId = payload.userId && payload.userId.trim() ? payload.userId.trim() : uuidv4();

      connectedUsers.set(socket.id, { userId, username });

      console.log(`[Socket] ${username} (${userId}) joined`);

      // Send current game state to the joining user
      const gameState = getCurrentGameStateForClient();
      if (gameState) {
        socket.emit('question', gameState);
      }

      // Confirm join with their userId (important for reconnection)
      socket.emit('joined', { userId, username });

      // Send leaderboard
      socket.emit('leaderboard', getLeaderboardData());

      // Broadcast updated player count
      io.emit('player_count', io.engine.clientsCount);
    });

    socket.on('submit_answer', (payload: SubmitAnswerPayload) => {
      const user = connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error_msg', 'You must join before submitting an answer.');
        return;
      }

      if (payload?.answer === undefined || payload.answer === '') {
        socket.emit('error_msg', 'Answer cannot be empty.');
        return;
      }

      handleSubmitAnswer(
        user.userId,
        user.username,
        payload.answer,
        (result) => {
          // Send result back to submitting user
          socket.emit('answer_result', result);
        }
      );
    });

    socket.on('get_leaderboard', () => {
      socket.emit('leaderboard', getLeaderboardData());
    });

    socket.on('disconnect', (reason) => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        console.log(`[Socket] ${user.username} disconnected (${reason})`);
        connectedUsers.delete(socket.id);
      }
      // Broadcast updated player count after short delay to avoid flicker on reconnect
      setTimeout(() => {
        io.emit('player_count', io.engine.clientsCount);
      }, 500);
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error on ${socket.id}:`, err);
    });
  });
}
