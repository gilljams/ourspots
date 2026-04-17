import React, { useState, useEffect, useRef } from 'react';
import { Trophy, ChevronDown, ChevronRight, Lock, Unlock, Edit2, RotateCcw, Target, User } from 'lucide-react';
import { useConfirm } from '../../utils/useConfirm';

// Leaderboard Block - ranking/competition display (golf etc.)
export const LeaderboardBlock = ({ data, currentUser, shares = {}, canEdit = false, onOpenModal, onCloseLeaderboard, onReopenLeaderboard, onResetLeaderboard, onExpand }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const [showEditMode, setShowEditMode] = useState(false);
  const confirm = useConfirm();
  const blockRef = useRef(null);
  
  const title = data.title || (data.competitionType === 'longestdrive' ? 'Longest Drive' : data.competitionType === 'team' ? 'Lagtävling' : 'Leaderboard');
  const displayTitle = title;
  const participants = data.participants || [];
  const roundCount = data.roundCount || 0;
  const scores = data.scores || {};
  const shots = data.shots || {};
  const status = data.status || 'active';
  const sortOrder = data.sortOrder || 'desc';
  const mode = data.mode || 'single';
  const competitionType = data.competitionType || 'single';
  const isTeamMode = mode === 'team';
  const isLongestDrive = competitionType === 'longestdrive';
  const isTeamCompetition = competitionType === 'team';
  const golfRounds = data.golfRounds || [];
  
  const currentUserEmail = currentUser?.email?.toLowerCase();
  
  // Sync collapsed state when defaultCollapsed changes
  useEffect(() => {
    setIsCollapsed(data.defaultCollapsed ?? true);
  }, [data.defaultCollapsed]);
  
  // Scroll into view when expanded
  const handleToggleCollapse = () => {
    const wasCollapsed = isCollapsed;
    setIsCollapsed(!isCollapsed);
    if (wasCollapsed && onExpand) {
      setTimeout(() => onExpand(blockRef.current), 100);
    }
  };
  
  // Calculate total score for a participant (for score mode)
  const getTotalScore = (email) => {
    const participantScores = scores[email] || {};
    return Object.values(participantScores).reduce((sum, score) => sum + (score || 0), 0);
  };
  
  // Get best drive for a participant (for longestdrive mode)
  const getBestDrive = (email) => {
    const participantShots = shots[email] || {};
    let bestDistance = 0;
    let bestRound = null;
    let isFairway = true;
    
    Object.entries(participantShots).forEach(([roundIdx, shot]) => {
      if (shot.fairway && shot.distance > bestDistance) {
        bestDistance = shot.distance;
        bestRound = parseInt(roundIdx);
        isFairway = shot.fairway;
      }
    });
    
    // If no fairway shots, get best overall but mark as DQ
    if (bestDistance === 0) {
      Object.entries(participantShots).forEach(([roundIdx, shot]) => {
        if (shot.distance > bestDistance) {
          bestDistance = shot.distance;
          bestRound = parseInt(roundIdx);
          isFairway = shot.fairway;
        }
      });
    }
    
    return { distance: bestDistance, round: bestRound, fairway: isFairway };
  };
  
  // Get ranked participants
  const getRankedParticipants = () => {
    if (isLongestDrive) {
      const qualified = [];
      const disqualified = [];
      
      participants.forEach(p => {
        const best = getBestDrive(p.email);
        const pData = { ...p, distance: best.distance, fairway: best.fairway, bestRound: best.round };
        if (best.fairway && best.distance > 0) {
          qualified.push(pData);
        } else if (best.distance > 0) {
          disqualified.push(pData);
        } else {
          disqualified.push({ ...pData, distance: 0, fairway: true });
        }
      });
      
      qualified.sort((a, b) => b.distance - a.distance);
      disqualified.sort((a, b) => b.distance - a.distance);
      
      return [...qualified, ...disqualified];
    }
    
    return participants
      .map(p => ({
        ...p,
        total: getTotalScore(p.email)
      }))
      .sort((a, b) => sortOrder === 'desc' ? b.total - a.total : a.total - b.total);
  };
  
  const rankedParticipants = getRankedParticipants();
  const top3 = rankedParticipants.filter(p => isLongestDrive ? p.fairway : true).slice(0, 3);
  const hasScores = isLongestDrive 
    ? rankedParticipants.some(p => p.distance > 0)
    : rankedParticipants.some(p => p.total > 0);
  
  // Get per-round winners for longest drive
  const getRoundWinners = () => {
    const rounds = data.rounds || [];
    const winners = [];
    for (let i = 0; i < roundCount; i++) {
      let best = null;
      participants.forEach(p => {
        const shot = shots[p.email]?.[i];
        if (shot?.distance > 0 && shot?.fairway) {
          if (!best || shot.distance > best.distance) {
            best = { name: p.name || p.email?.split('@')[0], email: p.email, distance: shot.distance, holeNumber: rounds[i]?.holeNumber };
          }
        }
      });
      winners.push(best);
    }
    return winners;
  };

  // Find current user's rank if not in top 3
  const qualifiedParticipants = isLongestDrive 
    ? rankedParticipants.filter(p => p.fairway && p.distance > 0)
    : rankedParticipants;
  const currentUserRank = qualifiedParticipants.findIndex(p => p.email?.toLowerCase() === currentUserEmail) + 1;
  const currentUserData = currentUserRank > 3 ? qualifiedParticipants[currentUserRank - 1] : null;
  
  // Medal/rank icons
  const RankIcon = ({ rank }) => {
    if (rank === 1) return <Trophy size={14} className="text-amber-400" />;
    if (rank === 2) return <Trophy size={14} className="text-gray-300" />;
    if (rank === 3) return <Trophy size={14} className="text-orange-600" />;
    return <span className="text-xs text-gray-500 w-3.5 text-center">{rank}</span>;
  };
  
  if (participants.length === 0) {
    return (
      <div className="bg-white/[0.03] rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Trophy size={18} className="text-amber-400" />
          <span className="text-sm">{displayTitle} – inga deltagare tillagda än</span>
        </div>
      </div>
    );
  }
  
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
            {isLongestDrive ? (
              <Target size={16} className="text-gray-400 flex-shrink-0" />
            ) : (
              <Trophy size={16} className="text-gray-400 flex-shrink-0" />
            )}
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
              {displayTitle}
            </span>
          </div>
          {status === 'finished' ? (
            <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-500 flex items-center gap-1.5">
              <Lock size={10} />
              Avslutad
            </span>
          ) : (
            <span className="text-xs text-gray-500 tabular-nums">{participants.length} deltagare</span>
          )}
        </button>
        {/* Edit mode toggle */}
        {!isCollapsed && canEdit && (
          <button
            onClick={() => setShowEditMode(!showEditMode)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              showEditMode ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            title="Redigera"
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>
      
      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="bg-white/[0.03] rounded-xl p-4 space-y-3">
          {/* Edit mode panel */}
          {showEditMode && canEdit && (
            <div className="flex items-center justify-end gap-3 px-4 py-2 border-b border-white/5 -mx-4 -mt-2 mb-1">
              {status !== 'finished' && onCloseLeaderboard && (
                <button
                  onClick={async () => {
                    if (await confirm({ title: 'Avsluta leaderboard?', message: 'Inga fler rundor kan läggas till.', confirmText: 'Avsluta', variant: 'warning' })) {
                      onCloseLeaderboard();
                      setShowEditMode(false);
                    }
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                  <Lock size={11} />
                  Avsluta
                </button>
              )}
              {status === 'finished' && onReopenLeaderboard && (
                <button
                  onClick={async () => {
                    if (await confirm({ title: 'Öppna leaderboard?', message: 'Rundor kan läggas till igen.', confirmText: 'Öppna', variant: 'info' })) {
                      onReopenLeaderboard();
                      setShowEditMode(false);
                    }
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                  <Unlock size={11} />
                  Öppna
                </button>
              )}
              {roundCount > 0 && onResetLeaderboard && status !== 'finished' && status !== 'finished' && (
                <button
                  onClick={async () => {
                    if (await confirm({ title: 'Nollställ poäng?', message: 'Alla poäng raderas. Detta kan inte ångras.', confirmText: 'Nollställ', variant: 'danger' })) {
                      onResetLeaderboard();
                      setShowEditMode(false);
                    }
                  }}
                  className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={11} />
                  Nollställ
                </button>
              )}
            </div>
          )}
          
          {/* Top 3 preview + current user if outside top 3 */}
          {hasScores ? (
            isLongestDrive ? (
              /* Longest drive: show per-round winners */
              <div className="space-y-1">
                {getRoundWinners().map((winner, idx) => {
                  const isCurrentUser = winner?.email?.toLowerCase() === currentUserEmail;
                  const holeLabel = winner?.holeNumber ? `R${idx + 1} H${winner.holeNumber}` : `R${idx + 1}`;
                  return (
                    <div 
                      key={idx}
                      className={`flex items-center gap-3 py-1.5 px-2 rounded-lg ${
                        isCurrentUser ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : ''
                      }`}
                    >
                      <span className="text-xs text-gray-500 w-14 flex-shrink-0">{holeLabel}</span>
                      {winner ? (
                        <>
                          <span className={`text-sm flex-1 truncate ${isCurrentUser ? 'text-blue-300 font-medium' : 'text-gray-300'}`}>
                            {winner.name}
                            {isCurrentUser && ' (du)'}
                          </span>
                          <span className="text-sm font-medium text-gray-400 tabular-nums">
                            {winner.distance}m
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500 flex-1">–</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Score mode: show top 3 ranked */
              <div className="space-y-1">
                {top3.map((participant, idx) => {
                  const rank = idx + 1;
                  const isCurrentUser = participant.email?.toLowerCase() === currentUserEmail;
                  return (
                    <div 
                      key={participant.email}
                      className={`flex items-center gap-3 py-1.5 px-2 rounded-lg ${
                        isCurrentUser ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : ''
                      }`}
                    >
                      <RankIcon rank={rank} />
                      {(() => {
                        const initial = (participant.name || participant.email || '?')[0].toUpperCase();
                        const hash = (participant.email || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                        const hue = hash % 360;
                        const bg = isTeamMode && participant.team === 1 ? 'bg-blue-500' :
                          isTeamMode && participant.team === 2 ? 'bg-orange-500' :
                          isCurrentUser ? 'bg-blue-500' : undefined;
                        return (
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white ${bg || ''}`}
                            style={!bg ? { background: `hsl(${hue}, 45%, 35%)` } : undefined}
                          >
                            {initial}
                          </div>
                        );
                      })()}
                      <span className={`text-sm flex-1 truncate ${isCurrentUser ? 'text-blue-300 font-medium' : 'text-gray-300'}`}>
                        {participant.name || participant.email?.split('@')[0]}
                        {isCurrentUser && ' (du)'}
                      </span>
                      <span className="text-sm font-medium text-gray-400 tabular-nums">
                        {participant.total}p
                      </span>
                    </div>
                  );
                })}
                
                {/* Show current user if outside top 3 */}
                {currentUserData && (
                  <>
                    <div className="text-xs text-gray-600 text-center py-0.5">···</div>
                    <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/30">
                      <span className="text-xs text-gray-500 w-3.5 text-center">{currentUserRank}</span>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white bg-blue-500">
                        {(currentUserData.name || currentUserData.email || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-sm flex-1 truncate text-blue-300 font-medium">
                        {currentUserData.name || currentUserData.email?.split('@')[0]} (du)
                      </span>
                      <span className="text-sm font-medium text-gray-400 tabular-nums">
                        {currentUserData.total}p
                      </span>
                    </div>
                  </>
                )}
                
                {qualifiedParticipants.length > 3 && !currentUserData && (
                  <div className="text-xs text-gray-500 pl-2 pt-1">
                    +{qualifiedParticipants.length - 3} till...
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="text-sm text-gray-500 text-center py-2">
              {isLongestDrive ? 'Inga drives registrerade än' : isTeamCompetition ? 'Inga rundor spelade än' : 'Inga poäng registrerade än'}
            </div>
          )}

          {/* Golf: round count info */}
          {isTeamCompetition && golfRounds.length > 0 && (
            <div className="flex items-center justify-between px-2 py-1.5 bg-white/[0.02] rounded-lg">
              <span className="text-xs text-gray-400">{golfRounds.length} {golfRounds.length === 1 ? 'runda' : 'rundor'}</span>
            </div>
          )}
          
          {/* View full leaderboard button */}
          {onOpenModal && (
            <button
              onClick={onOpenModal}
              className="w-full py-2.5 text-sm text-blue-400 hover:bg-white/5 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-white/10"
            >
              {isLongestDrive ? 'Öppna tävling' : isTeamCompetition ? 'Öppna lagtävling' : 'Visa leaderboard'}
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
