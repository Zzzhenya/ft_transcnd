// components/profile/UserStats.js
import React from 'react';

const UserStats = ({ stats }) => {
  if (!stats) {
    return <div className="loading">Loading statistics...</div>;
  }

  const winRate = stats.gamesPlayed > 0 ? 
    ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) : 0;

  return (
    <div className="user-stats">
      <div className="stats-grid">
        <div className="stat-card large">
          <h3>Total Games</h3>
          <div className="stat-value">{stats.gamesPlayed}</div>
          <div className="stat-breakdown">
            <div className="wins">
              <span className="label">Wins:</span>
              <span className="value">{stats.gamesWon}</span>
            </div>
            <div className="losses">
              <span className="label">Losses:</span>
              <span className="value">{stats.gamesLost}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h3>Win Rate</h3>
          <div className="stat-value">{winRate}%</div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${winRate}%` }}
            ></div>
          </div>
        </div>

        <div className="stat-card">
          <h3>Current Streak</h3>
          <div className="stat-value">{stats.currentStreak}</div>
          <div className="stat-label">
            {stats.currentStreak > 0 ? 'Win Streak' : 'Games'}
          </div>
        </div>

        <div className="stat-card">
          <h3>Best Streak</h3>
          <div className="stat-value">{stats.bestStreak}</div>
          <div className="stat-label">Wins</div>
        </div>

        <div className="stat-card">
          <h3>Total Score</h3>
          <div className="stat-value">{stats.totalScore}</div>
          <div className="stat-label">Points</div>
        </div>

        <div className="stat-card">
          <h3>Average Score</h3>
          <div className="stat-value">
            {stats.gamesPlayed > 0 ? 
              (stats.totalScore / stats.gamesPlayed).toFixed(1) : 0}
          </div>
          <div className="stat-label">Per Game</div>
        </div>
      </div>

      <div className="achievements-section">
        <h3>Achievements</h3>
        <div className="achievements-grid">
          <div className={`achievement ${stats.gamesPlayed >= 1 ? 'unlocked' : 'locked'}`}>
            <div className="achievement-icon">🎮</div>
            <div className="achievement-info">
              <h4>First Game</h4>
              <p>Play your first game</p>
            </div>
          </div>
          
          <div className={`achievement ${stats.gamesWon >= 1 ? 'unlocked' : 'locked'}`}>
            <div className="achievement-icon">🏆</div>
            <div className="achievement-info">
              <h4>First Victory</h4>
              <p>Win your first game</p>
            </div>
          </div>
          
          <div className={`achievement ${stats.gamesWon >= 10 ? 'unlocked' : 'locked'}`}>
            <div className="achievement-icon">⭐</div>
            <div className="achievement-info">
              <h4>Rising Star</h4>
              <p>Win 10 games</p>
            </div>
          </div>
          
          <div className={`achievement ${stats.bestStreak >= 5 ? 'unlocked' : 'locked'}`}>
            <div className="achievement-icon">🔥</div>
            <div className="achievement-info">
              <h4>On Fire</h4>
              <p>Win 5 games in a row</p>
            </div>
          </div>
          
          <div className={`achievement ${winRate >= 70 && stats.gamesPlayed >= 10 ? 'unlocked' : 'locked'}`}>
            <div className="achievement-icon">💎</div>
            <div className="achievement-info">
              <h4>Master Player</h4>
              <p>Maintain 70% win rate (10+ games)</p>
            </div>
          </div>
          
          <div className={`achievement ${stats.gamesPlayed >= 100 ? 'unlocked' : 'locked'}`}>
            <div className="achievement-icon">🎯</div>
            <div className="achievement-info">
              <h4>Dedicated</h4>
              <p>Play 100 games</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStats;