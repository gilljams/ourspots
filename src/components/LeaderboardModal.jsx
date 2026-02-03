import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, Edit3, Save, Plus, User, Trophy, Trash2, Lock, Unlock } from 'lucide-react';

// Triangle up/down icons for rank change
const TriangleUp = ({ className }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" className={className}>
    <path d="M5 2 L9 8 L1 8 Z" fill="currentColor" />
  </svg>
);

const TriangleDown = ({ className }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" className={className}>
    <path d="M5 8 L9 2 L1 2 Z" fill="currentColor" />
  </svg>
);

// Avatar with initials and consistent color based on email
const Avatar = ({ name, email, size = 'md', isCurrentUser = false }) => {
  // Generate consistent color from email
  const getColorFromEmail = (email) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-cyan-500', 'bg-teal-500', 'bg-orange-500'
    ];
    const hash = (email || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };
  
  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return (email || '?').slice(0, 2).toUpperCase();
  };
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs'
  };
  
  const colorClass = isCurrentUser ? 'bg-blue-500' : getColorFromEmail(email);
  
  return (
    <div className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center flex-shrink-0 font-medium text-white`}>
      {getInitials(name, email)}
    </div>
  );
};

export default function LeaderboardModal({ 
  data, 
  currentUser, 
  shares = {}, 
  canEdit = false, 
  onClose, 
  onUpdateScores,
  onAddRound,
  onDeleteRound,
  onToggleStatus
}) {
  const [currentRound, setCurrentRound] = useState(() => {
    // Start at last round if there are rounds, otherwise 0
    const rc = data.roundCount || 0;
    return rc > 0 ? rc - 1 : 0;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editScores, setEditScores] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [sortBy, setSortBy] = useState('total'); // 'total' or 'round'
  const [focusedParticipant, setFocusedParticipant] = useState(null);
  const [rowOffsets, setRowOffsets] = useState({}); // For FLIP animation
  const [showDeleteRoundConfirm, setShowDeleteRoundConfirm] = useState(false);
  const playIntervalRef = useRef(null);
  const inputRefs = useRef({});
  const rowRefs = useRef({});
  
  const title = data.title || 'Leaderboard';
  const participants = data.participants || [];
  const roundCount = data.roundCount || 0;
  const scores = data.scores || {};
  const status = data.status || 'active';
  const sortOrder = data.sortOrder || 'desc';
  
  const currentUserEmail = currentUser?.email?.toLowerCase();
  
  // Set focused participant to current user by default
  useEffect(() => {
    if (!focusedParticipant && currentUserEmail) {
      const userParticipant = participants.find(p => p.email?.toLowerCase() === currentUserEmail);
      if (userParticipant) {
        setFocusedParticipant(userParticipant.email);
      }
    }
  }, [currentUserEmail, participants, focusedParticipant]);
  
  // Initialize edit scores when entering edit mode
  useEffect(() => {
    if (isEditing) {
      const initialScores = {};
      participants.forEach(p => {
        initialScores[p.email] = scores[p.email]?.[currentRound] ?? '';
      });
      setEditScores(initialScores);
    }
  }, [isEditing, currentRound, participants, scores]);
  
  // Cleanup play interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);
  
  // Calculate total score up to a specific round
  const getTotalUpToRound = (email, upToRound) => {
    const participantScores = scores[email] || {};
    let total = 0;
    for (let i = 0; i <= upToRound; i++) {
      total += participantScores[i] || 0;
    }
    return total;
  };
  
  // Get ranking at a specific round
  const getRankingAtRound = (roundIndex) => {
    return participants
      .map(p => ({
        ...p,
        roundScore: scores[p.email]?.[roundIndex] || 0,
        total: getTotalUpToRound(p.email, roundIndex)
      }))
      .sort((a, b) => {
        const scoreA = sortBy === 'round' ? a.roundScore : a.total;
        const scoreB = sortBy === 'round' ? b.roundScore : b.total;
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      });
  };
  
  // Get rank change compared to previous round
  const getRankChange = (email, roundIndex) => {
    if (roundIndex === 0) return 0;
    
    const currentRanking = getRankingAtRound(roundIndex);
    const previousRanking = getRankingAtRound(roundIndex - 1);
    
    const currentRank = currentRanking.findIndex(p => p.email === email) + 1;
    const previousRank = previousRanking.findIndex(p => p.email === email) + 1;
    
    return previousRank - currentRank; // Positive = moved up, negative = moved down
  };
  
  const rankedParticipants = getRankingAtRound(currentRound);
  
  // FLIP animation for row position changes
  const animateRowChange = (newRound) => {
    // First: Record current positions
    const firstPositions = {};
    Object.keys(rowRefs.current).forEach(email => {
      const el = rowRefs.current[email];
      if (el) {
        firstPositions[email] = el.getBoundingClientRect().top;
      }
    });
    
    // Change round
    setCurrentRound(newRound);
    
    // After render, calculate and apply FLIP
    requestAnimationFrame(() => {
      const offsets = {};
      Object.keys(rowRefs.current).forEach(email => {
        const el = rowRefs.current[email];
        if (el && firstPositions[email] !== undefined) {
          const lastPosition = el.getBoundingClientRect().top;
          const delta = firstPositions[email] - lastPosition;
          if (Math.abs(delta) > 2) {
            offsets[email] = delta;
          }
        }
      });
      
      if (Object.keys(offsets).length > 0) {
        setRowOffsets(offsets);
        // Clear offsets after animation
        setTimeout(() => setRowOffsets({}), 400);
      }
    });
  };
  
  // Play animation through rounds
  const handlePlay = () => {
    if (roundCount === 0) return;
    
    setIsPlaying(true);
    
    // Start from round 0 with animation
    animateRowChange(0);
    
    let round = 0;
    playIntervalRef.current = setInterval(() => {
      round++;
      if (round >= roundCount) {
        clearInterval(playIntervalRef.current);
        setIsPlaying(false);
      } else {
        animateRowChange(round);
      }
    }, 1800); // 1.8 seconds between rounds for smoother feel
  };
  
  const handlePause = () => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    setIsPlaying(false);
  };
  
  const handleStop = () => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    setIsPlaying(false);
    setCurrentRound(roundCount > 0 ? roundCount - 1 : 0);
  };
  
  // Handle score input change
  const handleScoreChange = (email, value) => {
    setEditScores(prev => ({
      ...prev,
      [email]: value
    }));
  };
  
  // Handle Enter key to move to next input
  const handleKeyDown = (e, email, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = index + 1;
      const nextParticipant = participants[nextIndex];
      if (nextParticipant && inputRefs.current[nextParticipant.email]) {
        inputRefs.current[nextParticipant.email].focus();
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };
  
  // Save scores
  const handleSave = () => {
    if (!onUpdateScores) return;
    
    const newScores = { ...scores };
    participants.forEach(p => {
      if (!newScores[p.email]) {
        newScores[p.email] = {};
      }
      const value = editScores[p.email];
      if (value !== '' && value !== undefined) {
        newScores[p.email][currentRound] = parseFloat(value) || 0;
      }
    });
    
    onUpdateScores(newScores);
    setIsEditing(false);
  };
  
  // Add new round
  const handleAddRound = () => {
    if (onAddRound) {
      onAddRound();
      // Switch to the new round
      setTimeout(() => {
        setCurrentRound(roundCount);
      }, 100);
    }
  };
  
  // Delete current round
  const handleDeleteRound = () => {
    if (onDeleteRound && roundCount > 0) {
      onDeleteRound(currentRound);
      setShowDeleteRoundConfirm(false);
      // Move to previous round if we deleted the last one
      if (currentRound >= roundCount - 1) {
        setCurrentRound(Math.max(0, roundCount - 2));
      }
    }
  };

  // Rank display component
  const RankDisplay = ({ rank }) => {
    if (rank === 1) return <Trophy size={16} className="text-amber-400" />;
    if (rank === 2) return <Trophy size={16} className="text-gray-300" />;
    if (rank === 3) return <Trophy size={16} className="text-orange-600" />;
    return <span className="text-sm text-gray-500 w-4 text-center">{rank}</span>;
  };
  
  // Rank change indicator
  const RankChangeIndicator = ({ change }) => {
    if (change > 0) {
      return <TriangleUp className="text-green-400" />;
    } else if (change < 0) {
      return <TriangleDown className="text-red-400" />;
    }
    return <span className="text-gray-600">–</span>;
  };
  
  return (
    <div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-900/50">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Trophy size={20} className="text-amber-400" />
          {isEditing ? 'Redigera poäng' : title}
        </h2>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Round navigation / controls */}
      <div className="px-4 py-3 border-b border-white/10 bg-gray-900/30">
        {isEditing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentRound(Math.max(0, currentRound - 1))}
                disabled={currentRound === 0}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-300 min-w-[100px] text-center">
                Runda {currentRound + 1} av {roundCount || 1}
              </span>
              <button
                onClick={() => setCurrentRound(Math.min((roundCount || 1) - 1, currentRound + 1))}
                disabled={currentRound >= (roundCount || 1) - 1}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {roundCount > 0 && onDeleteRound && (
                <button
                  onClick={() => setShowDeleteRoundConfirm(true)}
                  className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400"
                  title="Ta bort runda"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={handleAddRound}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm"
              >
                <Plus size={14} />
                Ny runda
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => animateRowChange(Math.max(0, currentRound - 1))}
                disabled={currentRound === 0 || isPlaying}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-300 min-w-[100px] text-center">
                {roundCount > 0 ? `Runda ${currentRound + 1} av ${roundCount}` : 'Inga rundor'}
              </span>
              <button
                onClick={() => animateRowChange(Math.min(roundCount - 1, currentRound + 1))}
                disabled={currentRound >= roundCount - 1 || isPlaying}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Play controls - only show if more than 1 round */}
              {roundCount > 1 && isPlaying && (
                <button
                  onClick={handlePause}
                  className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400"
                  title="Pausa"
                >
                  <Pause size={16} />
                </button>
              )}
              {roundCount > 1 && !isPlaying && (
                <button
                  onClick={handlePlay}
                  className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400"
                  title="Spela upp"
                >
                  <Play size={14} />
                </button>
              )}
              
              {/* Edit button - visible but disabled during play */}
              {canEdit && status !== 'finished' && (
                <button
                  onClick={() => !isPlaying && setIsEditing(true)}
                  disabled={isPlaying}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isPlaying 
                      ? 'bg-white/5 text-gray-600 cursor-not-allowed' 
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                  title="Redigera"
                >
                  <Edit3 size={14} />
                </button>
              )}
              
              {/* Status toggle - finish/reopen */}
              {canEdit && onToggleStatus && (
                <button
                  onClick={() => !isPlaying && onToggleStatus(status === 'finished' ? 'active' : 'finished')}
                  disabled={isPlaying}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isPlaying 
                      ? 'bg-white/5 text-gray-600 cursor-not-allowed' 
                      : status === 'finished'
                        ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                  title={status === 'finished' ? 'Öppna igen' : 'Avsluta tävlingen'}
                >
                  {status === 'finished' ? <Unlock size={14} /> : <Lock size={14} />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Table content */}
      <div className="flex-1 overflow-y-auto">
        {participants.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Inga deltagare tillagda än
          </div>
        ) : isEditing ? (
          /* Edit mode */
          <div className="p-4 space-y-2">
            {participants.map((participant, index) => {
              const isCurrentUser = participant.email?.toLowerCase() === currentUserEmail;
              return (
                <div 
                  key={participant.email}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isCurrentUser ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : 'bg-white/[0.03]'
                  }`}
                >
                  <Avatar 
                    name={participant.name} 
                    email={participant.email} 
                    isCurrentUser={isCurrentUser}
                  />
                  <span className={`flex-1 text-sm truncate ${isCurrentUser ? 'text-blue-300' : 'text-gray-300'}`}>
                    {participant.name || participant.email?.split('@')[0]}
                  </span>
                  <input
                    ref={el => inputRefs.current[participant.email] = el}
                    type="number"
                    inputMode="numeric"
                    value={editScores[participant.email] ?? ''}
                    onChange={(e) => handleScoreChange(participant.email, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, participant.email, index)}
                    placeholder="0"
                    className="w-20 px-3 py-2 text-sm text-right bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-600"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          /* View mode - Table */
          <div className="p-4">
            {/* Table header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 text-xs text-gray-500 uppercase">
              <span className="w-6 text-center">#</span>
              <span className="w-6 text-center">+/-</span>
              <span className="flex-1">Deltagare</span>
              <button
                onClick={() => setSortBy('round')}
                className={`w-16 text-right hover:text-gray-300 ${sortBy === 'round' ? 'text-blue-400' : ''}`}
              >
                Runda {currentRound + 1}
              </button>
              <button
                onClick={() => setSortBy('total')}
                className={`w-16 text-right hover:text-gray-300 ${sortBy === 'total' ? 'text-blue-400' : ''}`}
              >
                Total
              </button>
            </div>
            
            {/* Table rows */}
            <div className="space-y-1 mt-2">
              {rankedParticipants.map((participant, index) => {
                const rank = index + 1;
                const rankChange = getRankChange(participant.email, currentRound);
                const isCurrentUser = participant.email?.toLowerCase() === currentUserEmail;
                const isFocused = participant.email === focusedParticipant;
                const offset = rowOffsets[participant.email] || 0;
                
                return (
                  <div 
                    key={participant.email}
                    ref={el => rowRefs.current[participant.email] = el}
                    onClick={() => setFocusedParticipant(participant.email)}
                    style={{
                      transform: offset ? `translateY(${offset}px)` : 'translateY(0)',
                      transition: offset ? 'none' : 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer ${
                      isCurrentUser 
                        ? 'bg-blue-500/15 ring-1 ring-blue-500/40' 
                        : isFocused 
                          ? 'bg-white/10 ring-1 ring-white/20'
                          : 'bg-white/[0.03] hover:bg-white/[0.06]'
                    } ${isPlaying && isFocused ? 'ring-2 ring-blue-400/60 scale-[1.02]' : ''}`}
                  >
                    <div className="w-6 flex justify-center">
                      <RankDisplay rank={rank} />
                    </div>
                    <div className="w-6 flex justify-center">
                      <RankChangeIndicator change={rankChange} />
                    </div>
                    <Avatar 
                      name={participant.name} 
                      email={participant.email} 
                      isCurrentUser={isCurrentUser}
                    />
                    <span className={`flex-1 text-sm truncate ${
                      isCurrentUser ? 'text-blue-300 font-medium' : 'text-gray-300'
                    }`}>
                      {participant.name || participant.email?.split('@')[0]}
                      {isCurrentUser && ' (du)'}
                    </span>
                    <span className="w-16 text-right text-sm tabular-nums text-gray-400">
                      {participant.roundScore || '–'}
                    </span>
                    <span className={`w-16 text-right text-sm font-medium tabular-nums ${
                      isCurrentUser ? 'text-blue-400' : 'text-gray-300'
                    }`}>
                      {participant.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer - Edit mode actions */}
      {isEditing && (
        <div className="px-4 py-3 border-t border-white/10 bg-gray-900/50 flex gap-3">
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-400 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Spara
          </button>
        </div>
      )}
      
      {/* Delete round confirm dialog */}
      {showDeleteRoundConfirm && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-10">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">Ta bort runda?</h3>
            <p className="text-gray-400 text-sm mb-4">
              Är du säker på att du vill ta bort runda {currentRound + 1}? Alla poäng för denna runda kommer att försvinna.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteRoundConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium"
              >
                Avbryt
              </button>
              <button
                onClick={handleDeleteRound}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-400 text-sm font-medium"
              >
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
