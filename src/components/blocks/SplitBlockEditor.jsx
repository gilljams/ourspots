import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Wallet, Plus } from 'lucide-react';

// Separate component for weighted participant row (needed for hooks)
function WeightedParticipantRow({ participant, idx, onUpdateWeight, onRemove }) {
  const [localWeight, setLocalWeight] = useState(String(participant.weight ?? 1));
  
  // Sync when external value changes
  useEffect(() => {
    setLocalWeight(String(participant.weight ?? 1));
  }, [participant.weight]);
  
  return (
    <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white truncate block">{participant.name || participant.email}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Vikt:</label>
        <input
          type="text"
          inputMode="decimal"
          data-weight-input={idx}
          value={localWeight}
          onChange={(e) => setLocalWeight(e.target.value)}
          onBlur={(e) => {
            const val = e.target.value.replace(',', '.');
            const num = parseFloat(val) || 1;
            const clamped = Math.max(0.5, Math.min(10, num));
            setLocalWeight(String(clamped));
            onUpdateWeight(clamped);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.target.blur();
              const nextInput = document.querySelector(`[data-weight-input="${idx + 1}"]`);
              if (nextInput) {
                setTimeout(() => {
                  nextInput.focus();
                  nextInput.select();
                }, 10);
              }
            }
          }}
          className="w-14 px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white text-center"
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-gray-500 hover:text-red-400"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// Split Block Editor - expense sharing configuration
function SplitBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving, shares = {}, currentUser, currentUserDisplayName }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState(block.title ?? '');
  const [model, setModel] = useState(block.model || 'individual');
  const [participants, setParticipants] = useState(block.participants || []);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? true);
  const [closed, setClosed] = useState(block.closed || false);

  // Sync with block changes
  useEffect(() => {
    setTitle(block.title ?? '');
    setModel(block.model || 'individual');
    setParticipants(block.participants || []);
    setDefaultCollapsed(block.defaultCollapsed ?? true);
    setClosed(block.closed || false);
  }, [block.id, block.title, block.model, block.participants, block.defaultCollapsed, block.closed]);

  const syncToParent = (updates) => {
    onUpdate(block.id, {
      title,
      model,
      participants,
      defaultCollapsed,
      closed,
      ...updates
    });
  };

  const handleTitleChange = (value) => {
    setTitle(value);
    syncToParent({ title: value });
  };

  const handleModelChange = (value) => {
    setModel(value);
    // Reset weights when changing model
    const updatedParticipants = participants.map(p => ({
      ...p,
      weight: value === 'individual' ? 1 : (p.weight || 1)
    }));
    setParticipants(updatedParticipants);
    syncToParent({ model: value, participants: updatedParticipants });
  };

  const handleDefaultCollapsedChange = (value) => {
    setDefaultCollapsed(value);
    syncToParent({ defaultCollapsed: value });
  };

  // Toggle participant (for individual mode badges)
  const toggleParticipant = (email, name) => {
    const exists = participants.some(p => p.email?.toLowerCase() === email);
    if (exists) {
      const updated = participants.filter(p => p.email?.toLowerCase() !== email);
      setParticipants(updated);
      syncToParent({ participants: updated });
    } else {
      const newParticipant = {
        email,
        name,
        weight: 1,
        paid: 0
      };
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

  const addParticipant = (email, name) => {
    if (participants.some(p => p.email?.toLowerCase() === email)) return;
    
    const newParticipant = {
      email,
      name,
      weight: 1,
      paid: 0
    };
    
    const updated = [...participants, newParticipant];
    setParticipants(updated);
    syncToParent({ participants: updated });
  };

  const removeParticipant = (email) => {
    const updated = participants.filter(p => p.email?.toLowerCase() !== email);
    setParticipants(updated);
    syncToParent({ participants: updated });
  };

  const updateParticipantWeight = (email, weight) => {
    const updated = participants.map(p => {
      if (p.email?.toLowerCase() === email) {
        return {
          ...p,
          weight: weight || 1
        };
      }
      return p;
    });
    setParticipants(updated);
    syncToParent({ participants: updated });
  };

  const totalWeight = participants.reduce((sum, p) => sum + (p.weight || 1), 0);

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
          <Wallet size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            {title || 'Splitt'}
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
          {/* Title */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 text-base bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
              placeholder="T.ex. Resekostnader"
            />
          </div>

          {/* Model selection */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Delningsmodell</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleModelChange('individual')}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  model === 'individual'
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                Lika
              </button>
              <button
                type="button"
                onClick={() => handleModelChange('family')}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  model === 'family'
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                Viktad
              </button>
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">
              Deltagare {model === 'family' && totalWeight > 0 && `(total vikt: ${totalWeight})`}
            </label>
            
            {/* Individual mode: Toggle badges */}
            {model === 'individual' && availableUsers.length > 0 && (
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
            )}
            
            {/* Weighted mode: List with single weight field */}
            {model === 'family' && (
              <>
                <div className="space-y-2 mb-3">
                  {participants.map((p, idx) => (
                    <WeightedParticipantRow
                      key={p.email || idx}
                      participant={p}
                      idx={idx}
                      onUpdateWeight={(weight) => updateParticipantWeight(p.email, weight)}
                      onRemove={() => removeParticipant(p.email)}
                    />
                  ))}
                </div>
                
                {/* Help text */}
                <div className="text-xs text-gray-500 mb-2">
                  T.ex. 3 för hela resan, 2 för de som kom dag 2 av 3
                </div>

                {/* Add participant for weighted mode */}
                {availableUsers.filter(u => !participants.some(p => p.email === u.email)).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {availableUsers
                      .filter(u => !participants.some(p => p.email === u.email))
                      .map((user, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => addParticipant(user.email, user.name)}
                          className="px-2 py-1 text-xs bg-white/10 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 rounded-lg flex items-center gap-1"
                        >
                          <Plus size={12} />
                          {user.name}
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
            
            {availableUsers.length === 0 && participants.length === 0 && (
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

export { SplitBlockEditor, WeightedParticipantRow };
export default SplitBlockEditor;
