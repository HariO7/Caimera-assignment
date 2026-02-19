import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NetworkIndicator from './NetworkIndicator';
import { useQuiz } from '../hooks/useQuiz';
import './QuizScreen.css';

interface QuizScreenProps {
  username: string;
  userId: string;
}

const difficultyLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Easy', color: '#4ade80' },
  2: { label: 'Medium', color: '#facc15' },
  3: { label: 'Hard', color: '#fb923c' },
  4: { label: 'Expert', color: '#f87171' },
};

const QuizScreen: React.FC<QuizScreenProps> = ({ username, userId }) => {
  const {
    connectionStatus,
    playerCount,
    gameState,
    answerResult,
    winnerAnnouncement,
    countdown,
    isSubmitting,
    hasSubmittedThisRound,
    submitAnswer,
  } = useQuiz(userId, username);

  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset input when a new question arrives
  useEffect(() => {
    if (gameState?.status === 'active' && !winnerAnnouncement) {
      setInputValue('');
      inputRef.current?.focus();
    }
  }, [gameState?.questionId, gameState?.status, winnerAnnouncement]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || hasSubmittedThisRound || isSubmitting) return;
    submitAnswer(inputValue);
  };

  const difficulty = gameState?.difficulty ? difficultyLabels[gameState.difficulty] : null;

  const isRoundOver = gameState?.status === 'answered' || !!winnerAnnouncement;
  const isInputDisabled = hasSubmittedThisRound || isRoundOver || isSubmitting;

  return (
    <div className="quiz-screen">
      <NetworkIndicator status={connectionStatus} playerCount={playerCount} />

      <header className="quiz-header">
        <div className="quiz-brand">
          <span className="brand-symbol">∑</span>
          <span className="brand-name">MathRace</span>
        </div>
        <nav className="quiz-nav">
          <span className="greeting">Hi, <strong>{username}</strong></span>
          <Link to="/leaderboard" className="nav-link">🏆 Leaderboard</Link>
        </nav>
      </header>

      <main className="quiz-main">
        {connectionStatus !== 'connected' && (
          <div className="connection-overlay">
            <div className="spinner" />
            <p>{connectionStatus === 'connecting' ? 'Reconnecting...' : 'Connection lost. Retrying...'}</p>
          </div>
        )}

        {/* Winner announcement banner */}
        {winnerAnnouncement && (
          <div className={`winner-banner ${winnerAnnouncement.winnerId === userId ? 'winner-you' : 'winner-other'}`}>
            <div className="winner-emoji">
              {winnerAnnouncement.winnerId === userId ? '🎉' : '🏆'}
            </div>
            <div className="winner-info">
              <h2 className="winner-title">
                {winnerAnnouncement.winnerId === userId
                  ? 'You won this round!'
                  : `${winnerAnnouncement.winnerName} wins!`}
              </h2>
              <p className="winner-answer">
                Answer: <strong>{winnerAnnouncement.answer}</strong>
              </p>
            </div>
            {countdown > 0 && (
              <div className="countdown-badge">
                <span className="countdown-number">{countdown}</span>
                <span className="countdown-label">next in</span>
              </div>
            )}
          </div>
        )}

        {/* Question card */}
        <div className={`question-card ${isRoundOver ? 'card-dimmed' : ''}`}>
          <div className="question-meta">
            <span className="round-label">
              Question #{gameState?.questionId ?? '—'}
            </span>
            {difficulty && (
              <span className="difficulty-badge" style={{ color: difficulty.color, borderColor: difficulty.color }}>
                {difficulty.label}
              </span>
            )}
          </div>

          <div className="question-expression">
            {gameState ? (
              <span className="expression-text">{gameState.expression} = ?</span>
            ) : (
              <span className="expression-placeholder">
                <span className="loading-dots">
                  <span /><span /><span />
                </span>
              </span>
            )}
          </div>

          {/* Answer form */}
          <form className="answer-form" onSubmit={handleSubmit}>
            <div className="answer-row">
              <input
                ref={inputRef}
                id="answer-input"
                type="number"
                step="any"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Your answer..."
                disabled={isInputDisabled}
                className={`answer-input ${answerResult ? (answerResult.correct ? 'input-correct' : 'input-wrong') : ''}`}
                autoComplete="off"
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(e as unknown as React.FormEvent); }}
              />
              <button
                type="submit"
                className={`btn-submit ${isSubmitting ? 'btn-loading' : ''}`}
                disabled={isInputDisabled || !inputValue.trim()}
              >
                {isSubmitting ? (
                  <span className="mini-spinner" />
                ) : hasSubmittedThisRound ? (
                  <span>✓ Sent</span>
                ) : (
                  <span>Submit</span>
                )}
              </button>
            </div>

            {/* Answer result feedback */}
            {answerResult && (
              <div className={`answer-feedback ${answerResult.isWinner ? 'feedback-winner' : answerResult.correct ? 'feedback-correct' : 'feedback-wrong'}`}>
                <span className="feedback-icon">
                  {answerResult.isWinner ? '🎉' : answerResult.correct ? '✅' : '❌'}
                </span>
                <span>{answerResult.message}</span>
              </div>
            )}
          </form>
        </div>

        {/* Tips */}
        <div className="quiz-tips">
          <p>💡 <strong>Tip:</strong> First correct answer wins the round!</p>
        </div>
      </main>
    </div>
  );
};

export default QuizScreen;
