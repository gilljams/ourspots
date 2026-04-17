import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Trophy, Target, Plus, Check, UserPlus } from 'lucide-react';

// Leaderboard Block Editor - competition/ranking configuration
function LeaderboardBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving, shares = {}, currentUser, currentUserDisplayName }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const getDefaultTitle = (type) => type === 'longestdrive' ? 'Longest Drive' : type === 'team' ? 'Lagtävling' : 'Leaderboard';
  const [title, setTitle] = useState(block.title ?? '');
  const [participants, setParticipants] = useState(block.participants || []);
  const [roundCount, setRoundCount] = useState(block.roundCount || 0);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? true);
  const [status, setStatus] = useState(block.status || 'active');
  const [mode, setMode] = useState(block.mode || 'single'); // 'single' or 'team'
  const [competitionType, setCompetitionType] = useState(block.competitionType || 'single'); // 'single', 'team', or 'longestdrive'
  const [teams, setTeams] = useState(block.teams || [
    { id: 1, name: 'Lag 1' },
    { id: 2, name: 'Lag 2' }
  ]);
  const [selectedTeam, setSelectedTeam] = useState(1); // Which team is selected for adding members
  const [guestName, setGuestName] = useState('');

  // Sync with block changes
  useEffect(() => {
    setTitle(block.title ?? '');
    setParticipants(block.participants || []);
    setRoundCount(block.roundCount || 0);
    setDefaultCollapsed(block.defaultCollapsed ?? true);
    setStatus(block.status || 'active');
    setMode(block.mode || 'single');
    setCompetitionType(block.competitionType || 'single');
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
      golfRounds: block.golfRounds || [],
      balancePlayers: block.balancePlayers || [],
      defaultCollapsed,
      status,
      sortOrder: block.sortOrder || 'desc',
      mode,
      competitionType,
      teams,
      awardPoints: block.awardPoints ?? 1,
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
    // Include guest players as available for team assignment
    const allUsers = [...availableUsers, ...guestPlayers.map(g => ({ email: g.email, name: g.name, isGuest: true }))];
    return allUsers.filter(u => !assignedEmails.includes(u.email?.toLowerCase()));
  };

  // Get available users from shares (accepted or inherited) + owner
  const sharedUsers = Object.entries(shares)
    .filter(([_, share]) => share.status === 'accepted' || share.status === 'inherited')
    .filter(([_, share]) => !share.email?.toLowerCase().endsWith('.demo.se'))
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

  // Guest players: participants that aren't in availableUsers
  const guestPlayers = participants.filter(p => p.isGuest);

  // Add a guest player (no app account)
  const addGuestPlayer = () => {
    const name = guestName.trim();
    if (!name) return;
    // Create a pseudo-email to use as key
    const pseudoEmail = `guest_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const newParticipant = { email: pseudoEmail, name, isGuest: true };
    const updated = [...participants, newParticipant];
    setParticipants(updated);
    setGuestName('');
    syncToParent({ participants: updated });
  };

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
            Golf – {competitionType === 'longestdrive' ? 'Longest Drive' : competitionType === 'team' ? 'Lagtävling' : 'Singel'}
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
          {/* Title input */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => syncToParent({ title })}
              placeholder={getDefaultTitle(competitionType)}
              disabled={saving}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Competition type toggle: Score / Golf / Longest Drive */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Format</label>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                type="button"
                onClick={() => {
                  const oldDefault = getDefaultTitle(competitionType);
                  const newTitle = (!title || title === oldDefault) ? getDefaultTitle('single') : title;
                  setTitle(newTitle);
                  setCompetitionType('single');
                  setMode('single');
                  setRoundCount(0);
                  const resetParticipants = participants.map(({ team, ...rest }) => rest);
                  setParticipants(resetParticipants);
                  syncToParent({ competitionType: 'single', mode: 'single', title: newTitle, participants: resetParticipants, roundCount: 0, scores: {}, shots: {}, rounds: [], golfRounds: [] });
                }}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  competitionType === 'single'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300'
                }`}
              >
                Singel
              </button>
              <button
                type="button"
                onClick={() => {
                  const oldDefault = getDefaultTitle(competitionType);
                  const newTitle = (!title || title === oldDefault) ? getDefaultTitle('team') : title;
                  setTitle(newTitle);
                  setCompetitionType('team');
                  setMode('team');
                  setRoundCount(0);
                  const resetParticipants = participants.map(({ team, ...rest }) => rest);
                  setParticipants(resetParticipants);
                  syncToParent({ competitionType: 'team', mode: 'team', title: newTitle, participants: resetParticipants, roundCount: 0, scores: {}, shots: {}, rounds: [], golfRounds: [] });
                }}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  competitionType === 'team'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300'
                }`}
              >
                Lagtävling
              </button>
              <button
                type="button"
                onClick={() => {
                  const oldDefault = getDefaultTitle(competitionType);
                  const newTitle = (!title || title === oldDefault) ? getDefaultTitle('longestdrive') : title;
                  setTitle(newTitle);
                  setCompetitionType('longestdrive');
                  setRoundCount(0);
                  const resetParticipants = participants.map(({ team, ...rest }) => rest);
                  setParticipants(resetParticipants);
                  syncToParent({ competitionType: 'longestdrive', title: newTitle, participants: resetParticipants, roundCount: 0, scores: {}, shots: {}, rounds: [], golfRounds: [] });
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
            {competitionType === 'team' && (
              <p className="text-xs text-gray-500 mt-2">
                Lagtävling med rundor, automatisk bollindelning och leaderboard.
              </p>
            )}
            {competitionType === 'team' && (
              <div className="mt-3">
                <label className="text-xs text-gray-400 mb-1.5 block">Bonuspoäng per sidotävling</label>
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => syncToParent({ awardPoints: v })}
                      className={`w-8 h-8 rounded-lg text-xs font-medium border transition-colors ${
                        (block.awardPoints ?? 1) === v
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                          : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {v}p
                    </button>
                  ))}
                  <span className="text-[10px] text-gray-600 ml-1">per Longest Drive / Closest to Pin</span>
                </div>
              </div>
            )}
            {competitionType === 'single' && (
              <p className="text-xs text-gray-500 mt-2">
                Individuell tävling med poäng per runda.
              </p>
            )}
          </div>

          {/* Single mode: Participants */}
          {competitionType === 'single' && (
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
          {competitionType === 'team' && (
            <div className="space-y-3">
              {/* Team columns */}
              <div className="grid grid-cols-2 gap-2">
                {teams.map((team) => {
                  const teamMembers = getTeamMembers(team.id);
                  const isSelected = selectedTeam === team.id;
                  
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
                  Lägg till i {teams.find(t => t.id === selectedTeam)?.name}
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

          {/* Guest players: add players without accounts */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Gästspelare</label>
            {guestPlayers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {guestPlayers.map((g, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-gray-400 flex items-center gap-1.5"
                  >
                    {g.name}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = participants.filter(p => p.email !== g.email);
                        setParticipants(updated);
                        syncToParent({ participants: updated });
                      }}
                      className="text-gray-600 hover:text-red-400"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGuestPlayer())}
                placeholder="Namn på gästspelare"
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addGuestPlayer}
                disabled={!guestName.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/30 disabled:opacity-30 flex items-center gap-1"
              >
                <UserPlus size={12} />
                Lägg till
              </button>
            </div>
          </div>

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
                defaultCollapsed ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                defaultCollapsed ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>


        </div>
      )}
    </div>
  );
}

export { LeaderboardBlockEditor };
export default LeaderboardBlockEditor;
