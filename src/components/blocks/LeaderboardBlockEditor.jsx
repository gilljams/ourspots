import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Trophy, Target, Plus, Trash2, RotateCcw, Check } from 'lucide-react';

// Leaderboard Block Editor - competition/ranking configuration
function LeaderboardBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving, shares = {}, currentUser, currentUserDisplayName }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const getDefaultTitle = (type) => type === 'longestdrive' ? 'Longest Drive' : 'Leaderboard';
  const [title, setTitle] = useState(block.title || getDefaultTitle(block.competitionType));
  const [participants, setParticipants] = useState(block.participants || []);
  const [roundCount, setRoundCount] = useState(block.roundCount || 0);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? true);
  const [status, setStatus] = useState(block.status || 'active');
  const [mode, setMode] = useState(block.mode || 'single'); // 'single' or 'team'
  const [competitionType, setCompetitionType] = useState(block.competitionType || 'score'); // 'score' or 'longestdrive'
  const [teams, setTeams] = useState(block.teams || [
    { id: 1, name: 'Lag 1' },
    { id: 2, name: 'Lag 2' }
  ]);
  const [selectedTeam, setSelectedTeam] = useState(1); // Which team is selected for adding members

  // Sync with block changes
  useEffect(() => {
    const defaultTitle = getDefaultTitle(block.competitionType);
    setTitle(block.title || defaultTitle);
    setParticipants(block.participants || []);
    setRoundCount(block.roundCount || 0);
    setDefaultCollapsed(block.defaultCollapsed ?? true);
    setStatus(block.status || 'active');
    setMode(block.mode || 'single');
    setCompetitionType(block.competitionType || 'score');
    setTeams(block.teams || [
      { id: 1, name: 'Lag 1' },
      { id: 2, name: 'Lag 2' }
    ]);
  }, [block.id, block.title, block.participants, block.roundCount, block.defaultCollapsed, block.status, block.mode, block.competitionType, block.teams]);

  const syncToParent = (updates) => {
    onUpdate(block.id, {
      title,
      participants,
      roundCount,
      scores: block.scores || {},
      shots: block.shots || {},
      rounds: block.rounds || [],
      defaultCollapsed,
      status,
      sortOrder: block.sortOrder || 'desc',
      mode,
      competitionType,
      teams,
      ...updates
    });
  };

  const handleTitleChange = (value) => {
    setTitle(value);
    syncToParent({ title: value });
  };

  const handleDefaultCollapsedChange = (value) => {
    setDefaultCollapsed(value);
    syncToParent({ defaultCollapsed: value });
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // When switching to team mode, clear team assignments
    if (newMode === 'team') {
      const updatedParticipants = participants.map(p => ({ ...p, team: undefined }));
      setParticipants(updatedParticipants);
      syncToParent({ mode: newMode, participants: updatedParticipants });
    } else {
      syncToParent({ mode: newMode });
    }
  };

  const handleReopenLeaderboard = () => {
    setStatus('active');
    syncToParent({ status: 'active' });
  };

  const handleResetScores = () => {
    if (window.confirm('Vill du nollställa alla poäng? Detta kan inte ångras.')) {
      setStatus('active');
      setRoundCount(0);
      syncToParent({ scores: {}, roundCount: 0, status: 'active' });
    }
  };

  // Toggle participant (for single mode)
  const toggleParticipant = (email, name) => {
    const exists = participants.some(p => p.email?.toLowerCase() === email);
    if (exists) {
      const updated = participants.filter(p => p.email?.toLowerCase() !== email);
      setParticipants(updated);
      syncToParent({ participants: updated });
    } else {
      const newParticipant = { email, name };
      const updated = [...participants, newParticipant];
      setParticipants(updated);
      syncToParent({ participants: updated });
    }
  };

  // Add participant to selected team (for team mode)
  const addToTeam = (email, name) => {
    const exists = participants.some(p => p.email?.toLowerCase() === email);
    if (exists) {
      // Update existing participant's team
      const updated = participants.map(p => 
        p.email?.toLowerCase() === email ? { ...p, team: selectedTeam } : p
      );
      setParticipants(updated);
      syncToParent({ participants: updated });
    } else {
      // Add new participant with team
      const newParticipant = { email, name, team: selectedTeam };
      const updated = [...participants, newParticipant];
      setParticipants(updated);
      syncToParent({ participants: updated });
    }
  };

  // Remove participant from team (make them available again)
  const removeFromTeam = (email) => {
    const updated = participants.filter(p => p.email?.toLowerCase() !== email);
    setParticipants(updated);
    syncToParent({ participants: updated });
  };

  // Get participants for a specific team
  const getTeamMembers = (teamId) => {
    return participants.filter(p => p.team === teamId);
  };

  // Get available users not in any team (for team mode)
  const getAvailableForTeam = () => {
    const assignedEmails = participants.filter(p => p.team).map(p => p.email?.toLowerCase());
    return availableUsers.filter(u => !assignedEmails.includes(u.email));
  };

  // Get available users from shares (accepted or inherited) + owner
  const sharedUsers = Object.entries(shares)
    .filter(([_, share]) => share.status === 'accepted' || share.status === 'inherited')
    .map(([key, share]) => ({
      email: share.email?.toLowerCase(),
      name: share.displayName || share.email?.split('@')[0]
    }));
  
  // Add current user (owner) to the list
  const ownerEmail = currentUser?.email?.toLowerCase();
  const ownerName = currentUserDisplayName || ownerEmail?.split('@')[0] || 'Jag';
  
  const availableUsers = ownerEmail 
    ? [{ email: ownerEmail, name: ownerName, isOwner: true }, ...sharedUsers]
    : sharedUsers;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Collapsible header */}
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <ChevronDown 
            size={16} 
            className={`text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? '' : '-rotate-90'}`} 
          />
          {competitionType === 'longestdrive' ? (
            <Target size={16} className="text-blue-400 flex-shrink-0" />
          ) : (
            <Trophy size={16} className="text-blue-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-gray-300 truncate">
            Golf – {competitionType === 'longestdrive' ? 'Longest Drive' : 'Leaderboard'}
          </span>
          {participants.length > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">({participants.length} deltagare)</span>
          )}
        </button>
        <div className="flex gap-1 flex-shrink-0">
          <button type="button" onClick={() => onMove(block.id, -1)} disabled={index === 0} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
            <ArrowUp size={14} />
          </button>
          <button type="button" onClick={() => onMove(block.id, 1)} disabled={index === total - 1} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
            <ArrowDown size={14} />
          </button>
          <button type="button" onClick={() => onRemove(block.id)} className="w-7 h-7 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="p-3 space-y-4">
          {/* Competition type toggle: Score / Longest Drive */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Format</label>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setCompetitionType('score');
                  setTitle('Leaderboard');
                  syncToParent({ competitionType: 'score', title: 'Leaderboard' });
                }}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  competitionType === 'score'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300'
                }`}
              >
                Poäng
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompetitionType('longestdrive');
                  setTitle('Longest Drive');
                  syncToParent({ competitionType: 'longestdrive', title: 'Longest Drive' });
                }}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  competitionType === 'longestdrive'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300'
                }`}
              >
                Längsta Drive
              </button>
            </div>
            {competitionType === 'longestdrive' && (
              <p className="text-xs text-gray-500 mt-2">
                Mät drive-längd med GPS. Tee-position + bollposition per spelare.
              </p>
            )}
          </div>

          {/* Mode toggle: Singel / Lag (only for score mode) */}
          {competitionType === 'score' && (
          <>
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Tävlingstyp</label>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                type="button"
                onClick={() => handleModeChange('single')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  mode === 'single'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300'
                }`}
              >
                Singel
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('team')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  mode === 'team'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300'
                }`}
              >
                Lag
              </button>
            </div>
          </div>

          {/* Single mode: Participants */}
          {mode === 'single' && (
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                Deltagare
              </label>
              
              {availableUsers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {availableUsers.map((user, idx) => {
                    const isSelected = participants.some(p => p.email?.toLowerCase() === user.email);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleParticipant(user.email, user.name)}
                        className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {user.name}{user.isOwner ? ' (jag)' : ''}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic">
                  Dela objektet med andra för att lägga till deltagare
                </div>
              )}
            </div>
          )}

          {/* Team mode: Team assignment */}
          {mode === 'team' && (
            <div className="space-y-3">
              {/* Team columns */}
              <div className="grid grid-cols-2 gap-2">
                {teams.map((team) => {
                  const teamMembers = getTeamMembers(team.id);
                  const isSelected = selectedTeam === team.id;
                  const teamColor = team.id === 1 ? 'cyan' : 'orange';
                  
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedTeam(team.id)}
                      className={`p-2 rounded-lg border transition-all text-left ${
                        isSelected
                          ? team.id === 1
                            ? 'border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                            : 'border-orange-500/50 bg-orange-500/10 ring-1 ring-orange-500/30'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`text-xs font-medium mb-2 ${
                        team.id === 1 ? 'text-cyan-400' : 'text-orange-400'
                      }`}>
                        {team.name}
                        {isSelected && <Check size={12} className="inline ml-1" />}
                      </div>
                      <div className="space-y-1 min-h-[32px]">
                        {teamMembers.length === 0 ? (
                          <div className="text-xs text-gray-600 italic">
                            {isSelected ? 'Välj deltagare nedan' : 'Inga deltagare'}
                          </div>
                        ) : (
                          teamMembers.map((member, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center justify-between gap-1 text-xs text-gray-300 bg-white/5 rounded px-1.5 py-1"
                            >
                              <span className="truncate">{member.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromTeam(member.email);
                                }}
                                className="text-gray-500 hover:text-red-400 flex-shrink-0"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Available users to add to teams */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">
                  Tillgängliga att lägga till i {teams.find(t => t.id === selectedTeam)?.name}
                </label>
                {getAvailableForTeam().length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {getAvailableForTeam().map((user, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => addToTeam(user.email, user.name)}
                        className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                          selectedTeam === 1
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                            : 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                        }`}
                      >
                        + {user.name}{user.isOwner ? ' (jag)' : ''}
                      </button>
                    ))}
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="text-xs text-gray-500 italic">
                    Dela objektet med andra för att lägga till deltagare
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">
                    Alla deltagare är tilldelade ett lag
                  </div>
                )}
              </div>
            </div>
          )}
          </>
          )}

          {/* Longest Drive mode: Participants (simpler selection) */}
          {competitionType === 'longestdrive' && (
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                Deltagare
              </label>
              
              {availableUsers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {availableUsers.map((user, idx) => {
                    const isSelected = participants.some(p => p.email?.toLowerCase() === user.email);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleParticipant(user.email, user.name)}
                        className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {user.name}{user.isOwner ? ' (jag)' : ''}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic">
                  Dela objektet med andra för att lägga till deltagare
                </div>
              )}
            </div>
          )}

          {/* Round count info */}
          {roundCount > 0 && (
            <div className="text-xs text-gray-500">
              {roundCount} {roundCount === 1 ? 'runda' : 'rundor'} registrerade
            </div>
          )}

          {/* Default collapsed toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-gray-400">Ihopfälld som standard</span>
            <button
              type="button"
              onClick={() => handleDefaultCollapsedChange(!defaultCollapsed)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                defaultCollapsed ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                defaultCollapsed ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Reopen / Reset buttons */}
          {(status === 'finished' || roundCount > 0) && (
            <div className="space-y-2 pt-3 border-t border-white/5">
              {status === 'finished' && (
                <button
                  type="button"
                  onClick={handleReopenLeaderboard}
                  className="w-full py-3 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg border border-blue-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  Återöppna
                </button>
              )}
              {roundCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetScores}
                  className="w-full py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Nollställ
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { LeaderboardBlockEditor };
export default LeaderboardBlockEditor;
