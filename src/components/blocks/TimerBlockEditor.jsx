import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Timer, Plus } from 'lucide-react';

// Timer block editor component
function TimerBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [timers, setTimers] = useState(block.timers || []);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync timers state when block changes (e.g., after move)
  React.useEffect(() => {
    setTimers(block.timers || []);
  }, [block.id, block.timers]);

  const syncToParent = (newTimers) => {
    onUpdate(block.id, { timers: newTimers });
  };

  const addTimer = () => {
    const newTimer = { label: '', duration: 5 };
    const updated = [...timers, newTimer];
    setTimers(updated);
    syncToParent(updated);
    
    // Focus on the new timer's label input
    setTimeout(() => {
      const inputs = document.querySelectorAll('[data-timer-label]');
      const lastInput = inputs[inputs.length - 1];
      if (lastInput) lastInput.focus();
    }, 10);
  };

  const updateTimer = (timerIndex, updates) => {
    const updated = timers.map((t, i) => i === timerIndex ? { ...t, ...updates } : t);
    setTimers(updated);
  };

  const syncTimer = () => {
    syncToParent(timers);
  };

  const removeTimer = (timerIndex) => {
    const updated = timers.filter((_, i) => i !== timerIndex);
    setTimers(updated);
    syncToParent(updated);
  };

  const handleTimerKeyDown = (e, timerIndex, field) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    
    const isLastTimer = timerIndex === timers.length - 1;
    
    if (field === 'label') {
      // Go to duration field
      const durationInput = document.querySelectorAll('[data-timer-duration]')[timerIndex];
      if (durationInput) durationInput.focus();
    } else if (field === 'duration') {
      // Go to next timer or add new
      if (isLastTimer) {
        addTimer();
      } else {
        const nextLabel = document.querySelectorAll('[data-timer-label]')[timerIndex + 1];
        if (nextLabel) nextLabel.focus();
      }
    }
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
          <Timer size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            Timers
          </span>
          {timers.length > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">({timers.length} st)</span>
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
        <div className="px-3 pb-3 space-y-3">
          {/* Timers list - inline editable */}
          {timers.length > 0 && (
            <div className="space-y-2">
              {timers.map((timer, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm w-5">{i + 1}.</span>
                  <input
                    type="text"
                    data-timer-label
                    value={timer.label}
                    onChange={(e) => updateTimer(i, { label: e.target.value })}
                    onBlur={syncTimer}
                    onKeyDown={(e) => handleTimerKeyDown(e, i, 'label')}
                    placeholder="Namn"
                    disabled={saving}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    data-timer-duration
                    inputMode="decimal"
                    value={timer.duration}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      const num = parseFloat(val);
                      if (!isNaN(num) && num > 0) {
                        updateTimer(i, { duration: num });
                      } else if (val === '' || val === '0') {
                        updateTimer(i, { duration: 0 });
                      }
                    }}
                    onBlur={syncTimer}
                    onKeyDown={(e) => handleTimerKeyDown(e, i, 'duration')}
                    placeholder="Min"
                    disabled={saving}
                    className="w-16 flex-shrink-0 px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => removeTimer(i)}
                    className="w-8 h-8 flex-shrink-0 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add timer button */}
          <button
            type="button"
            onClick={addTimer}
            disabled={saving}
            className="py-1.5 px-3 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg flex items-center gap-1.5 transition-colors border border-blue-500/20"
          >
            <Plus size={14} />
            Lägg till timer
          </button>
        </div>
      )}
    </div>
  );
}

export { TimerBlockEditor };
export default TimerBlockEditor;
