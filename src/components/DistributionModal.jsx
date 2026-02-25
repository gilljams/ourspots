import React, { useState } from 'react';
import { X, Car, ClipboardList, Plus, User, ChevronLeft, Check, Trash2, Users } from 'lucide-react';

// Preset configs - same as in blocks/index.jsx
const DISTRIBUTION_PRESETS = {
  carpool: {
    icon: Car,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
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
    fullLabel: 'Full',
    intentOptions: [
      { id: 'create', label: 'Jag tar min bil', icon: Car, description: 'Skapa en bil och låt andra ansluta' },
      { id: 'join', label: 'Jag behöver plats', icon: User, description: 'Välj en bil att åka med' }
    ],
    createTitle: 'Skapa bil',
    createButtonLabel: 'Skapa bil',
    defaultCapacity: 4
  },
  tasks: {
    icon: ClipboardList,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
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
    fullLabel: 'Tilldelad',
    intentOptions: [
      { id: 'create', label: 'Skapa uppgift', icon: Plus, description: 'Lägg till en ny uppgift' },
      { id: 'join', label: 'Välj uppgift', icon: Check, description: 'Välj en befintlig uppgift' }
    ],
    createTitle: 'Skapa uppgift',
    createButtonLabel: 'Skapa uppgift',
    defaultCapacity: 1
  }
};

function DistributionModal({ 
  data, 
  currentUser, 
  shares = {},
  canEdit = false,
  onClose, 
  onCreateSlot,
  onJoinSlot,
  onLeaveSlot,
  onDeleteSlot
}) {
  const [step, setStep] = useState('intent'); // 'intent', 'create', 'join', 'fill', 'confirm-join'
  const [slotLabel, setSlotLabel] = useState('');
  const [slotCapacity, setSlotCapacity] = useState('');
  const [slotInfo, setSlotInfo] = useState('');
  const [selectedPassengers, setSelectedPassengers] = useState([]); // For pre-filling car
  
  // Extra seats state (for passengers with companions)
  const [joiningSlotId, setJoiningSlotId] = useState(null); // Which slot user is about to join
  const [extraSeats, setExtraSeats] = useState(0); // How many extra seats needed
  const [extraSeatsNote, setExtraSeatsNote] = useState(''); // Description of companions
  
  const preset = DISTRIBUTION_PRESETS[data.preset] || DISTRIBUTION_PRESETS.carpool;
  const PresetIcon = preset.icon;
  const slots = data.slots || [];
  
  // Get current user's email key
  const getUserEmailKey = (email) => {
    if (!email) return null;
    return email.replace(/\./g, '_DOT_');
  };
  
  const currentUserKey = currentUser?.email ? getUserEmailKey(currentUser.email) : null;
  
  // Find which slot the current user is assigned to (first one for carpool)
  const findUserSlot = () => {
    if (!currentUserKey) return null;
    return slots.find(slot => slot.assignees?.includes(currentUserKey));
  };
  
  // Find ALL slots the current user is assigned to (for tasks)
  const findUserSlots = () => {
    if (!currentUserKey) return [];
    return slots.filter(slot => slot.assignees?.includes(currentUserKey));
  };
  
  const userSlot = findUserSlot();
  const userSlots = findUserSlots(); // All slots user is in (for tasks)
  const isUserCreator = (slot) => slot.createdBy === currentUserKey;
  
  // Check if user has created a slot (car)
  const userCreatedSlot = slots.find(slot => slot.createdBy === currentUserKey);
  const hasCreatedSlot = !!userCreatedSlot;
  
  // Get display name for an email key
  const getDisplayName = (emailKey, slot = null, includeExtras = false) => {
    if (!emailKey) return '';
    const email = emailKey.replace(/_DOT_/g, '.');
    // Check shares for displayName or name
    let name = '';
    if (shares[emailKey]?.displayName) {
      name = shares[emailKey].displayName;
    } else if (shares[emailKey]?.name) {
      name = shares[emailKey].name;
    } else {
      // Check participants list for name
      const participant = (data.participants || []).find(p => {
        const pKey = p.email?.replace(/\./g, '_DOT_');
        return pKey === emailKey;
      });
      if (participant?.name) {
        name = participant.name;
      } else {
        // Fall back to email prefix
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
    // Add extra seats for each assignee
    assignees.forEach(key => {
      const details = slot.assigneeDetails?.[key];
      if (details?.extraSeats) {
        total += details.extraSeats;
      }
    });
    return total;
  };
  
  // Get spots left for a slot (accounting for extra seats)
  const getSpotsLeft = (slot) => {
    const taken = getTotalSeatsTaken(slot);
    const capacity = slot.capacity || 1;
    return Math.max(0, capacity - taken);
  };
  
  // Available slots (with spots left)
  const availableSlots = slots.filter(slot => getSpotsLeft(slot) > 0);
  
  // Get available participants (from data.participants)
  const availableParticipants = (data.participants || []).filter(p => {
    const pKey = p.email?.replace(/\./g, '_DOT_');
    // Exclude current user and users already assigned to a slot
    if (pKey === currentUserKey) return false;
    const isAssigned = slots.some(slot => slot.assignees?.includes(pKey));
    return !isAssigned;
  });
  
  // Handle creating a new slot
  const handleCreateSlot = () => {
    if (!slotLabel.trim()) return;
    
    // For carpool: check if user needs to leave another slot first
    // For tasks: no need to leave, user can be in multiple
    const leaveSlotId = (data.preset === 'carpool' && userSlot && !isUserCreator(userSlot)) ? userSlot.id : null;
    
    // Build assignees: for carpool, creator + selected passengers. For tasks, just selected (creator not auto-added)
    const assignees = data.preset === 'carpool' ? [currentUserKey] : [];
    selectedPassengers.forEach(email => {
      const key = email.replace(/\./g, '_DOT_');
      if (!assignees.includes(key)) assignees.push(key);
    });
    
    const newSlot = {
      id: Date.now().toString(),
      label: data.preset === 'carpool' 
        ? `${preset.slotPrefix} ${slotLabel}`.trim() 
        : slotLabel.trim(),
      capacity: parseInt(slotCapacity) || preset.defaultCapacity,
      createdBy: currentUserKey,
      info: slotInfo.trim() || null,
      assignees
    };
    
    // Pass leaveSlotId so parent can handle both operations atomically
    onCreateSlot(newSlot, leaveSlotId);
    onClose();
  };
  
  // Handle adding passengers to existing car (fill)
  const handleFillCar = () => {
    if (!userCreatedSlot || selectedPassengers.length === 0) return;
    
    selectedPassengers.forEach(email => {
      const key = email.replace(/\./g, '_DOT_');
      if (!userCreatedSlot.assignees?.includes(key)) {
        onJoinSlot(userCreatedSlot.id, key);
      }
    });
    onClose();
  };
  
  // Handle clicking on a slot to join (for carpool: show confirmation dialog)
  const handleJoinSlot = (slotId) => {
    if (data.preset === 'carpool') {
      // Show confirmation dialog for extra seats
      setJoiningSlotId(slotId);
      setExtraSeats(0);
      setExtraSeatsNote('');
      setStep('confirm-join');
    } else {
      // Tasks: direct join/toggle
      onJoinSlot(slotId, currentUserKey);
    }
  };
  
  // Confirm joining with extra seats info
  const handleConfirmJoin = () => {
    if (!joiningSlotId) return;
    
    // For carpool: if already in another slot, leave it first
    if (userSlot && userSlot.id !== joiningSlotId) {
      onLeaveSlot(userSlot.id, currentUserKey);
    }
    
    // Join with extra seats info
    onJoinSlot(joiningSlotId, currentUserKey, extraSeats, extraSeatsNote.trim() || null);
    onClose();
  };
  
  // Handle toggling a task (join or leave)
  const handleToggleTask = (slotId) => {
    const slot = slots.find(s => s.id === slotId);
    const isAssigned = slot?.assignees?.includes(currentUserKey);
    
    if (isAssigned) {
      onLeaveSlot(slotId, currentUserKey);
    } else {
      onJoinSlot(slotId, currentUserKey);
    }
  };
  
  // Handle leaving current slot
  const handleLeaveSlot = () => {
    if (userSlot) {
      // If user is the creator and there are other assignees, don't allow leaving
      // Instead, they must delete the slot
      if (isUserCreator(userSlot) && userSlot.assignees?.length > 1) {
        if (window.confirm('Du är skapare av denna. Om du lämnar kommer alla andra också att tas bort. Vill du ta bort den helt?')) {
          onDeleteSlot(userSlot.id);
        }
      } else if (isUserCreator(userSlot)) {
        // Creator with no other assignees - delete the slot
        onDeleteSlot(userSlot.id);
      } else {
        onLeaveSlot(userSlot.id, currentUserKey);
      }
      onClose();
    }
  };
  
  // Initialize default values based on preset
  React.useEffect(() => {
    if (data.preset === 'carpool') {
      setSlotLabel(getDisplayName(currentUserKey));
      setSlotCapacity(preset.defaultCapacity.toString());
    } else {
      setSlotCapacity(preset.defaultCapacity.toString());
    }
  }, [data.preset, currentUserKey]);
  
  // Render step 1: Choose intent
  const renderIntentStep = () => (
    <div className="space-y-3">
      {/* Current status if assigned - only for carpool (tasks handle this in join step) */}
      {data.preset === 'carpool' && userSlot && (
        <div className={`p-4 rounded-xl ${preset.bgColor} border ${preset.borderColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1">Du är för närvarande i:</div>
              <div className="font-medium text-white">{userSlot.label}</div>
              {userSlot.info && (
                <div className="text-xs text-gray-400 mt-0.5">{userSlot.info}</div>
              )}
            </div>
            <button
              onClick={handleLeaveSlot}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-500/20 text-gray-300 hover:text-red-400 text-sm transition-colors"
            >
              {isUserCreator(userSlot) ? 'Ta bort' : 'Lämna'}
            </button>
          </div>
          {userSlot.assignees && userSlot.assignees.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/10">
              {userSlot.assignees.map((key, i) => {
                const baseName = key === currentUserKey ? 'Du' : getDisplayName(key);
                const details = userSlot.assigneeDetails?.[key];
                const displayName = details?.extraSeats > 0 
                  ? `${baseName} (+${details.note || details.extraSeats})`
                  : baseName;
                return (
                  <span 
                    key={i} 
                    className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                      key === currentUserKey 
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
      )}
      
      {/* Intent options - dynamic based on user state */}
      <div className="space-y-2">
        {data.preset === 'carpool' ? (
          // Carpool: show different options based on whether user has a car
          <>
            {!hasCreatedSlot && (
              <button
                onClick={() => setStep('create')}
                className="w-full p-4 rounded-xl border text-left transition-all bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${preset.bgColor} flex items-center justify-center`}>
                    <Car size={20} className={preset.color} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">Jag tar min bil</div>
                    <div className="text-xs text-gray-400">Skapa en bil och låt andra ansluta</div>
                  </div>
                </div>
              </button>
            )}
            
            {hasCreatedSlot ? (
              // User has a car - show "fill car" option instead of "need ride"
              // Allow even if full (to remove passengers)
              <button
                onClick={() => {
                  setSelectedPassengers([]);
                  setStep('fill');
                }}
                className="w-full p-4 rounded-xl border text-left transition-all bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${preset.bgColor} flex items-center justify-center`}>
                    <Users size={20} className={preset.color} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">Fyll din bil</div>
                    <div className="text-xs text-gray-400">Lägg till eller ta bort passagerare</div>
                  </div>
                </div>
              </button>
            ) : (
              // User doesn't have a car - show "need ride" option
              <button
                onClick={() => setStep('join')}
                disabled={availableSlots.length === 0 && !userSlot}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  availableSlots.length === 0 && !userSlot
                    ? 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed'
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${preset.bgColor} flex items-center justify-center`}>
                    <User size={20} className={preset.color} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">Jag behöver plats</div>
                    <div className="text-xs text-gray-400">Välj en bil att åka med</div>
                  </div>
                </div>
              </button>
            )}
          </>
        ) : (
          // Tasks: simple options - everything handled in join step
          <>
            <button
              onClick={() => setStep('create')}
              className="w-full p-4 rounded-xl border text-left transition-all bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${preset.bgColor} flex items-center justify-center`}>
                  <Plus size={20} className={preset.color} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">Skapa uppgift</div>
                  <div className="text-xs text-gray-400">Lägg till en ny uppgift</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => setStep('join')}
              disabled={slots.length === 0}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                slots.length === 0
                  ? 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed'
                  : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${preset.bgColor} flex items-center justify-center`}>
                  <Check size={20} className={preset.color} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">Välj uppgifter</div>
                  <div className="text-xs text-gray-400">Välj vilka uppgifter du tar</div>
                </div>
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  );
  
  // Toggle passenger selection
  const togglePassenger = (email) => {
    setSelectedPassengers(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };
  
  // Get participant display name
  const getParticipantName = (participant) => {
    return participant.name || participant.email?.split('@')[0] || 'Okänd';
  };
  
  // Render step 2A: Create slot
  const renderCreateStep = () => (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => {
          setSelectedPassengers([]);
          setStep('intent');
        }}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        Tillbaka
      </button>
      
      <div className="space-y-3">
        {/* Label input */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            {data.preset === 'carpool' ? 'Ditt namn (för "Bil X")' : 'Uppgiftens namn'}
          </label>
          <input
            type="text"
            value={slotLabel}
            onChange={(e) => setSlotLabel(e.target.value)}
            placeholder={data.preset === 'carpool' ? 'T.ex. Jocke' : 'T.ex. Rensa rabatter'}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        {/* Capacity input */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            {preset.capacityLabel}
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={slotCapacity}
            onChange={(e) => setSlotCapacity(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        {/* Info input */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Info till {data.preset === 'carpool' ? 'passagerare' : 'andra'} (valfritt)
          </label>
          <input
            type="text"
            value={slotInfo}
            onChange={(e) => setSlotInfo(e.target.value)}
            placeholder={preset.infoPlaceholder}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        {/* Passenger selection for carpool */}
        {data.preset === 'carpool' && (
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Passagerare ({selectedPassengers.length + 1}/{slotCapacity || preset.defaultCapacity} platser)
            </label>
            <div className="flex flex-wrap gap-2">
              {/* Driver (current user) - always shown and can't be removed */}
              <div
                className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 ${preset.bgColor} ${preset.color} border border-blue-500/50`}
              >
                <Car size={12} />
                {getDisplayName(currentUserKey)} (förare)
                <Check size={12} />
              </div>
              
              {/* Available passengers */}
              {availableParticipants.map((p, i) => {
                const isSelected = selectedPassengers.includes(p.email);
                const maxPassengers = (parseInt(slotCapacity) || preset.defaultCapacity) - 1; // -1 for driver
                const canSelect = isSelected || selectedPassengers.length < maxPassengers;
                
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => canSelect && togglePassenger(p.email)}
                    disabled={!canSelect}
                    className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all ${
                      isSelected 
                        ? `${preset.bgColor} ${preset.color} border border-blue-500/50`
                        : canSelect
                          ? 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                          : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <User size={12} />
                    {getParticipantName(p)}
                    {isSelected && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Create button */}
      <button
        onClick={handleCreateSlot}
        disabled={!slotLabel.trim()}
        className={`w-full py-3 rounded-xl font-medium transition-all ${
          slotLabel.trim() 
            ? `${preset.bgColor} ${preset.color} hover:opacity-90` 
            : 'bg-white/5 text-gray-500 cursor-not-allowed'
        }`}
      >
        {preset.createButtonLabel}
      </button>
    </div>
  );
  
  // Handle removing a passenger from the car
  const handleRemovePassenger = async (emailKey) => {
    if (userCreatedSlot && emailKey !== currentUserKey) {
      await onLeaveSlot(userCreatedSlot.id, emailKey);
      // Modal will be updated via props change from parent
    }
  };
  
  // Handle adding a single passenger directly
  const handleAddPassenger = async (email) => {
    if (!userCreatedSlot) return;
    const key = email.replace(/\./g, '_DOT_');
    if (!userCreatedSlot.assignees?.includes(key)) {
      await onJoinSlot(userCreatedSlot.id, key);
      // Modal will be updated via props change from parent
    }
  };
  
  // Render step: Fill existing car with passengers
  const renderFillStep = () => {
    if (!userCreatedSlot) return null;
    
    const spotsLeft = getSpotsLeft(userCreatedSlot);
    
    // Get current passengers (excluding driver)
    const currentPassengers = (userCreatedSlot.assignees || []).filter(key => key !== currentUserKey);
    
    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => {
            setSelectedPassengers([]);
            setStep('intent');
          }}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          Tillbaka
        </button>
        
        {/* Current car info with passengers */}
        <div className={`p-3 rounded-xl ${preset.bgColor} border ${preset.borderColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">{userCreatedSlot.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {userCreatedSlot.assignees?.length || 1}/{userCreatedSlot.capacity} platser
              </div>
            </div>
          </div>
          
          {/* Current passengers in car */}
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
            {/* Driver */}
            <div className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Car size={12} className={preset.color} />
              </div>
              <span className="text-white flex-1">{getDisplayName(currentUserKey)} (förare)</span>
            </div>
            
            {/* Passengers with remove button */}
            {currentPassengers.map((key, i) => {
              const baseName = getDisplayName(key);
              const details = userCreatedSlot.assigneeDetails?.[key];
              const displayName = details?.extraSeats > 0 
                ? `${baseName} (+${details.note || details.extraSeats})`
                : baseName;
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <User size={12} className="text-gray-400" />
                  </div>
                  <span className="text-gray-300 flex-1">{displayName}</span>
                  <button
                    onClick={() => handleRemovePassenger(key)}
                    className="w-6 h-6 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors"
                    title="Ta bort passagerare"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Passenger selection - add directly on click */}
        {spotsLeft > 0 && availableParticipants.length > 0 && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Lägg till passagerare ({spotsLeft} {spotsLeft === 1 ? 'plats' : 'platser'} kvar)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableParticipants.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAddPassenger(p.email)}
                  className="px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                >
                  <User size={12} />
                  {getParticipantName(p)}
                  <Plus size={12} className="text-gray-500" />
                </button>
              ))}
            </div>
          </div>
        )}
        
        {spotsLeft === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            Bilen är full
          </div>
        )}
        
        {spotsLeft > 0 && availableParticipants.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            Inga fler deltagare att lägga till
          </div>
        )}
      </div>
    );
  };
  
  // Render step 2B: Join slot
  const renderJoinStep = () => {
    // For tasks, show ALL slots (not just available), for carpool show only available
    const slotsToShow = data.preset === 'tasks' ? slots : availableSlots;
    
    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => setStep('intent')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          Tillbaka
        </button>
        
        {slotsToShow.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">Inga {data.preset === 'carpool' ? 'lediga bilar' : 'uppgifter skapade'}</div>
            <button
              onClick={() => setStep('create')}
              className={`text-sm ${preset.color} hover:underline`}
            >
              Skapa en själv
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {slotsToShow.map((slot) => {
              const spotsLeft = getSpotsLeft(slot);
              const isAlreadyHere = slot.assignees?.includes(currentUserKey);
              const isFull = spotsLeft === 0;
              
              return (
                <div 
                  key={slot.id} 
                  className={`p-4 rounded-xl border transition-colors ${
                    isAlreadyHere 
                      ? `${preset.bgColor} ${preset.borderColor}` 
                      : 'bg-white/[0.03] border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white">{slot.label}</div>
                      {slot.info && (
                        <div className="text-xs text-gray-400 mt-0.5">{slot.info}</div>
                      )}
                      {!isFull && (
                        <div className="text-xs text-green-400 mt-1">
                          {preset.spotsLeftLabel(spotsLeft)}
                        </div>
                      )}
                      {isFull && !isAlreadyHere && (
                        <div className="text-xs text-gray-500 mt-1">Full</div>
                      )}
                      
                      {/* Current assignees */}
                      {slot.assignees && slot.assignees.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {slot.assignees.map((key, i) => {
                            const baseName = key === currentUserKey ? 'Du' : getDisplayName(key);
                            const details = slot.assigneeDetails?.[key];
                            const displayName = details?.extraSeats > 0 
                              ? `${baseName} (+${details.note || details.extraSeats})`
                              : baseName;
                            return (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                {displayName}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {data.preset === 'tasks' ? (
                      // Tasks: toggle button + delete for creator
                      <div className="flex items-center gap-2">
                        {isUserCreator(slot) && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Ta bort uppgiften "${slot.label}"?`)) {
                                onDeleteSlot(slot.id);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors"
                            title="Ta bort uppgift"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleTask(slot.id)}
                          disabled={isFull && !isAlreadyHere}
                          className={`w-16 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isAlreadyHere
                              ? 'bg-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-400'
                              : isFull
                                ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                                : `${preset.bgColor} ${preset.color} hover:opacity-90`
                          }`}
                        >
                          {isAlreadyHere ? 'Lämna' : 'Välj'}
                        </button>
                      </div>
                    ) : (
                      // Carpool: select button (already selected shows "Vald")
                      isAlreadyHere ? (
                        <span className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-gray-400">
                          Vald
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoinSlot(slot.id)}
                          className={`px-4 py-2 rounded-lg ${preset.bgColor} ${preset.color} hover:opacity-90 text-sm font-medium transition-colors`}
                        >
                          Välj
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  
  // Render confirm join step (for carpool - extra seats confirmation)
  const renderConfirmJoinStep = () => {
    const slot = slots.find(s => s.id === joiningSlotId);
    if (!slot) return null;
    
    const spotsLeft = getSpotsLeft(slot);
    const totalNeeded = 1 + extraSeats;
    const canFit = totalNeeded <= spotsLeft;
    
    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => {
            setJoiningSlotId(null);
            setExtraSeats(0);
            setExtraSeatsNote('');
            setStep('join');
          }}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          Tillbaka
        </button>
        
        {/* Selected car info */}
        <div className={`p-3 rounded-xl ${preset.bgColor} border ${preset.borderColor}`}>
          <div className="font-medium text-white">{slot.label}</div>
          {slot.info && (
            <div className="text-xs text-gray-400 mt-0.5">{slot.info}</div>
          )}
          <div className="text-xs text-gray-400 mt-1">
            {spotsLeft} {spotsLeft === 1 ? 'plats' : 'platser'} kvar
          </div>
        </div>
        
        {/* Extra seats question */}
        <div className="space-y-3">
          <label className="block text-sm text-gray-300 font-medium">
            Åker du med någon?
          </label>
          
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer hover:bg-white/[0.05] transition-colors">
              <input 
                type="radio" 
                name="extraSeats" 
                checked={extraSeats === 0}
                onChange={() => setExtraSeats(0)}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-white">Nej, bara jag</span>
            </label>
            
            <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer hover:bg-white/[0.05] transition-colors">
              <input 
                type="radio" 
                name="extraSeats" 
                checked={extraSeats > 0}
                onChange={() => setExtraSeats(1)}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-white">Ja, vi är totalt</span>
              <select 
                value={extraSeats > 0 ? 1 + extraSeats : 2}
                onChange={(e) => setExtraSeats(parseInt(e.target.value) - 1)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (extraSeats === 0) setExtraSeats(1);
                }}
                className="ml-auto px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {[2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n} personer</option>
                ))}
              </select>
            </label>
          </div>
          
          {/* Note field when extra seats selected */}
          {extraSeats > 0 && (
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Beskriv vilka (valfritt)
              </label>
              <input
                type="text"
                value={extraSeatsNote}
                onChange={(e) => setExtraSeatsNote(e.target.value)}
                placeholder={`T.ex. "${extraSeats} barn" eller "min fru"`}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
          
          {/* Warning if not enough seats */}
          {!canFit && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
              Det finns bara {spotsLeft} {spotsLeft === 1 ? 'plats' : 'platser'} kvar i denna bil, men ni behöver {totalNeeded}.
            </div>
          )}
        </div>
        
        {/* Confirm button */}
        <button
          onClick={handleConfirmJoin}
          disabled={!canFit}
          className={`w-full py-3 rounded-xl font-medium transition-all ${
            canFit 
              ? `${preset.bgColor} ${preset.color} hover:opacity-90` 
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}
        >
          Bekräfta
        </button>
      </div>
    );
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[2000] flex items-end sm:items-center justify-center sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 sm:rounded-xl border-t sm:border border-white/10 w-full sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${preset.bgColor} flex items-center justify-center`}>
              <PresetIcon size={20} className={preset.color} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{data.title || preset.title}</h2>
              <p className="text-xs text-gray-400">
                {step === 'intent' && 'Vad vill du göra?'}
                {step === 'create' && preset.createTitle}
                {step === 'join' && `Välj ${preset.slotLabel}`}
                {step === 'fill' && 'Fyll din bil'}
                {step === 'confirm-join' && 'Bekräfta deltagande'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {step === 'intent' && renderIntentStep()}
          {step === 'create' && renderCreateStep()}
          {step === 'join' && renderJoinStep()}
          {step === 'fill' && renderFillStep()}
          {step === 'confirm-join' && renderConfirmJoinStep()}
        </div>
      </div>
    </div>
  );
}

export default DistributionModal;
