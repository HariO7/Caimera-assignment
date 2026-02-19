import { Server as SocketIOServer } from 'socket.io';
import db from './db';
import { generateQuestion, MathQuestion } from './questionGenerator';

interface GameState {
  questionId: number;
  expression: string;
  difficulty: number;
  status: 'active' | 'answered';
  winnerId: string | null;
  winnerName: string | null;
  startedAt: number;
}

interface DbGameState {
  id: number;
  current_question_id: number | null;
  status: 'active' | 'answered';
  winner_id: string | null;
  winner_name: string | null;
  updated_at: number;
}

interface DbQuestion {
  id: number;
  expression: string;
  answer: number;
  difficulty: number;
}

interface LeaderboardRow {
  username: string;
  wins: number;
  total_attempts: number;
  last_win_at: number | null;
}

let io: SocketIOServer | null = null;
let nextQuestionTimer: NodeJS.Timeout | null = null;
const NEXT_QUESTION_DELAY_MS = 6000; // 6 seconds after winner announced

const insertQuestion = db.prepare<[string, number, number]>(
  'INSERT INTO questions (expression, answer, difficulty) VALUES (?, ?, ?)'
);

const updateGameStateQuestion = db.prepare<[number]>(
  `UPDATE game_state SET current_question_id = ?, status = 'active', winner_id = NULL, winner_name = NULL, updated_at = unixepoch() WHERE id = 1`
);

const getGameState = db.prepare<[], DbGameState>(
  'SELECT * FROM game_state WHERE id = 1'
);

const getQuestion = db.prepare<[number], DbQuestion>(
  'SELECT * FROM questions WHERE id = ?'
);

const tryClaimWin = db.transaction(
  (userId: string, username: string): boolean => {
    const state = getGameState.get() as DbGameState;
    if (!state || state.status !== 'active') return false;

    const result = db
      .prepare<[string, string]>(
        `UPDATE game_state 
       SET status = 'answered', winner_id = ?, winner_name = ?, updated_at = unixepoch()
       WHERE id = 1 AND status = 'active'`
      )
      .run(userId, username);

    return result.changes > 0;
  }
);

const upsertUserScore = db.prepare<[string, string]>(
  `INSERT INTO user_scores (user_id, username, wins, total_attempts, last_win_at)
   VALUES (?, ?, 1, 1, unixepoch())
   ON CONFLICT(user_id) DO UPDATE SET
     wins = wins + 1,
     total_attempts = total_attempts + 1,
     last_win_at = unixepoch(),
     username = excluded.username`
);

const incrementAttempt = db.prepare<[string, string]>(
  `INSERT INTO user_scores (user_id, username, wins, total_attempts)
   VALUES (?, ?, 0, 1)
   ON CONFLICT(user_id) DO UPDATE SET
     total_attempts = total_attempts + 1,
     username = excluded.username`
);

const getLeaderboard = db.prepare<[], LeaderboardRow>(
  `SELECT username, wins, total_attempts, last_win_at
   FROM user_scores
   ORDER BY wins DESC, last_win_at ASC
   LIMIT 10`
);

function getCurrentGameStateForClient(): GameState | null {
  const state = getGameState.get() as DbGameState | undefined;
  if (!state || !state.current_question_id) return null;

  const question = getQuestion.get(state.current_question_id) as DbQuestion | undefined;
  if (!question) return null;

  return {
    questionId: question.id,
    expression: question.expression,
    difficulty: question.difficulty,
    status: state.status,
    winnerId: state.winner_id,
    winnerName: state.winner_name,
    startedAt: state.updated_at,
  };
}

function advanceToNextQuestion(): void {
  const question: MathQuestion = generateQuestion();

  const insertResult = insertQuestion.run(
    question.expression,
    question.answer,
    question.difficulty
  );
  const questionId = insertResult.lastInsertRowid as number;
  updateGameStateQuestion.run(questionId);

  const gameState = getCurrentGameStateForClient();
  if (gameState && io) {
    io.emit('question', gameState);
    io.emit('player_count', io.engine.clientsCount);
  }
}

export function initGameManager(socketServer: SocketIOServer): void {
  io = socketServer;

  // Bootstrap: create the first question if none exists
  const state = getGameState.get() as DbGameState | undefined;
  if (!state || !state.current_question_id) {
    advanceToNextQuestion();
  }
}

export function handleSubmitAnswer(
  userId: string,
  username: string,
  submittedAnswer: string | number,
  socketCallback: (result: {
    correct: boolean;
    isWinner: boolean;
    message: string;
    answer?: number;
  }) => void
): void {
  const state = getGameState.get() as DbGameState | undefined;
  if (!state || !state.current_question_id) {
    socketCallback({ correct: false, isWinner: false, message: 'No active question.' });
    return;
  }

  if (state.status === 'answered') {
    socketCallback({
      correct: false,
      isWinner: false,
      message: `Too late! ${state.winner_name} already answered this one.`,
    });
    return;
  }

  const question = getQuestion.get(state.current_question_id) as DbQuestion | undefined;
  if (!question) {
    socketCallback({ correct: false, isWinner: false, message: 'Question not found.' });
    return;
  }

  // Increment attempt count regardless
  incrementAttempt.run(userId, username);

  const parsedAnswer = parseFloat(String(submittedAnswer));
  const tolerance = 0.01; // allow small floating point tolerance
  const isCorrect = Math.abs(parsedAnswer - question.answer) <= tolerance;

  if (!isCorrect) {
    socketCallback({
      correct: false,
      isWinner: false,
      message: 'Incorrect! Keep trying.',
    });
    return;
  }

  // Atomic claim: only first correct user wins
  const won = tryClaimWin(userId, username);

  if (won) {
    upsertUserScore.run(userId, username);

    socketCallback({
      correct: true,
      isWinner: true,
      message: `🎉 You won this round!`,
      answer: question.answer,
    });

    // Broadcast winner to all other players
    if (io) {
      io.emit('winner_announced', {
        winnerName: username,
        winnerId: userId,
        expression: question.expression,
        answer: question.answer,
        nextQuestionIn: NEXT_QUESTION_DELAY_MS / 1000,
      });

      // Update leaderboard
      const leaderboard = getLeaderboard.all();
      io.emit('leaderboard', leaderboard);
    }

    // Schedule next question
    if (nextQuestionTimer) clearTimeout(nextQuestionTimer);
    nextQuestionTimer = setTimeout(() => {
      advanceToNextQuestion();
    }, NEXT_QUESTION_DELAY_MS);
  } else {
    // Another user already claimed the win
    const updatedState = getGameState.get() as DbGameState;
    socketCallback({
      correct: true,
      isWinner: false,
      message: `Correct answer! But ${updatedState.winner_name || 'someone'} was just a bit faster. 😔`,
      answer: question.answer,
    });
  }
}

export function getLeaderboardData(): LeaderboardRow[] {
  return getLeaderboard.all() as LeaderboardRow[];
}

export { getCurrentGameStateForClient };
