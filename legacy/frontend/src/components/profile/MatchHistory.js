// components/profile/MatchHistory.js
import React, { useState, useEffect } from 'react';
import UserService from '../../services/userService';

const MatchHistory = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filter, setFilter] = useState('all'); // all, wins, losses

  useEffect(() => {
    loadMatchHistory();
  }, [currentPage]);

  const loadMatchHistory = async () => {
    try {
      setLoading(true);
      const data = await UserService.getMatchHistory(currentPage, 10);
      setMatches(data.matches);
      setTotalPages(data.totalPages);
      setError('');
    } catch (err) {
      setError('Failed to load match history');
      console.error('Error loading match history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredMatches = () => {
    if (filter === 'all') return matches;
    return matches.filter(match => {
      if (filter === 'wins') return match.result === 'win';
      if (filter === 'losses') return match.result === 'loss';
      return true;
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && matches.length === 0) {
    return <div className="loading">Loading match history...</div>;
  }

  return (
    <div className="match-history">
      <div className="match-history-header">
        <h3>Match History</h3>
        <div className="filter-controls">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'wins' ? 'active' : ''}`}
            onClick={() => setFilter('wins')}
          >
            Wins
          </button>
          <button 
            className={`filter-btn ${filter === 'losses' ? 'active' : ''}`}
            onClick={() => setFilter('losses')}
          >
            Losses
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {matches.length === 0 && !loading ? (
        <div className="no-matches">
          <div className="no-matches-icon">🏓</div>
          <h4>No matches yet</h4>
          <p>Start playing to see your match history here!</p>
        </div>
      ) : (
        <>
          <div className="matches-list">
            {getFilteredMatches().map((match, index) => (
              <div key={match.id || index} className={`match-item ${match.result}`}>
                <div className="match-result">
                  <span className={`result-badge ${match.result}`}>
                    {match.result === 'win' ? 'W' : 'L'}
                  </span>
                </div>
                
                <div className="match-details">
                  <div className="match-opponent">
                    <span className="vs-label">vs</span>
                    <span className="opponent-name">{match.opponent || 'Unknown Player'}</span>
                  </div>
                  
                  <div className="match-score">
                    <span className="score">
                      {match.playerScore || 0} - {match.opponentScore || 0}
                    </span>
                  </div>
                  
                  <div className="match-duration">
                    <i className="fas fa-clock"></i>
                    <span>{match.duration || '0:00'}</span>
                  </div>
                </div>
                
                <div className="match-meta">
                  <div className="match-date">
                    {formatDate(match.createdAt || new Date())}
                  </div>
                  <div className="match-type">
                    {match.gameType || 'Classic Pong'}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Demo data when no real matches exist */}
            {matches.length === 0 && (
              <>
                <div className="match-item win demo">
                  <div className="match-result">
                    <span className="result-badge win">W</span>
                  </div>
                  
                  <div className="match-details">
                    <div className="match-opponent">
                      <span className="vs-label">vs</span>
                      <span className="opponent-name">Demo Player</span>
                    </div>
                    
                    <div className="match-score">
                      <span className="score">11 - 7</span>
                    </div>
                    
                    <div className="match-duration">
                      <i className="fas fa-clock"></i>
                      <span>3:42</span>
                    </div>
                  </div>
                  
                  <div className="match-meta">
                    <div className="match-date">
                      {formatDate(new Date())}
                    </div>
                    <div className="match-type">
                      Classic Pong
                    </div>
                  </div>
                </div>
                
                <div className="match-item loss demo">
                  <div className="match-result">
                    <span className="result-badge loss">L</span>
                  </div>
                  
                  <div className="match-details">
                    <div className="match-opponent">
                      <span className="vs-label">vs</span>
                      <span className="opponent-name">AI Opponent</span>
                    </div>
                    
                    <div className="match-score">
                      <span className="score">8 - 11</span>
                    </div>
                    
                    <div className="match-duration">
                      <i className="fas fa-clock"></i>
                      <span>4:15</span>
                    </div>
                  </div>
                  
                  <div className="match-meta">
                    <div className="match-date">
                      {formatDate(new Date(Date.now() - 86400000))}
                    </div>
                    <div className="match-type">
                      vs AI
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MatchHistory;