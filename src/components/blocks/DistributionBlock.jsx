import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, Edit2, RotateCcw, User, Car, ClipboardList } from 'lucide-react';
import { useConfirm } from '../../utils/useConfirm';

// Preset configs for different distribution use cases
const DISTRIBUTION_PRESETS = {
  carpool: {
    icon: Car,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    title: 'Samåkning',
    slotLabel: 'bil',
    emptyStateUser: 'Du har inte valt bil än',
    emptyStateGeneral: 'Inga bilar skapade än',
    createLabel: 'Jag tar min bil',
    joinLabel: 'Jag behöver plats',
    capacityLabel: 'Antal platser (inkl. förare)',
    infoPlaceholder: 'T.ex. "Hämtar i stan kl 19"',
    slotPrefix: 'Bil',
    assigneeLabel: 'passagerare',
    spotsLeftLabel: (n) => n === 1 ? '1 plats kvar' : `${n} platser kvar`,
    fullLabel: 'Full'
  },
  tasks: {
    icon: ClipboardList,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    title: 'Uppgiftstilldelning',
    slotLabel: 'uppgift',
    emptyStateUser: 'Du har inte valt uppgift',
    emptyStateGeneral: 'Inga uppgifter skapade än',
    createLabel: 'Skapa uppgift',
    joinLabel: 'Välj uppgift',
    capacityLabel: 'Max antal personer',
    infoPlaceholder: 'Beskrivning av uppgiften',
    slotPrefix: '',
    assigneeLabel: 'tilldelade',
    spotsLeftLabel: (n) => n === 1 ? '1 plats kvar' : `${n} platser kvar`,
    fullLabel: 'Tilldelad'
  }
};

export const DistributionBlock = ({ 
  data, 
  currentUser, 
  shares = {}, 
  canEdit = false, 
  onOpenModal,
  onResetDistribution,
  onExpand 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const [showEditMode, setShowEditMode] = useState(false);
  const blockRef = useRef(null);
  const confirm = useConfirm();
  
  const preset = DISTRIBUTION_PRESETS[data.preset] || DISTRIBUTION_PRESETS.carpool;
  const PresetIcon = preset.icon;
  const title = data.title || preset.title;
  const slots = data.slots || [];
  
  // Get current user's email key
  const getUserEmailKey = (email) => {
    if (!email) return null;
    return email.replace(/\./g, '_DOT_');
  };
  
  const currentUserKey = currentUser?.email ? getUserEmailKey(currentUser.email) : null;
  
  // Find which slot the current user is assigned to
  const findUserSlot = () => {
    if (!currentUserKey) return null;
    return slots.find(slot => slot.assignees?.includes(currentUserKey));
  };
  
  const userSlot = findUserSlot();
  const isUserCreator = (slot) => slot.createdBy === currentUserKey;
  
  // Get display name for an email key
  const getDisplayName = (emailKey, slot = null, includeExtras = true) => {
    if (!emailKey) return '';
    const email = emailKey.replace(/_DOT_/g, '.');
    let name = '';
    if (shares[emailKey]?.displayName) {
      name = shares[emailKey].displayName;
    } else if (shares[emailKey]?.name) {
      name = shares[emailKey].name;
    } else {
      const participant = (data.participants || []).find(p => {
        const pKey = p.email?.replace(/\./g, '_DOT_');
        return pKey === emailKey;
      });
      if (participant?.name) {
        name = participant.name;
      } else {
        name = email.split('@')[0];
      }
    }
    
    // Add extra seats suffix if applicable
    if (includeExtras && slot?.assigneeDetails?.[emailKey]) {
      const details = slot.assigneeDetails[emailKey];
      if (details.extraSeats > 0) {
        const suffix = details.note || details.extraSeats;
        name = `${name} (+${suffix})`;
      }
    }
    
    return name;
  };
  
  // Get total seats taken in a slot (including extra seats)
  const getTotalSeatsTaken = (slot) => {
    const assignees = slot.assignees || [];
    let total = assignees.length;
    assignees.forEach(key => {
      const details = slot.assigneeDetails?.[key];
      if (details?.extraSeats) {
        total += details.extraSeats;
      }
    });
    return total;
  };
  
  // Get spots left for a slot
  const getSpotsLeft = (slot) => {
    const taken = getTotalSeatsTaken(slot);
    const capacity = slot.capacity || 1;
    return Math.max(0, capacity - taken);
  };
  
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
  
  // Calculate summary for collapsed view
  const getCollapsedSummary = () => {
    if (userSlot) {
      if (data.preset === 'carpool') {
        const assigneeNames = userSlot.assignees
          .map(key => {
            const name = key === currentUserKey ? 'Du' : getDisplayName(key, userSlot, false);
            const details = userSlot.assigneeDetails?.[key];
            if (details?.extraSeats > 0) {
              const suffix = details.note || details.extraSeats;
              return `${name} (+${suffix})`;
            }
            return name;
          })
          .join(', ');
        return `${userSlot.label}: ${assigneeNames}`;
      } else {
        return `Du: ${userSlot.label}`;
      }
    }
    return preset.emptyStateUser;
  };

  if (slots.length === 0) {
    return (
      <div ref={blockRef} className="space-y-2">
        <button
          onClick={handleToggleCollapse}
          className="w-full flex items-center gap-2.5 py-2 group touch-manipulation"
        >
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <ChevronDown 
              size={16} 
              className={`text-gray-400 group-hover:text-white transition-all ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
            />
          </div>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <PresetIcon size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
              {title}
            </span>
          </div>
        </button>
        
        {!isCollapsed && (
          <div className="bg-white/[0.03] rounded-xl p-4">
            <div className="text-sm text-gray-500 text-center py-2">
              {preset.emptyStateGeneral}
            </div>
            {onOpenModal && (
              <button
                onClick={onOpenModal}
                className={`w-full mt-2 py-2 text-sm ${preset.color} hover:bg-white/5 rounded-lg flex items-center justify-center gap-1 transition-colors`}
              >
                <Plus size={14} />
                Kom igång
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Count totals (including extra seats)
  const totalSlots = slots.length;
  const totalAssigned = slots.reduce((sum, slot) => sum + getTotalSeatsTaken(slot), 0);
  
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
            <PresetIcon size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
              {title}
            </span>
          </div>
          <span className="text-xs text-gray-500 tabular-nums">{totalAssigned} {preset.assigneeLabel}</span>
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
      
      {/* Expanded content */}
      {!isCollapsed && (
        <div className="bg-white/[0.03] rounded-xl p-4 space-y-3">
          {/* Edit mode panel */}
          {showEditMode && canEdit && slots.length > 0 && onResetDistribution && (
            <div className="flex items-center justify-end gap-3 px-4 py-2 border-b border-white/5 -mx-4 -mt-2 mb-1">
              <button
                onClick={async () => {
                  const label = data.preset === 'carpool' ? 'bilar' : 'uppgifter';
                  if (await confirm({ title: `Nollställ ${label}?`, message: `Alla ${label} raderas. Detta kan inte ångras.`, confirmText: 'Nollställ', variant: 'danger' })) {
                    onResetDistribution();
                    setShowEditMode(false);
                  }
                }}
                className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={11} />
                Nollställ
              </button>
            </div>
          )}
          
          {/* Slots list */}
          {slots.map((slot, index) => {
            const spotsLeft = getSpotsLeft(slot);
            const isFull = spotsLeft === 0;
            const isCreator = isUserCreator(slot);
            const isAssigned = slot.assignees?.includes(currentUserKey);
            
            return (
              <div 
                key={slot.id || index} 
                className={`p-3 rounded-lg border transition-colors ${
                  isAssigned 
                    ? `${preset.bgColor} border-white/20` 
                    : 'bg-white/[0.02] border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">{slot.label}</span>
                      {isCreator && data.preset === 'carpool' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
                          Din
                        </span>
                      )}
                    </div>
                    {slot.info && (
                      <div className="text-xs text-gray-500 mt-0.5">{slot.info}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isFull ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600/50 text-gray-400">
                        {preset.fullLabel}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        {preset.spotsLeftLabel(spotsLeft)}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Assignees */}
                {slot.assignees && slot.assignees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {slot.assignees.map((assigneeKey, i) => {
                      const isMe = assigneeKey === currentUserKey;
                      const baseName = isMe ? 'Du' : getDisplayName(assigneeKey, null, false);
                      const details = slot.assigneeDetails?.[assigneeKey];
                      const displayName = details?.extraSeats > 0 
                        ? `${baseName} (+${details.note || details.extraSeats})`
                        : baseName;
                      return (
                        <span 
                          key={i} 
                          className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                            isMe 
                              ? `${preset.bgColor} ${preset.color}` 
                              : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          <User size={10} />
                          {displayName}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Action button to open modal */}
          {onOpenModal && (
            <button
              onClick={onOpenModal}
              className={`w-full py-2.5 text-sm ${preset.color} hover:bg-white/5 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-white/10`}
            >
              {userSlot ? 'Ändra val' : preset.joinLabel}
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
