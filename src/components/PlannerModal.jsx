import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Plus, Trash2, Link2, FileText, RotateCcw, Utensils, Wine, Home, Edit2, GripVertical, Move, Maximize2, MoreVertical, Grid3X3, Check } from 'lucide-react';
import { useConfirm } from '../utils/useConfirm';

const SLOTS = [
  { id: 'morning', label: 'Förmiddag', shortLabel: 'Förm.', Icon: null, tint: 'bg-gray-500/5', activeTint: 'bg-gray-500/15' },
  { id: 'lunch', label: 'Lunch', shortLabel: 'Lunch', Icon: Utensils, tint: 'bg-blue-500/5', activeTint: 'bg-blue-500/15' },
  { id: 'afternoon', label: 'Eftermiddag', shortLabel: 'Efterm.', Icon: null, tint: 'bg-gray-500/5', activeTint: 'bg-gray-500/15' },
  { id: 'dinner', label: 'Middag', shortLabel: 'Middag', Icon: Wine, tint: 'bg-blue-500/5', activeTint: 'bg-blue-500/15' },
  { id: 'evening', label: 'Kväll', shortLabel: 'Kväll', Icon: null, tint: 'bg-gray-600/8', activeTint: 'bg-gray-500/20' },
];

const formatDate = (startDate, dayIndex) => {
  if (!startDate) {
    return `Dag ${dayIndex + 1}`;
  }
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayIndex);
  const weekday = date.toLocaleDateString('sv-SE', { weekday: 'short' }).slice(0, 3);
  const day = date.getDate();
  const month = date.toLocaleDateString('sv-SE', { month: 'short' }).replace('.', '').slice(0, 3);
  return `${weekday} ${day} ${month}`;
};

const getShortDate = (startDate, dayIndex) => {
  if (!startDate) {
    return `Dag ${dayIndex + 1}`;
  }
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayIndex);
  const weekday = date.toLocaleDateString('sv-SE', { weekday: 'short' }).slice(0, 3);
  const day = date.getDate();
  const month = date.toLocaleDateString('sv-SE', { month: 'short' }).replace('.', '').slice(0, 3);
  return `${weekday} ${day} ${month}`;
};

export default function PlannerModal({ 
  isOpen, 
  onClose, 
  planningData, 
  onSave, 
  onDelete, // callback to completely remove planner
  linkedObjects = [],
  linkedUrls = [],
  canEdit = false,
  onNavigateToObject, // callback to navigate to a linked object
  onOpenUrl // callback to open a linked URL
}) {
  const confirm = useConfirm();
  
  // Initialize state from planningData or defaults
  const [startDate, setStartDate] = useState(planningData?.startDate || null);
  const [days, setDays] = useState(planningData?.days || 5);
  const [slots, setSlots] = useState(planningData?.slots || {});
  const [accommodation, setAccommodation] = useState(planningData?.accommodation || []);
  const [visibleStartDay, setVisibleStartDay] = useState(0);
  const [editingCell, setEditingCell] = useState(null); // { day, slotId } or { type: 'accommodation', index }
  const [showSetup, setShowSetup] = useState(!planningData);
  const [tempText, setTempText] = useState('');
  const [tempObjectId, setTempObjectId] = useState(null);
  const [tempUrlId, setTempUrlId] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // View mode by default
  const [draggingCell, setDraggingCell] = useState(null); // { day, slotId, data }
  const [dragOverCell, setDragOverCell] = useState(null); // { day, slotId }
  const [dragMode, setDragMode] = useState('move'); // 'move' or 'copy'
  const [expandedCell, setExpandedCell] = useState(null); // { key, rect } - for viewing full text
  const expandedCellRef = useRef(null);
  const [editingAccommodation, setEditingAccommodation] = useState(null); // { dayIndex, existing }
  const [tempAccommodationText, setTempAccommodationText] = useState('');
  const [tempSubtext, setTempSubtext] = useState(''); // Subtext for cells
  const [tempAccommodationObjectId, setTempAccommodationObjectId] = useState(null);
  const [tempAccommodationUrlId, setTempAccommodationUrlId] = useState(null);
  const [tempAccommodationStartDay, setTempAccommodationStartDay] = useState(0);
  const [tempAccommodationEndDay, setTempAccommodationEndDay] = useState(0);
  
  const gridRef = useRef(null);
  const touchStartX = useRef(0);
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [manualVisibleDays, setManualVisibleDays] = useState(null); // null = auto, or 2/3
  
  // Number of visible days based on screen (or manual override)
  const [visibleDays, setVisibleDays] = useState(3);
  
  useEffect(() => {
    const updateVisibleDays = () => {
      const width = window.innerWidth;
      if (manualVisibleDays !== null && width < 768) {
        // Use manual override on mobile
        setVisibleDays(manualVisibleDays);
      } else if (width >= 1024) setVisibleDays(7);
      else if (width >= 768) setVisibleDays(5);
      else setVisibleDays(manualVisibleDays || 3);
    };
    updateVisibleDays();
    window.addEventListener('resize', updateVisibleDays);
    return () => window.removeEventListener('resize', updateVisibleDays);
  }, [manualVisibleDays]);
  
  // Set initial visible day: if using dates and today is within the planning period, start on today
  useEffect(() => {
    if (isOpen && startDate && days > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const planStart = new Date(startDate);
      planStart.setHours(0, 0, 0, 0);
      const planEnd = new Date(planStart);
      planEnd.setDate(planEnd.getDate() + days - 1);
      
      if (today >= planStart && today <= planEnd) {
        const dayIndex = Math.floor((today - planStart) / (1000 * 60 * 60 * 24));
        setVisibleStartDay(dayIndex);
      } else {
        setVisibleStartDay(0);
      }
    } else if (isOpen) {
      setVisibleStartDay(0);
    }
  }, [isOpen, startDate, days]);
  
  if (!isOpen) return null;
  
  // Handle swipe navigation
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 50) {
      setExpandedCell(null); // Close any expanded cell when swiping
      if (diff > 0 && visibleStartDay + visibleDays < days) {
        setVisibleStartDay(Math.min(visibleStartDay + 1, days - visibleDays));
      } else if (diff < 0 && visibleStartDay > 0) {
        setVisibleStartDay(Math.max(visibleStartDay - 1, 0));
      }
    }
  };
  
  const navigateDays = (direction) => {
    setExpandedCell(null); // Close any expanded cell when navigating
    if (direction === 'prev' && visibleStartDay > 0) {
      setVisibleStartDay(visibleStartDay - 1);
    } else if (direction === 'next' && visibleStartDay + visibleDays < days) {
      setVisibleStartDay(visibleStartDay + 1);
    }
  };
  
  // Get slot data
  const getSlotData = (dayIndex, slotId) => {
    const key = `${dayIndex}-${slotId}`;
    return slots[key] || null;
  };
  
  // Update slot
  const updateSlot = (dayIndex, slotId, data) => {
    const key = `${dayIndex}-${slotId}`;
    setSlots(prev => ({
      ...prev,
      [key]: data
    }));
    setHasChanges(true);
  };
  
  // Clear slot
  const clearSlot = (dayIndex, slotId) => {
    const key = `${dayIndex}-${slotId}`;
    setSlots(prev => {
      const newSlots = { ...prev };
      delete newSlots[key];
      return newSlots;
    });
    setHasChanges(true);
    setEditingCell(null);
  };
  
  // Handle cell click
  const handleCellClick = (dayIndex, slotId) => {
    // If long press was triggered, don't handle click
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    
    // If dragging, handle drop
    if (draggingCell) {
      handleDrop(dayIndex, slotId);
      return;
    }
    
    const data = getSlotData(dayIndex, slotId);
    
    // In view mode
    if (!isEditMode) {
      // If cell has linked object
      if (data?.objectId && onNavigateToObject) {
        const obj = linkedObjects.find(o => o.id === data.objectId);
        if (obj) {
          // Check if title or subtext is likely truncated (rough estimate based on character count)
          const displayText = obj.title || '';
          const subtext = data?.subtext || '';
          const isTruncated = displayText.length > 15 || subtext.length > 20;
          
          if (isTruncated) {
            // Expand to show full content first
            const cellKey = `${dayIndex}-${slotId}`;
            if (expandedCell?.key === cellKey) {
              setExpandedCell(null);
              expandedCellRef.current = null;
            } else {
              setExpandedCell({ key: cellKey });
            }
          } else {
            // Short enough - navigate directly
            onClose();
            onNavigateToObject(obj);
          }
        }
        return;
      }
      
      // If cell has linked URL
      if (data?.urlId) {
        const url = linkedUrls.find(u => u.id === data.urlId);
        if (url) {
          const displayText = url.title || '';
          const subtext = data?.subtext || '';
          const isTruncated = displayText.length > 15 || subtext.length > 20;
          
          if (isTruncated) {
            // Expand to show full content first
            const cellKey = `${dayIndex}-${slotId}`;
            if (expandedCell?.key === cellKey) {
              setExpandedCell(null);
              expandedCellRef.current = null;
            } else {
              setExpandedCell({ key: cellKey });
            }
          } else {
            // Short enough - open URL directly
            if (onOpenUrl) {
              onOpenUrl(url);
            } else {
              window.open(url.url, '_blank');
            }
          }
        }
        return;
      }
      
      // If cell has text (but no link), toggle expanded view
      if (data?.text) {
        const cellKey = `${dayIndex}-${slotId}`;
        // Toggle off if same cell, otherwise expand
        if (expandedCell?.key === cellKey) {
          setExpandedCell(null);
          expandedCellRef.current = null;
        } else {
          // Store cell position for the expanding effect
          setExpandedCell({ key: cellKey });
        }
      }
      return;
    }
    
    // Edit mode - open edit dialog
    if (!canEdit) return;
    setTempText(data?.text || '');
    setTempSubtext(data?.subtext || '');
    setTempObjectId(data?.objectId || null);
    setTempUrlId(data?.urlId || null);
    setEditingCell({ day: dayIndex, slotId });
  };
  
  // Long press handlers for drag & drop
  const handleLongPressStart = (dayIndex, slotId) => {
    if (!isEditMode || !canEdit) return;
    
    const data = getSlotData(dayIndex, slotId);
    if (!data) return; // Can only drag cells with content
    
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setDraggingCell({ day: dayIndex, slotId, data });
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500); // 500ms long press
  };
  
  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  
  // Cancel drag
  const cancelDrag = () => {
    setDraggingCell(null);
    setDragOverCell(null);
  };
  
  // Handle drop
  const handleDrop = (targetDay, targetSlotId) => {
    if (!draggingCell) return;
    
    const sourceKey = `${draggingCell.day}-${draggingCell.slotId}`;
    const targetKey = `${targetDay}-${targetSlotId}`;
    
    if (sourceKey === targetKey) {
      setDraggingCell(null);
      setDragOverCell(null);
      return;
    }
    
    // Move or copy based on dragMode
    setSlots(prev => {
      const newSlots = { ...prev };
      const targetData = newSlots[targetKey];
      
      // Copy source data to target
      newSlots[targetKey] = { ...draggingCell.data };
      
      if (dragMode === 'move') {
        // If target had data, move it to source (swap)
        if (targetData) {
          newSlots[sourceKey] = targetData;
        } else {
          delete newSlots[sourceKey];
        }
      }
      // In copy mode, we don't modify the source
      
      return newSlots;
    });
    
    setHasChanges(true);
    setDraggingCell(null);
    setDragOverCell(null);
  };
  
  // Handle accommodation click
  const handleAccommodationClick = (dayIndex) => {
    // Find if there's accommodation for this day
    const existingAcc = accommodation.find(a => dayIndex >= a.startDay && dayIndex <= a.endDay);
    
    // In view mode - navigate to linked object/URL if exists
    if (!isEditMode) {
      if (existingAcc?.objectId && onNavigateToObject) {
        const obj = linkedObjects.find(o => o.id === existingAcc.objectId);
        if (obj) {
          onClose();
          onNavigateToObject(obj);
        }
      } else if (existingAcc?.urlId) {
        const url = linkedUrls.find(u => u.id === existingAcc.urlId);
        if (url) {
          if (onOpenUrl) {
            onOpenUrl(url);
          } else {
            window.open(url.url, '_blank');
          }
        }
      }
      return;
    }
    
    if (!canEdit) return;
    
    setTempAccommodationText(existingAcc?.text || '');
    setTempAccommodationObjectId(existingAcc?.objectId || null);
    setTempAccommodationUrlId(existingAcc?.urlId || null);
    setTempAccommodationStartDay(existingAcc?.startDay ?? dayIndex);
    setTempAccommodationEndDay(existingAcc?.endDay ?? dayIndex);
    setEditingAccommodation({ dayIndex, existing: existingAcc });
  };
  
  // Save accommodation
  const saveAccommodation = () => {
    if (!editingAccommodation) return;
    
    const { existing } = editingAccommodation;
    
    if (tempAccommodationText.trim() || tempAccommodationObjectId || tempAccommodationUrlId) {
      const newAcc = {
        startDay: tempAccommodationStartDay,
        endDay: tempAccommodationEndDay,
        text: tempAccommodationText.trim(),
        objectId: tempAccommodationObjectId,
        urlId: tempAccommodationUrlId
      };
      
      if (existing) {
        // Update existing
        setAccommodation(prev => prev.map(a => 
          a === existing ? newAcc : a
        ));
      } else {
        // Add new
        setAccommodation(prev => [...prev, newAcc]);
      }
    } else if (existing) {
      // Remove
      setAccommodation(prev => prev.filter(a => a !== existing));
    }
    
    setHasChanges(true);
    setEditingAccommodation(null);
    setTempAccommodationText('');
    setTempAccommodationObjectId(null);
    setTempAccommodationUrlId(null);
  };

  // Save cell edit
  const saveCellEdit = () => {
    if (!editingCell || editingCell.type === 'accommodation') return;
    
    const { day, slotId } = editingCell;
    if (tempText.trim() || tempObjectId || tempUrlId) {
      updateSlot(day, slotId, {
        text: tempText.trim() || null,
        objectId: tempObjectId,
        urlId: tempUrlId,
        subtext: tempSubtext.trim() || null
      });
    } else {
      clearSlot(day, slotId);
    }
    setEditingCell(null);
    setTempText('');
    setTempSubtext('');
    setTempObjectId(null);
    setTempUrlId(null);
  };
  
  // Get linked object by ID
  const getLinkedObject = (objectId) => {
    const obj = linkedObjects.find(o => o.id === objectId);
    if (!obj) return null;
    // Extract title from blocks
    const titleBlock = obj.blocks?.find(b => b.type === 'title');
    return {
      ...obj,
      title: titleBlock?.data?.text || 'Namnlöst'
    };
  };
  
  // Get linked URL by ID
  const getLinkedUrl = (urlId) => {
    return linkedUrls.find(u => u.id === urlId) || null;
  };
  
  // Get title for any linked object
  const getObjectTitle = (obj) => {
    const titleBlock = obj.blocks?.find(b => b.type === 'title');
    return titleBlock?.data?.text || 'Namnlöst';
  };
  
  // Save all changes
  const handleSave = () => {
    onSave({
      startDate,
      days,
      slots,
      accommodation
    });
    setHasChanges(false);
    setIsEditMode(false);
  };
  
  // Handle close with unsaved changes check
  const handleClose = async () => {
    if (hasChanges) {
      if (await confirm({ title: 'Osparade ändringar', message: 'Vill du stänga utan att spara?', confirmText: 'Stäng', variant: 'warning' })) {
        onClose();
      }
    } else {
      onClose();
    }
  };
  
  // Setup screen
  if (showSetup) {
    return (
      <div className="fixed inset-0 z-[3100] bg-gray-950 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Skapa planering</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        
        {/* Setup form */}
        <div className="flex-1 p-4 space-y-6">
          {/* Number of days */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Antal dagar</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="3"
                max="14"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-lg font-semibold text-white w-8 text-center">{days}</span>
            </div>
          </div>
          
          {/* Date type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Datumformat</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStartDate(null)}
                className={`p-4 rounded-xl border text-left ${!startDate ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5'}`}
              >
                <div className="font-medium text-white">Dag 1, 2, 3...</div>
                <div className="text-xs text-gray-400 mt-1">Utan specifika datum</div>
              </button>
              <button
                type="button"
                onClick={() => setStartDate(new Date().toISOString().split('T')[0])}
                className={`p-4 rounded-xl border text-left ${startDate ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5'}`}
              >
                <div className="font-medium text-white">Riktiga datum</div>
                <div className="text-xs text-gray-400 mt-1">Välj startdatum</div>
              </button>
            </div>
          </div>
          
          {/* Start date picker */}
          {startDate && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Startdatum</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setShowSetup(false)}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl"
          >
            Skapa planering
          </button>
        </div>
      </div>
    );
  }
  
  // Main planner view
  return (
    <div className="fixed inset-0 z-[3100] bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-gray-900">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white truncate">Planering</h2>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {startDate ? `${formatDate(startDate, 0)} - ${formatDate(startDate, days - 1)}` : `${days} dagar`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit mode toggle - just a pen icon */}
          {canEdit && (
            <button
              onClick={async () => {
                if (isEditMode && hasChanges) {
                  if (await confirm({ title: 'Spara ändringar?', message: 'Du har osparade ändringar. Vill du spara?', confirmText: 'Spara', variant: 'info' })) {
                    handleSave();
                  }
                }
                setIsEditMode(!isEditMode);
              }}
              className={`p-2 rounded-lg transition-colors ${
                isEditMode 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'hover:bg-white/10 text-gray-400'
              }`}
              title={isEditMode ? 'Avsluta redigering' : 'Redigera'}
            >
              <Edit2 size={18} />
            </button>
          )}
          
          {/* More menu */}
          {canEdit && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                title="Mer"
              >
                <MoreVertical size={18} />
              </button>
              
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-[3101]" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 rounded-lg shadow-xl border border-white/10 py-1 z-[3102]">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettings(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-700/50 flex items-center gap-2"
                    >
                      <Grid3X3 size={14} />
                      Inställningar
                    </button>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      type="button"
                      onClick={async () => {
                        if (await confirm({ title: 'Rensa planering?', message: 'Boende och tidpunkter töms.', confirmText: 'Rensa', variant: 'warning' })) {
                          setSlots({});
                          setAccommodation([]);
                          setHasChanges(true);
                        }
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-700/50 flex items-center gap-2"
                    >
                      <RotateCcw size={14} />
                      Rensa planering
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (await confirm({ title: 'Ta bort planering?', message: 'Planeringen tas bort helt. Detta kan inte ångras.', confirmText: 'Ta bort', variant: 'danger' })) {
                            onDelete();
                            onClose();
                          }
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Ta bort planering
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Close button */}
          <button 
            onClick={handleClose} 
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* Grid - main scrollable area */}
      <div 
        ref={gridRef}
        className="flex-1 overflow-auto p-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="min-h-full">
          {/* Day headers */}
          <div className="sticky top-0 z-10 bg-gray-950">
            <div className="grid gap-1" style={{ gridTemplateColumns: `56px repeat(${visibleDays}, 1fr)` }}>
              <div className="p-2 bg-gray-950"></div>
              {Array.from({ length: visibleDays }).map((_, i) => {
                const dayIndex = visibleStartDay + i;
                if (dayIndex >= days) return <div key={i} className="bg-gray-950" />;
                return (
                  <div key={i} className="p-2 text-center bg-white/5 rounded-t-lg">
                    <div className="text-xs font-medium text-white/80 truncate">
                      {getShortDate(startDate, dayIndex)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Accommodation row */}
          <div className="mt-1">
            <div className="grid" style={{ gridTemplateColumns: `56px repeat(${visibleDays}, 1fr)`, gap: '0 4px' }}>
              <div className="p-2 flex items-center justify-center">
                <Home size={18} className="text-blue-400" />
              </div>
              {Array.from({ length: visibleDays }).map((_, i) => {
                const dayIndex = visibleStartDay + i;
                if (dayIndex >= days) return <div key={i} />;
                
                // Check if there's accommodation spanning this day
                const acc = accommodation.find(a => dayIndex >= a.startDay && dayIndex <= a.endDay);
                const isStart = acc && dayIndex === acc.startDay;
                const isEnd = acc && dayIndex === acc.endDay;
                const isMiddle = acc && !isStart && !isEnd;
                const isFirstVisible = acc && dayIndex === Math.max(acc.startDay, visibleStartDay);
                const linkedAccObj = acc?.objectId ? getLinkedObject(acc.objectId) : null;
                const linkedAccUrl = acc?.urlId ? getLinkedUrl(acc.urlId) : null;
                const isLinked = linkedAccObj || linkedAccUrl;
                const displayText = acc?.text || linkedAccObj?.title || linkedAccUrl?.title || 'Boende';
                
                // For accommodation cells, remove gap between connected cells
                const gapStyle = acc && !isEnd ? { marginRight: '-4px', paddingRight: '4px' } : {};
                
                // Determine border radius for connected bar effect
                const roundedClasses = acc 
                  ? `${isStart ? 'rounded-l-lg' : ''} ${isEnd ? 'rounded-r-lg' : ''}`
                  : 'rounded-lg';
                
                // Clickable in view mode if linked, or in edit mode
                const isClickable = (acc && isLinked) || (isEditMode && canEdit);
                
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAccommodationClick(dayIndex)}
                    style={gapStyle}
                    className={`group min-h-[44px] flex items-center justify-center transition-all ${roundedClasses} ${
                      acc 
                        ? 'bg-blue-500/20 hover:bg-blue-500/30' 
                        : 'bg-white/[0.02] hover:bg-white/5 rounded-lg border border-dashed border-white/10 hover:border-white/20'
                    } ${isClickable ? 'cursor-pointer' : ''}`}
                  >
                    {isFirstVisible ? (
                      <span className={`text-xs truncate px-2 font-medium ${isLinked ? 'text-blue-300' : 'text-blue-200'}`}>
                        {displayText}
                      </span>
                    ) : !acc && isEditMode && canEdit ? (
                      <span className="text-gray-500 text-lg font-light">+</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Time slots */}
          {SLOTS.map((slot) => {
            const SlotIcon = slot.Icon;
            return (
            <div key={slot.id} className="mt-1">
              <div className="grid gap-1" style={{ gridTemplateColumns: `56px repeat(${visibleDays}, 1fr)` }}>
                {/* Slot label */}
                <div className={`p-1 flex flex-col items-center justify-center text-center rounded-lg ${slot.tint}`}>
                  {SlotIcon ? (
                    <>
                      <SlotIcon size={14} className="text-gray-500" />
                      <span className="text-[10px] text-gray-500 leading-tight mt-0.5">{slot.shortLabel}</span>
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-500 font-medium">{slot.shortLabel}</span>
                  )}
                </div>
                
                {/* Day cells */}
                {Array.from({ length: visibleDays }).map((_, i) => {
                  const dayIndex = visibleStartDay + i;
                  if (dayIndex >= days) return <div key={i} />;
                  
                  const data = getSlotData(dayIndex, slot.id);
                  const linkedObj = data?.objectId ? getLinkedObject(data.objectId) : null;
                  const linkedUrl = data?.urlId ? getLinkedUrl(data.urlId) : null;
                  const hasContent = linkedObj || linkedUrl || data?.text;
                  const isLinked = linkedObj || linkedUrl;
                  const linkedTitle = linkedObj?.title || linkedUrl?.title;
                  const isDragging = draggingCell?.day === dayIndex && draggingCell?.slotId === slot.id;
                  const isDragOver = draggingCell && !isDragging;
                  const cellKey = `${dayIndex}-${slot.id}`;
                  const isExpanded = expandedCell?.key === cellKey;
                  
                  return (
                    <div key={i} className="relative min-w-0 overflow-hidden">
                      <button
                        type="button"
                        onClick={(e) => {
                          // Store rect for potential expansion (text or linked items)
                          if (!isEditMode && (data?.text || data?.objectId || data?.urlId)) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            expandedCellRef.current = rect;
                          }
                          handleCellClick(dayIndex, slot.id);
                        }}
                        onMouseDown={() => handleLongPressStart(dayIndex, slot.id)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={(e) => {
                          // Store rect on touch for potential expansion
                          if (!isEditMode && (data?.text || data?.objectId || data?.urlId)) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            expandedCellRef.current = rect;
                          }
                          handleLongPressStart(dayIndex, slot.id);
                        }}
                        onTouchEnd={handleLongPressEnd}
                        style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation' }}
                        className={`group w-full p-2 min-h-[64px] transition-all rounded-lg select-none overflow-hidden flex ${
                          isDragging 
                            ? 'bg-blue-500/30 ring-2 ring-blue-500 scale-105 shadow-lg' 
                            : hasContent 
                              ? `${slot.activeTint} hover:brightness-125` 
                              : `${slot.tint} hover:bg-white/10`
                        } ${isDragOver ? 'ring-1 ring-dashed ring-blue-400/50' : ''} ${isExpanded ? 'invisible' : ''} ${
                          hasContent ? 'flex-col justify-start items-start text-left' : 'items-center justify-center'
                        }`}
                      >
                        {isLinked ? (
                          <div className="flex flex-col gap-1 min-w-0 w-full">
                            <span className="text-xs font-medium text-blue-300 truncate">{linkedTitle}</span>
                            {data?.subtext && (
                              <span className="text-[10px] text-white/40 truncate">{data.subtext}</span>
                            )}
                          </div>
                        ) : data?.text ? (
                          <div className="flex flex-col gap-1 min-w-0 w-full">
                            <span className="text-xs font-medium text-white/90 line-clamp-2 leading-snug">{data.text}</span>
                            {data?.subtext && (
                              <span className="text-[10px] text-white/40 truncate">{data.subtext}</span>
                            )}
                          </div>
                        ) : (
                          isEditMode && canEdit && (
                            <span className="text-gray-500 text-lg font-light">+</span>
                          )
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
          })}
        </div>
      </div>
      
      {/* Drag mode indicator */}
      {draggingCell && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[3200] bg-gray-900 rounded-2xl shadow-lg border border-white/10 p-2 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDragMode('move')}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                dragMode === 'move' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Move size={14} />
              Flytta
            </button>
            <button
              onClick={() => setDragMode('copy')}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                dragMode === 'copy' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Plus size={14} />
              Kopiera
            </button>
            <button onClick={cancelDrag} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
              <X size={16} />
            </button>
          </div>
          <div className="text-xs text-center text-gray-500">
            Tryck på en cell för att {dragMode === 'move' ? 'flytta' : 'kopiera'} hit
          </div>
        </div>
      )}
      
      {/* Expanded cell overlay - grows from the cell position */}
      {expandedCell && !isEditMode && expandedCellRef.current && (() => {
        const [dayIndex, slotId] = expandedCell.key.split('-');
        const data = getSlotData(parseInt(dayIndex), slotId);
        if (!data?.text && !data?.objectId) return null;
        
        const linkedObj = data?.objectId ? getLinkedObject(data.objectId) : null;
        const linkedUrl = data?.urlId ? getLinkedUrl(data.urlId) : null;
        const slot = SLOTS.find(s => s.id === slotId);
        const rect = expandedCellRef.current;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Calculate max width (don't go past right edge - 16px margin)
        const maxWidth = Math.min(320, screenWidth - rect.left - 16);
        // Calculate max height (don't go past bottom - leave some margin)
        const maxHeight = screenHeight - rect.top - 80;
        
        // Get color classes based on slot
        const bgClass = slot?.activeTint || 'bg-gray-500/15';
        const borderClass = slotId === 'lunch' || slotId === 'dinner' 
          ? 'border-blue-400/30' 
          : 'border-gray-400/30';
        
        const handleClose = () => {
          setExpandedCell(null);
          expandedCellRef.current = null;
        };
        
        return (
          <div 
            className="fixed inset-0 z-[3150]"
            onClick={handleClose}
          >
            <div className="absolute inset-0 bg-black/20" />
            <div 
              className={`absolute ${bgClass} backdrop-blur-sm rounded-lg p-3 shadow-xl border ${borderClass} overflow-auto animate-expand-cell`}
              style={{
                top: rect.top,
                left: rect.left,
                minWidth: rect.width,
                minHeight: rect.height,
                maxWidth: maxWidth,
                maxHeight: maxHeight,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {linkedObj ? (
                <>
                  <button
                    onClick={() => {
                      handleClose();
                      onClose();
                      onNavigateToObject(linkedObj);
                    }}
                    className="text-left w-full hover:bg-white/10 -m-1 p-1 rounded transition-colors"
                  >
                    <span className="text-sm text-blue-300">{linkedObj.title}</span>
                  </button>
                  {data.subtext && (
                    <p className="text-xs text-white/50 mt-2 whitespace-pre-wrap">{data.subtext}</p>
                  )}
                </>
              ) : linkedUrl ? (
                <>
                  <button
                    onClick={() => {
                      handleClose();
                      if (onOpenUrl) {
                        onOpenUrl(linkedUrl);
                      } else {
                        window.open(linkedUrl.url, '_blank');
                      }
                    }}
                    className="text-left w-full hover:bg-white/10 -m-1 p-1 rounded transition-colors"
                  >
                    <span className="text-sm text-blue-300">{linkedUrl.title}</span>
                  </button>
                  {data.subtext && (
                    <p className="text-xs text-white/50 mt-2 whitespace-pre-wrap">{data.subtext}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-white/90 whitespace-pre-wrap">{data.text}</p>
                  {data.subtext && (
                    <p className="text-xs text-white/50 mt-2 whitespace-pre-wrap">{data.subtext}</p>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}
      
      {/* Bottom navigation - mobile friendly */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-t border-white/10 safe-area-inset-bottom">
        <button
          onClick={() => navigateDays('prev')}
          disabled={visibleStartDay === 0}
          className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/10 disabled:opacity-30 text-gray-400"
        >
          <ChevronLeft size={20} />
          <span className="text-sm hidden sm:inline">Föregående</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400">
            Dag {visibleStartDay + 1}-{Math.min(visibleStartDay + visibleDays, days)} av {days}
          </span>
          <span className="text-[10px] text-gray-600">Svep för att navigera</span>
        </div>
        <button
          onClick={() => navigateDays('next')}
          disabled={visibleStartDay + visibleDays >= days}
          className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/10 disabled:opacity-30 text-gray-400"
        >
          <span className="text-sm hidden sm:inline">Nästa</span>
          <ChevronRight size={20} />
        </button>
      </div>
      
      {/* Floating save button - bottom right */}
      {canEdit && hasChanges && (
        <button
          onClick={handleSave}
          className="fixed z-[3150] right-4 bottom-20 w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center touch-manipulation"
        >
          <Check size={24} strokeWidth={2.5} />
        </button>
      )}
      
      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[3200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center overflow-hidden" onClick={() => setShowSettings(false)}>
          <div 
            className="relative w-full sm:max-w-sm bg-gray-900 sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-medium text-white">Inställningar</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-white/10 rounded-lg touch-manipulation"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-5 overflow-y-auto flex-1">
              {/* Days visible toggle - only on mobile */}
              <div className="sm:hidden">
                <label className="block text-xs text-gray-400 mb-2">Visa dagar samtidigt</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(num => (
                    <button
                      key={num}
                      onClick={() => setManualVisibleDays(num)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        (manualVisibleDays || 3) === num
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Date mode toggle */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Datumläge</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setStartDate('');
                      setHasChanges(true);
                    }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      !startDate
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    Dag 1, 2, 3...
                  </button>
                  <button
                    onClick={() => {
                      if (!startDate) {
                        setStartDate(new Date().toISOString().split('T')[0]);
                        setHasChanges(true);
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      startDate
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    Datum
                  </button>
                </div>
              </div>
              
              {/* Date picker - only if date mode */}
              {startDate && (
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Startdatum</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setHasChanges(true);
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  />
                </div>
              )}
              
              {/* Change days */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Antal dagar</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (days > 1) {
                        setDays(days - 1);
                        setHasChanges(true);
                      }
                    }}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-xl font-medium"
                  >
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={days}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setDays('');
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num) && num >= 1 && num <= 30) {
                          setDays(num);
                        }
                      }
                      setHasChanges(true);
                    }}
                    onBlur={() => {
                      if (!days || days < 1) setDays(1);
                    }}
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-center text-lg font-medium"
                  />
                  <button
                    onClick={() => {
                      if (days < 30) {
                        setDays(days + 1);
                        setHasChanges(true);
                      }
                    }}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-xl font-medium"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            
            {/* Fixed bottom button */}
            <div className="p-4 border-t border-white/10 flex-shrink-0 bg-gray-900">
              <button 
                onClick={() => {
                  if (hasChanges) handleSave();
                  setShowSettings(false);
                }}
                className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 touch-manipulation"
              >
                <Check size={18} />
                Klar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit fullscreen modal on mobile */}
      {editingCell && editingCell.day !== undefined && (
        <div 
          className="fixed inset-0 z-[3200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" 
          onClick={() => setEditingCell(null)}
          style={{ touchAction: 'none' }}
        >
          <div 
            className="relative w-full sm:max-w-md bg-gray-900 rounded-t-2xl sm:rounded-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: 'pan-y' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="font-medium text-white">
                  {SLOTS.find(s => s.id === editingCell.slotId)?.label}
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(startDate, editingCell.day)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {(getSlotData(editingCell.day, editingCell.slotId)?.text || 
                  getSlotData(editingCell.day, editingCell.slotId)?.objectId) && (
                  <button 
                    onClick={() => clearSlot(editingCell.day, editingCell.slotId)}
                    className="p-2 hover:bg-red-500/10 rounded-lg touch-manipulation"
                    title="Rensa"
                  >
                    <Trash2 size={18} className="text-red-400" />
                  </button>
                )}
                <button 
                  onClick={() => setEditingCell(null)}
                  className="p-2 hover:bg-white/10 rounded-lg touch-manipulation"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Scrollable content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {/* Text input */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Anteckning</label>
                <div className="relative">
                  <input
                    type="text"
                    value={tempText}
                    onChange={(e) => setTempText(e.target.value)}
                    placeholder="T.ex. Wisby GK, Bistro H..."
                    className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-white text-base"
                  />
                  {tempText && (
                    <button
                      type="button"
                      onClick={() => setTempText('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full touch-manipulation"
                    >
                      <X size={16} className="text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Subtext input */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Stödtext (valfri)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={tempSubtext}
                    onChange={(e) => setTempSubtext(e.target.value)}
                    placeholder="T.ex. 10:00, boka i förväg..."
                    className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-white text-base"
                  />
                  {tempSubtext && (
                    <button
                      type="button"
                      onClick={() => setTempSubtext('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full touch-manipulation"
                    >
                      <X size={16} className="text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Linked items (objects and URLs) */}
              {(linkedObjects.length > 0 || linkedUrls.length > 0) && (
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Eller välj från innehållet</label>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {linkedObjects.map(obj => (
                      <button
                        key={obj.id}
                        type="button"
                        onClick={() => {
                          if (tempObjectId === obj.id) {
                            setTempObjectId(null);
                          } else {
                            setTempObjectId(obj.id);
                            setTempUrlId(null);
                            setTempText('');
                          }
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center gap-2 touch-manipulation ${
                          tempObjectId === obj.id 
                            ? 'border-blue-500 bg-blue-500/10' 
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <span className="text-sm text-blue-300 truncate">{getObjectTitle(obj)}</span>
                      </button>
                    ))}
                    {linkedUrls.map(url => (
                      <button
                        key={url.id}
                        type="button"
                        onClick={() => {
                          if (tempUrlId === url.id) {
                            setTempUrlId(null);
                          } else {
                            setTempUrlId(url.id);
                            setTempObjectId(null);
                            setTempText('');
                          }
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center gap-2 touch-manipulation ${
                          tempUrlId === url.id 
                            ? 'border-blue-500 bg-blue-500/10' 
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <Link2 size={14} className="text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-blue-300 truncate">{url.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              
            </div>
            
            {/* Fixed bottom button */}
            <div className="p-4 border-t border-white/10 flex-shrink-0 bg-gray-900">
              <button 
                onClick={saveCellEdit}
                className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 touch-manipulation"
              >
                <Check size={18} />
                Klar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Accommodation edit modal */}
      {editingAccommodation && (
        <div 
          className="fixed inset-0 z-[3200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" 
          onClick={() => setEditingAccommodation(null)}
          style={{ touchAction: 'none' }}
        >
          <div 
            className="relative w-full sm:max-w-md bg-gray-900 rounded-t-2xl sm:rounded-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: 'pan-y' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
              <div className="font-medium text-white flex items-center gap-2">
                <Home size={18} className="text-blue-400" />
                Boende
              </div>
              <div className="flex items-center gap-1">
                {editingAccommodation.existing && (
                  <button 
                    onClick={() => {
                      setAccommodation(prev => prev.filter(a => a !== editingAccommodation.existing));
                      setHasChanges(true);
                      setEditingAccommodation(null);
                    }}
                    className="p-2 hover:bg-red-500/10 rounded-lg touch-manipulation"
                    title="Ta bort boende"
                  >
                    <Trash2 size={18} className="text-red-400" />
                  </button>
                )}
                <button 
                  onClick={() => setEditingAccommodation(null)}
                  className="p-2 hover:bg-white/10 rounded-lg touch-manipulation"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {/* Day range selection */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Nätter ({tempAccommodationEndDay - tempAccommodationStartDay + 1})</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <select
                      value={tempAccommodationStartDay}
                      onChange={(e) => {
                        const newStart = parseInt(e.target.value);
                        setTempAccommodationStartDay(newStart);
                        if (newStart > tempAccommodationEndDay) {
                          setTempAccommodationEndDay(newStart);
                        }
                      }}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm appearance-none pr-8"
                      style={{ colorScheme: 'dark' }}
                    >
                      {Array.from({ length: days }).map((_, i) => (
                        <option key={i} value={i} className="bg-gray-900">
                          {startDate ? formatDate(startDate, i) : `Dag ${i + 1}`}
                        </option>
                      ))}
                    </select>
                    <ChevronRight size={16} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="flex-1 relative">
                    <select
                      value={tempAccommodationEndDay}
                      onChange={(e) => setTempAccommodationEndDay(parseInt(e.target.value))}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm appearance-none pr-8"
                      style={{ colorScheme: 'dark' }}
                  >
                    {Array.from({ length: days }).map((_, i) => (
                      <option key={i} value={i} disabled={i < tempAccommodationStartDay} className="bg-gray-900">
                        {startDate ? formatDate(startDate, i) : `Dag ${i + 1}`}
                      </option>
                    ))}
                  </select>
                  <ChevronRight size={16} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            
            {/* Linked items selector */}
            {(linkedObjects.length > 0 || linkedUrls.length > 0) && (
              <div>
                <label className="block text-xs text-gray-400 mb-2">Länka till innehåll</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-auto p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTempAccommodationObjectId(null);
                      setTempAccommodationUrlId(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors touch-manipulation ${
                      !tempAccommodationObjectId && !tempAccommodationUrlId
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    Ingen länk
                  </button>
                  {linkedObjects.map(obj => {
                    const title = getObjectTitle(obj);
                    const isSelected = tempAccommodationObjectId === obj.id;
                    return (
                      <button
                        key={obj.id}
                        type="button"
                        onClick={() => {
                          setTempAccommodationObjectId(obj.id);
                          setTempAccommodationUrlId(null);
                          if (!tempAccommodationText) {
                            setTempAccommodationText(title);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors touch-manipulation ${
                          isSelected
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <span className="truncate max-w-[150px]">{title}</span>
                      </button>
                    );
                  })}
                  {linkedUrls.map(url => {
                    const isSelected = tempAccommodationUrlId === url.id;
                    return (
                      <button
                        key={url.id}
                        type="button"
                        onClick={() => {
                          setTempAccommodationUrlId(url.id);
                          setTempAccommodationObjectId(null);
                          if (!tempAccommodationText) {
                            setTempAccommodationText(url.title);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors touch-manipulation ${
                          isSelected
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <Link2 size={12} className="text-gray-500" />
                        <span className="truncate max-w-[150px]">{url.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
              {/* Text input - only show when no linked item */}
              {!tempAccommodationObjectId && !tempAccommodationUrlId && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Namn på boende</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tempAccommodationText}
                      onChange={(e) => setTempAccommodationText(e.target.value)}
                      placeholder="T.ex. Hotel Riviera, Stugan..."
                      className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-white text-base"
                    />
                    {tempAccommodationText && (
                      <button
                        type="button"
                        onClick={() => setTempAccommodationText('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full touch-manipulation"
                      >
                        <X size={16} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              </div>
            
            {/* Fixed bottom button */}
            <div className="p-4 border-t border-white/10 flex-shrink-0 bg-gray-900">
              <button 
                onClick={saveAccommodation}
                className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 touch-manipulation"
              >
                <Check size={18} />
                Klar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
