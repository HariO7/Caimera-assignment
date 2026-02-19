import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import socket from '../socket';
import { LeaderboardEntry } from '../hooks/useQuiz';
import './Leaderboard.css';

interface LeaderboardProps {
  userId: string | null;
}

const Leaderboard: React.FC<LeaderboardProps> = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Request leaderboard via socket if connected
    if (socket.connected) {
      socket.emit('get_leaderboard');
    } else {
      // Fallback: REST API
      fetch('http://localhost:3001/api/leaderboard')
        .then(r => r.json())
        .then(data => {
          setEntries(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }

    const onLeaderboard = (data: LeaderboardEntry[]) => {
      setEntries(data);
      setLoading(false);
    };

    socket.on('leaderboard', onLeaderboard);
    return () => { socket.off('leaderboard', onLeaderboard); };
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="leaderboard-screen">
      <header className="lb-header">
        <div className="lb-brand">
          <span className="brand-symbol-lb">∑</span>
          <span className="brand-name-lb">MathRace</span>
        </div>
        <Link to="/quiz" className="back-link">← Back to Quiz</Link>
      </header>

      <main className="lb-main">
        <div className="lb-card">
          <div className="lb-title-row">
            <h1 className="lb-title">🏆 Leaderboard</h1>
            <span className="lb-subtitle">Top Champions</span>
          </div>

          {loading ? (
            <div className="lb-loading">
              <div className="spinner-lb" />
              <p>Loading scores...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="lb-empty">
              <span className="lb-empty-icon">🎯</span>
              <p>No scores yet. Be the first to win!</p>
              <Link to="/quiz" className="btn-play-now">Play Now</Link>
            </div>
          ) : (
            <div className="lb-table-wrapper">
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Wins</th>
                    <th>Attempts</th>
                    <th>Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => {
                    const winRate = entry.total_attempts > 0
                      ? ((entry.wins / entry.total_attempts) * 100).toFixed(0)
                      : '0';
                    const isMe = false; // We can't easily tell without comparing userId to db userId
                    return (
                      <tr key={entry.username} className={`lb-row ${idx < 3 ? 'top-row' : ''} ${isMe ? 'my-row' : ''}`}>
                        <td className="rank-cell">
                          {idx < 3 ? <span className="medal">{medals[idx]}</span> : <span className="rank-num">{idx + 1}</span>}
                        </td>
                        <td className="name-cell">
                          <span className="player-name">{entry.username}</span>
                        </td>
                        <td className="wins-cell">
                          <span className="wins-badge">{entry.wins}</span>
                        </td>
                        <td className="attempts-cell">{entry.total_attempts}</td>
                        <td className="rate-cell">
                          <div className="rate-bar-wrapper">
                            <div className="rate-bar" style={{ width: `${winRate}%` }} />
                            <span className="rate-text">{winRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
