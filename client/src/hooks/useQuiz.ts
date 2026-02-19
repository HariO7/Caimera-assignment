import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';

export interface GameState {
  questionId: number;
  expression: string;
  difficulty: number;
  status: 'active' | 'answered';
  winnerId: string | null;
  winnerName: string | null;
  startedAt: number;
  questionNumber?: number;
  totalQuestions?: number;
}

export interface AnswerResult {
  correct: boolean;
  isWinner: boolean;
  message: string;
  answer?: number;
}

export interface WinnerAnnouncement {
  winnerName: string;
  winnerId: string;
  expression: string;
  answer: number;
  nextQuestionIn: number;
  isLastQuestion: boolean;
  questionNumber: number;
  totalQuestions: number;
}

export interface LeaderboardEntry {
  username: string;
  wins: number;
  total_attempts: number;
  last_win_at: number | null;
}

export interface QuizEndedPayload {
  winner: LeaderboardEntry | null;
  leaderboard: LeaderboardEntry[];
  totalQuestions: number;
}

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface UseQuizReturn {
  connectionStatus: ConnectionStatus;
  playerCount: number;
  gameState: GameState | null;
  answerResult: AnswerResult | null;
  winnerAnnouncement: WinnerAnnouncement | null;
  leaderboard: LeaderboardEntry[];
  countdown: number;
  isSubmitting: boolean;
  hasSubmittedThisRound: boolean;
  quizEnded: QuizEndedPayload | null;
  questionNumber: number;
  totalQuestions: number;
  submitAnswer: (answer: string) => void;
  clearResult: () => void;
}

export function useQuiz(userId: string | null, username: string | null): UseQuizReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [playerCount, setPlayerCount] = useState(0);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [winnerAnnouncement, setWinnerAnnouncement] = useState<WinnerAnnouncement | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedThisRound, setHasSubmittedThisRound] = useState(false);
  const [quizEnded, setQuizEnded] = useState<QuizEndedPayload | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(7);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    setCountdown(seconds);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          countdownTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const joinGame = useCallback(() => {
    if (username && userId) {
      socket.emit('join', { username, userId });
    }
  }, [username, userId]);

  useEffect(() => {
    if (!username || !userId) return;

    socket.connect();

    const onConnect = () => {
      setConnectionStatus('connected');
      joinGame();
    };

    const onDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const onConnectError = () => {
      setConnectionStatus('disconnected');
    };

    const onReconnecting = () => {
      setConnectionStatus('connecting');
    };

    const onQuestion = (state: GameState) => {
      setGameState(state);
      setAnswerResult(null);
      setWinnerAnnouncement(null);
      setHasSubmittedThisRound(false);
      setIsSubmitting(false);
      setCountdown(0);
      setQuizEnded(null);
      if (state.questionNumber !== undefined) setQuestionNumber(state.questionNumber);
      if (state.totalQuestions !== undefined) setTotalQuestions(state.totalQuestions);
    };

    const onAnswerResult = (result: AnswerResult) => {
      setIsSubmitting(false);
      setAnswerResult(result);
      if (result.isWinner || result.correct) {
        setHasSubmittedThisRound(true);
      }
    };

    const onWinnerAnnounced = (announcement: WinnerAnnouncement) => {
      setWinnerAnnouncement(announcement);
      if (announcement.questionNumber !== undefined) setQuestionNumber(announcement.questionNumber);
      if (announcement.totalQuestions !== undefined) setTotalQuestions(announcement.totalQuestions);
      startCountdown(announcement.nextQuestionIn);
    };

    const onLeaderboard = (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    };

    const onPlayerCount = (count: number) => {
      setPlayerCount(count);
    };

    const onErrorMsg = (msg: string) => {
      console.error('[Socket error]', msg);
      setIsSubmitting(false);
    };

    const onQuizEnded = (payload: QuizEndedPayload) => {
      setQuizEnded(payload);
      setLeaderboard(payload.leaderboard);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setCountdown(0);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnecting);
    socket.io.on('reconnect', () => {
      setConnectionStatus('connected');
      joinGame();
    });
    socket.on('question', onQuestion);
    socket.on('answer_result', onAnswerResult);
    socket.on('winner_announced', onWinnerAnnounced);
    socket.on('leaderboard', onLeaderboard);
    socket.on('player_count', onPlayerCount);
    socket.on('error_msg', onErrorMsg);
    socket.on('quiz_ended', onQuizEnded);

    if (socket.connected) {
      setConnectionStatus('connected');
      joinGame();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnecting);
      socket.off('question', onQuestion);
      socket.off('answer_result', onAnswerResult);
      socket.off('winner_announced', onWinnerAnnounced);
      socket.off('leaderboard', onLeaderboard);
      socket.off('player_count', onPlayerCount);
      socket.off('error_msg', onErrorMsg);
      socket.off('quiz_ended', onQuizEnded);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [username, userId, joinGame, startCountdown]);

  const submitAnswer = useCallback((answer: string) => {
    if (!answer.trim() || isSubmitting || hasSubmittedThisRound) return;
    setIsSubmitting(true);
    socket.emit('submit_answer', { answer: answer.trim() });
  }, [isSubmitting, hasSubmittedThisRound]);

  const clearResult = useCallback(() => {
    setAnswerResult(null);
  }, []);

  return {
    connectionStatus,
    playerCount,
    gameState,
    answerResult,
    winnerAnnouncement,
    leaderboard,
    countdown,
    isSubmitting,
    hasSubmittedThisRound,
    quizEnded,
    questionNumber,
    totalQuestions,
    submitAnswer,
    clearResult,
  };
}
