import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Plus, Trash2 } from 'lucide-react';

// Distribution block editor - for carpool/tasks presets
function DistributionBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving, shares = {}, currentUser, currentUserDisplayName }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState(block.title || '');
  const [participants, setParticipants] = useState(block.participants || []);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? true);
  
  // Sync with block changes
  useEffect(() => {
    setTitle(block.title || '');
    setParticipants(block.participants || []);
    setDefaultCollapsed(block.defaultCollapsed ?? true);
  }, [block.id, block.title, block.participants, block.defaultCollapsed]);
  
  const syncToParent = (updates) => {
    onUpdate(block.id, {
      title,
      participants,
      defaultCollapsed,
      preset: block.preset,
      slots: block.slots || [],
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
  
  // Toggle participant
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
  
  // Preset config
  const presetConfig = {
    carpool: { label: 'Samåkning', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    tasks: { label: 'Uppgiftstilldelning', color: 'text-blue-400', bgColor: 'bg-blue-500/20' }
  };
  
  const currentPreset = presetConfig[block.preset] || presetConfig.carpool;
  
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={currentPreset.color}>
            {block.preset === 'carpool' ? (
              <>
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-1.8-3.2c-.3-.5-.8-.8-1.4-.8H9.2c-.6 0-1.1.3-1.4.8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </>
            ) : (
              <>
                <rect x="3" y="5" width="6" height="6" rx="1" />
                <path d="m3 17 2 2 4-4" />
                <path d="M13 6h8" />
                <path d="M13 12h8" />
                <path d="M13 18h8" />
              </>
            )}
          </svg>
          <span className="text-sm font-medium text-gray-300 truncate">
            {title || currentPreset.label}
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
        <div className="p-3 pt-0 space-y-4">
          {/* Custom title (optional) */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={`Standard: ${currentPreset.label}`}
              disabled={saving}
              className="w-full px-3 py-2 text-base bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
            />
          </div>
          
          {/* Preset indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
            <span className="text-sm text-gray-400">Typ:</span>
            <span className={`text-sm font-medium ${currentPreset.color}`}>{currentPreset.label}</span>
          </div>
          
          {/* Participants */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Deltagare</label>
            
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
                          ? `${currentPreset.bgColor} border-white/20 ${currentPreset.color}`
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
          
          {/* Reset slots button */}
          {(block.slots || []).length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Vill du nollställa alla ${block.preset === 'carpool' ? 'bilar' : 'uppgifter'}? Detta kan inte ångras.`)) {
                  syncToParent({ slots: [] });
                }
              }}
              className="w-full py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Nollställ {block.preset === 'carpool' ? 'bilar' : 'uppgifter'} ({(block.slots || []).length})
            </button>
          )}
          
          <div className="text-xs text-gray-500 pt-3 border-t border-white/5">
            Deltagare kan skapa och välja {block.preset === 'carpool' ? 'bilar' : 'uppgifter'} i objektvyn.
          </div>
        </div>
      )}
    </div>
  );
}

export { DistributionBlockEditor };
export default DistributionBlockEditor;
