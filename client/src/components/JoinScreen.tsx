import React, { useState } from 'react';
import './JoinScreen.css';

interface JoinScreenProps {
  onJoin: (username: string) => void;
}

const JoinScreen: React.FC<JoinScreenProps> = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a username.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Username must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 30) {
      setError('Username must be 30 characters or less.');
      return;
    }
    setError('');
    onJoin(trimmed);
  };

  return (
    <div className="join-screen">
      <div className="join-card">
        <div className="join-logo">
          <span className="logo-icon">∑</span>
          <h1 className="logo-title">MathRace</h1>
          <p className="logo-subtitle">Competitive Math Quiz</p>
        </div>

        <div className="join-features">
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span>Real-time competition</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🧮</span>
            <span>Dynamic math problems</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🏆</span>
            <span>Global leaderboard</span>
          </div>
        </div>

        <form className="join-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username-input">Your Username</label>
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={e => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Enter your name..."
              maxLength={30}
              autoFocus
              autoComplete="off"
            />
            {error && <span className="input-error">{error}</span>}
          </div>
          <button type="submit" className="btn-join" disabled={!username.trim()}>
            <span>Join the Race</span>
            <span className="btn-arrow">→</span>
          </button>
        </form>

        <p className="join-hint">Be the first to answer and win the round!</p>
      </div>
    </div>
  );
};

export default JoinScreen;
