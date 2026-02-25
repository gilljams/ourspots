import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Vote, Lock, Check, HelpCircle, X, Trophy, Edit2, RotateCcw, Plus, Users, Link } from 'lucide-react';

// Poll block - allows viewers to vote (date poll or ranked poll)
export const PollBlock = ({ data, currentUser, onVote, shares = {}, userDisplayName = '', onClosePoll, onResetPoll, canEdit = false, onAddOption, onRemoveOption, onExpand }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? false);
  const [showDetails, setShowDetails] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [newSuggestionUrl, setNewSuggestionUrl] = useState('');
  const [showSuggestionInput, setShowSuggestionInput] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const blockRef = useRef(null);
  const options = data.options || [];
  const votes = data.votes || {};
  const title = data.title || 'Omröstning';
  const pollType = data.pollType || 'date'; // 'date' or 'ranked'
  const isClosed = data.closed || false;
  const allowSuggestions = data.allowSuggestions || false;
  
  // Sync collapsed state when defaultCollapsed changes
  useEffect(() => {
    setIsCollapsed(data.defaultCollapsed ?? false);
  }, [data.defaultCollapsed]);
  
  // Scroll into view when expanded
  const handleToggleCollapse = () => {
    const wasCollapsed = isCollapsed;
    setIsCollapsed(!isCollapsed);
    if (wasCollapsed && onExpand) {
      setTimeout(() => onExpand(blockRef.current), 100);
    }
  };
  
  // Get current user's email key
  const getUserEmailKey = (email) => {
    if (!email) return null;
    return email.replace(/\./g, '_DOT_');
  };
  
  const currentUserKey = currentUser?.email ? getUserEmailKey(currentUser.email) : null;
  
  // Check if user has pending share (not accepted yet)
  const isPendingShare = currentUserKey && shares[currentUserKey]?.status === 'pending';
  
  // votes[emailKey] can be { displayName: string, votes: { optionId: voteType } } or legacy { optionId: voteType }
  const currentUserData = currentUserKey ? (votes[currentUserKey] || {}) : {};
  const currentUserVotes = currentUserData.votes || (typeof currentUserData === 'object' && !currentUserData.displayName ? currentUserData : {});
  
  // Get all participants (owner + shared users)
  const getParticipants = () => {
    const participants = [];
    
    Object.entries(votes).forEach(([emailKey, userData]) => {
      const email = emailKey.replace(/_DOT_/g, '.');
      const userVotes = userData.votes || (typeof userData === 'object' && !userData.displayName ? userData : {});
      const displayName = userData.displayName || email.split('@')[0];
      
      if (Object.keys(userVotes).length > 0) {
        participants.push({
          emailKey,
          email,
          displayName,
          votes: userVotes
        });
      }
    });
    
    return participants;
  };
  
  // Calculate results for each option
  const getOptionResults = (optionId) => {
    const participants = getParticipants();
    let yes = 0, no = 0, maybe = 0;
    const voterDetails = { yes: [], no: [], maybe: [] };
    
    participants.forEach(p => {
      const vote = p.votes[optionId];
      if (vote === 'yes') {
        yes++;
        voterDetails.yes.push(p.displayName);
      } else if (vote === 'no') {
        no++;
        voterDetails.no.push(p.displayName);
      } else if (vote === 'maybe') {
        maybe++;
        voterDetails.maybe.push(p.displayName);
      }
    });
    
    return { yes, no, maybe, total: participants.length, voterDetails };
  };
  
  // Find best option (most "yes" votes, least "no" votes as tiebreaker)
  const getBestOptions = () => {
    if (options.length === 0) return [];
    
    const optionScores = options.map(opt => {
      const results = getOptionResults(opt.id);
      const score = results.yes * 10 - results.no * 5 + results.maybe;
      return { option: opt, results, score };
    });
    
    const bestScore = Math.max(...optionScores.map(o => o.score));
    return optionScores.filter(o => o.score === bestScore);
  };
  
  const handleVote = (optionId, voteType) => {
    if (!currentUserKey || !onVote || isClosed) return;
    
    const currentVote = currentUserVotes[optionId];
    const newVote = currentVote === voteType ? null : voteType;
    
    const newUserVotes = { ...currentUserVotes };
    if (newVote === null) {
      delete newUserVotes[optionId];
    } else {
      newUserVotes[optionId] = newVote;
    }
    
    const effectiveDisplayName = userDisplayName || currentUser?.email?.split('@')[0] || '';
    const newVotes = { 
      ...votes, 
      [currentUserKey]: {
        displayName: effectiveDisplayName,
        votes: newUserVotes
      }
    };
    onVote(newVotes);
  };
  
  // Handle ranked voting (1st, 2nd, 3rd place)
  const handleRankVote = (optionId, rank) => {
    if (!currentUserKey || !onVote || isClosed) return;
    
    const newUserVotes = { ...currentUserVotes };
    
    if (newUserVotes[optionId] === rank) {
      delete newUserVotes[optionId];
    } else {
      Object.keys(newUserVotes).forEach(key => {
        if (newUserVotes[key] === rank) {
          delete newUserVotes[key];
        }
      });
      newUserVotes[optionId] = rank;
    }
    
    const effectiveDisplayName = userDisplayName || currentUser?.email?.split('@')[0] || '';
    const newVotes = {
      ...votes,
      [currentUserKey]: {
        displayName: effectiveDisplayName,
        votes: newUserVotes
      }
    };
    onVote(newVotes);
  };
  
  // Calculate ranked scores (1st=3p, 2nd=2p, 3rd=1p)
  const getRankedScores = () => {
    const scores = {};
    options.forEach(opt => {
      scores[opt.id] = { first: 0, second: 0, third: 0, total: 0, voters: { first: [], second: [], third: [] } };
    });
    
    Object.entries(votes).forEach(([emailKey, userData]) => {
      const userVotes = userData.votes || (typeof userData === 'object' && !userData.displayName ? userData : {});
      const displayName = userData.displayName || emailKey.replace(/_DOT_/g, '.').split('@')[0];
      
      Object.entries(userVotes).forEach(([optionId, rank]) => {
        if (scores[optionId]) {
          if (rank === 1) {
            scores[optionId].first++;
            scores[optionId].total += 3;
            scores[optionId].voters.first.push(displayName);
          } else if (rank === 2) {
            scores[optionId].second++;
            scores[optionId].total += 2;
            scores[optionId].voters.second.push(displayName);
          } else if (rank === 3) {
            scores[optionId].third++;
            scores[optionId].total += 1;
            scores[optionId].voters.third.push(displayName);
          }
        }
      });
    });
    
    return scores;
  };
  
  const bestOptions = getBestOptions();
  const bestOptionIds = new Set(bestOptions.map(b => b.option.id));
  const rankedScores = pollType === 'ranked' ? getRankedScores() : null;
  
  // Sort options by score if closed (for ranked polls)
  const compareRankedOptions = (a, b) => {
    const scoreA = rankedScores[a.id] || { total: 0, first: 0, second: 0, third: 0 };
    const scoreB = rankedScores[b.id] || { total: 0, first: 0, second: 0, third: 0 };
    if (scoreB.total !== scoreA.total) return scoreB.total - scoreA.total;
    if (scoreB.first !== scoreA.first) return scoreB.first - scoreA.first;
    if (scoreB.second !== scoreA.second) return scoreB.second - scoreA.second;
    return scoreB.third - scoreA.third;
  };
  
  const sortedOptions = pollType === 'ranked' && isClosed && rankedScores
    ? [...options].sort(compareRankedOptions)
    : options;
  
  // Get winner(s) for ranked poll (considering tiebreaker)
  const getWinners = () => {
    if (!rankedScores || options.length === 0) return new Set();
    const sorted = [...options].sort(compareRankedOptions);
    const topScore = rankedScores[sorted[0]?.id];
    if (!topScore || topScore.total === 0) return new Set();
    return new Set(sorted.filter(opt => {
      const s = rankedScores[opt.id];
      return s && s.total === topScore.total && s.first === topScore.first && 
             s.second === topScore.second && s.third === topScore.third;
    }).map(opt => opt.id));
  };
  const rankedWinners = pollType === 'ranked' ? getWinners() : new Set();
  
  // Compact vote button component (for date poll)
  const VoteButton = ({ optionId, voteType, icon, activeClass }) => {
    const isActive = currentUserVotes[optionId] === voteType;
    const isDisabled = !currentUserKey || !onVote || isClosed;
    return (
      <button
        onClick={() => handleVote(optionId, voteType)}
        disabled={isDisabled}
        className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
          isActive 
            ? activeClass
            : `bg-white/5 text-gray-500 hover:bg-white/10 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`
        }`}
        title={voteType === 'yes' ? 'Kan' : voteType === 'no' ? 'Kan inte' : 'Kanske'}
      >
        {icon}
      </button>
    );
  };
  
  // Rank button component (for ranked poll)
  const RankButton = ({ optionId, rank }) => {
    const isActive = currentUserVotes[optionId] === rank;
    const isDisabled = !currentUserKey || !onVote || isClosed;
    const colors = {
      1: { active: 'bg-amber-500/30 text-amber-400 ring-1 ring-amber-500/50', inactive: 'text-amber-400/50' },
      2: { active: 'bg-gray-400/30 text-gray-300 ring-1 ring-gray-400/50', inactive: 'text-gray-400/50' },
      3: { active: 'bg-orange-700/30 text-orange-500 ring-1 ring-orange-600/50', inactive: 'text-orange-500/50' }
    };
    return (
      <button
        onClick={() => handleRankVote(optionId, rank)}
        disabled={isDisabled}
        className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
          isActive 
            ? colors[rank].active
            : `bg-white/5 ${colors[rank].inactive} hover:bg-white/10 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`
        }`}
        title={rank === 1 ? '1:a (3p)' : rank === 2 ? '2:a (2p)' : '3:a (1p)'}
      >
        <Trophy size={14} />
      </button>
    );
  };
  
  // Only show empty state if no options AND suggestions are not allowed
  if (options.length === 0 && !allowSuggestions) {
    return (
      <div className="text-gray-500 text-sm py-2">
        Inga alternativ har lagts till än.
      </div>
    );
  }
  
  const participants = getParticipants();
  const voteCount = Object.keys(votes).length;
  
  return (
    <div ref={blockRef} className="space-y-2">
      {/* Collapsible header */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleCollapse}
          className="flex-1 flex items-center gap-2.5 py-2 group touch-manipulation"
        >
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <ChevronDown 
              size={16} 
              className={`text-gray-400 group-hover:text-white transition-all ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
            />
          </div>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Vote size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
              {title}
            </span>
          </div>
          {isClosed ? (
            <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-500 flex items-center gap-1.5">
              <Lock size={10} />
              Avslutad
            </span>
          ) : (
            <span className="text-xs text-gray-500 tabular-nums">{participants.length} röster</span>
          )}
        </button>
        {/* Edit mode toggle */}
        {!isCollapsed && canEdit && (
          <button
            onClick={() => setShowEditMode(!showEditMode)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              showEditMode ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            title="Redigera"
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>
      
      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="space-y-2">
          {/* Edit mode panel */}
          {showEditMode && canEdit && (
            <div className="flex gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
              {!isClosed && onClosePoll && (
                <button
                  onClick={() => {
                    if (window.confirm('Vill du avsluta omröstningen? Ingen kan rösta efteråt.')) {
                      onClosePoll();
                      setShowEditMode(false);
                    }
                  }}
                  className="flex-1 py-1.5 text-xs text-amber-400 hover:bg-amber-500/20 rounded flex items-center justify-center gap-1"
                >
                  <Lock size={12} />
                  Avsluta
                </button>
              )}
              {voteCount > 0 && onResetPoll && (
                <button
                  onClick={() => {
                    if (window.confirm('Vill du nollställa alla röster? Detta kan inte ångras.')) {
                      onResetPoll();
                      setShowEditMode(false);
                    }
                  }}
                  className="flex-1 py-1.5 text-xs text-red-400 hover:bg-red-500/20 rounded flex items-center justify-center gap-1"
                >
                  <RotateCcw size={12} />
                  Nollställ ({voteCount})
                </button>
              )}
            </div>
          )}
          
          {/* Options with voting */}
          {pollType === 'ranked' ? (
            // Ranked poll view
            <div className="space-y-2">
              {sortedOptions.map((option, idx) => {
                const score = rankedScores?.[option.id] || { first: 0, second: 0, third: 0, total: 0, voters: { first: [], second: [], third: [] } };
                const isWinner = isClosed && rankedWinners.has(option.id) && score.total > 0;
                
                return (
                  <div 
                    key={option.id} 
                    className={`flex items-center gap-3 p-2 rounded-lg ${isWinner ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : 'bg-white/5'}`}
                  >
                    {/* Winner/position indicator */}
                    <div className="w-5 flex-shrink-0 flex items-center justify-center">
                      {isWinner ? (
                        <Trophy size={14} className="text-amber-400" />
                      ) : isClosed ? (
                        <span className="text-xs text-gray-500">{idx + 1}.</span>
                      ) : null}
                    </div>
                    
                    {/* Option label with optional URL */}
                    <div className="flex-1 min-w-0">
                      {option.url ? (
                        <a 
                          href={option.url.startsWith('http') ? option.url : `https://${option.url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`text-sm truncate flex items-center gap-1.5 hover:underline ${isWinner ? 'text-amber-100 font-medium' : 'text-blue-400'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link size={12} className="flex-shrink-0" />
                          <span className="truncate">{option.label}</span>
                        </a>
                      ) : (
                        <span className={`text-sm truncate block ${isWinner ? 'text-white font-medium' : 'text-gray-300'}`}>
                          {option.label}
                        </span>
                      )}
                      {/* Score display */}
                      {(score.total > 0 || isClosed) && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="font-medium">{score.total}p</span>
                          {showDetails && score.total > 0 && (
                            <span className="truncate flex items-center gap-1">
                              {score.first > 0 && <><Trophy size={10} className="text-amber-400" />{score.voters.first.join(', ')}</>}
                              {score.second > 0 && <><Trophy size={10} className="text-gray-300 ml-1" />{score.voters.second.join(', ')}</>}
                              {score.third > 0 && <><Trophy size={10} className="text-orange-500 ml-1" />{score.voters.third.join(', ')}</>}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Rank buttons (only if not closed) */}
                    {!isClosed && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <RankButton optionId={option.id} rank={1} />
                        <RankButton optionId={option.id} rank={2} />
                        <RankButton optionId={option.id} rank={3} />
                      </div>
                    )}
                    
                    {/* Remove button */}
                    {!isClosed && allowSuggestions && onRemoveOption && (
                      <div className="w-6 flex-shrink-0 flex justify-center">
                        {option.addedBy === currentUserKey && (
                          <button
                            onClick={() => onRemoveOption(option.id)}
                            className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Ta bort ditt förslag"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Date poll view (original)
            <div className="space-y-2">
              {sortedOptions.map((option) => {
                const results = getOptionResults(option.id);
                const isBest = bestOptionIds.has(option.id) && participants.length > 0 && results.yes > 0;
                const isTied = bestOptions.length > 1 && isBest;
                
                return (
                  <div 
                    key={option.id} 
                    className={`flex items-center gap-3 p-2 rounded-lg ${isBest ? 'bg-white/10' : 'bg-white/5'}`}
                  >
                    {/* Best indicator */}
                    <div className="w-3.5 flex-shrink-0 flex items-center justify-center">
                      {isBest && (
                        <Trophy size={14} className={isTied ? 'text-amber-400/60' : 'text-amber-400'} />
                      )}
                    </div>
                    
                    {/* Option label and results */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm truncate block ${isBest ? 'text-white font-medium' : 'text-gray-300'}`}>
                        {option.label}
                      </span>
                      {participants.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{results.yes}/{participants.length}</span>
                          {showDetails && results.yes > 0 && (
                            <span className="truncate">({results.voterDetails.yes.join(', ')})</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Vote buttons (only if not closed) */}
                    {!isClosed && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <VoteButton 
                          optionId={option.id} 
                          voteType="yes" 
                          icon={<Check size={14} />} 
                          activeClass="bg-green-500/20 text-green-400"
                        />
                        <VoteButton 
                          optionId={option.id} 
                          voteType="maybe" 
                          icon={<HelpCircle size={14} />} 
                          activeClass="bg-amber-500/20 text-amber-400"
                        />
                        <VoteButton 
                          optionId={option.id} 
                          voteType="no" 
                          icon={<X size={14} />} 
                          activeClass="bg-red-500/20 text-red-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Suggestion input */}
          {allowSuggestions && !isClosed && currentUserKey && onAddOption && showSuggestionInput && (
            <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSuggestion}
                  onChange={(e) => setNewSuggestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSuggestion.trim()) {
                      const finalUrl = newSuggestionUrl.trim();
                      const processedUrl = finalUrl && !finalUrl.match(/^https?:\/\//) 
                        ? `https://${finalUrl.replace(/^www\./, 'www.')}` 
                        : finalUrl;
                      onAddOption(newSuggestion.trim(), currentUserKey, pollType === 'ranked' ? processedUrl : null);
                      setNewSuggestion('');
                      setNewSuggestionUrl('');
                      setShowSuggestionInput(false);
                    } else if (e.key === 'Escape') {
                      setNewSuggestion('');
                      setNewSuggestionUrl('');
                      setShowSuggestionInput(false);
                    }
                  }}
                  placeholder={pollType === 'ranked' ? "Nytt alternativ" : "Nytt förslag"}
                  className="flex-1 min-w-0 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (newSuggestion.trim()) {
                      const finalUrl = newSuggestionUrl.trim();
                      const processedUrl = finalUrl && !finalUrl.match(/^https?:\/\//) 
                        ? `https://${finalUrl.replace(/^www\./, 'www.')}` 
                        : finalUrl;
                      onAddOption(newSuggestion.trim(), currentUserKey, pollType === 'ranked' ? processedUrl : null);
                      setNewSuggestion('');
                      setNewSuggestionUrl('');
                      setShowSuggestionInput(false);
                    }
                  }}
                  disabled={!newSuggestion.trim()}
                  className="w-8 h-8 flex-shrink-0 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  title="Lägg till"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() => {
                    setNewSuggestion('');
                    setNewSuggestionUrl('');
                    setShowSuggestionInput(false);
                  }}
                  className="w-8 h-8 flex-shrink-0 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 transition-colors flex items-center justify-center"
                  title="Avbryt"
                >
                  <X size={14} />
                </button>
              </div>
              {pollType === 'ranked' && (
                <input
                  type="text"
                  value={newSuggestionUrl}
                  onChange={(e) => setNewSuggestionUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSuggestion.trim()) {
                      const finalUrl = newSuggestionUrl.trim();
                      const processedUrl = finalUrl && !finalUrl.match(/^https?:\/\//) 
                        ? `https://${finalUrl.replace(/^www\./, 'www.')}` 
                        : finalUrl;
                      onAddOption(newSuggestion.trim(), currentUserKey, pollType === 'ranked' ? processedUrl : null);
                      setNewSuggestion('');
                      setNewSuggestionUrl('');
                      setShowSuggestionInput(false);
                    }
                  }}
                  placeholder="www.example.com"
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-blue-400 placeholder-gray-500"
                />
              )}
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-1">
              {participants.length > 0 || (pollType === 'ranked' && Object.keys(votes).length > 0) ? (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${showDetails ? 'bg-blue-500/30' : 'bg-white/10'}`}
                  title={showDetails ? 'Kompakt vy' : 'Visa namn'}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform flex items-center justify-center ${showDetails ? 'translate-x-7' : 'translate-x-1'}`}>
                    {showDetails ? <Users size={10} className="text-blue-600" /> : <Vote size={10} className="text-gray-600" />}
                  </div>
                </button>
              ) : (
                <span className="text-xs text-gray-500">Ingen har röstat än</span>
              )}
              {allowSuggestions && !isClosed && currentUserKey && onAddOption && !showSuggestionInput && (
                <button
                  onClick={() => setShowSuggestionInput(true)}
                  className="py-1.5 px-3 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg flex items-center gap-1.5 transition-colors border border-blue-500/20"
                >
                  <Plus size={14} />
                  Föreslå
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!currentUserKey && !isClosed && (
                <span className="text-xs text-gray-500 italic">Logga in för att rösta</span>
              )}
              {currentUserKey && isPendingShare && !isClosed && (
                <span className="text-xs text-amber-500 italic">Acceptera delningen för att rösta</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
