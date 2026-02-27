import React, { useState, useRef, useEffect } from 'react';
import { Timer, Play, Pause, RotateCw, Check } from 'lucide-react';

// Timer Block - multiple countdown timers for recipes etc.
export const TimerBlock = ({ data }) => {
  const timers = data.timers || [];
  const [timerStates, setTimerStates] = useState(() => 
    timers.map(t => ({ 
      remaining: t.duration * 60, // Convert minutes to seconds
      isRunning: false,
      isFinished: false
    }))
  );
  const [expandedIndex, setExpandedIndex] = useState(null);
  const intervalRefs = useRef([]);
  const audioContextRef = useRef(null);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      intervalRefs.current.forEach(id => clearInterval(id));
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Initialize audio context on first user interaction (required for iOS)
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (iOS requirement)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Play alarm sound - iOS compatible
  const playAlarm = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      // Resume if needed
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const playBeep = (delay = 0) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = 880; // Higher pitch, more audible
        oscillator.type = 'sine';
        
        const startTime = ctx.currentTime + delay;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.25);
      };
      
      // Play 3 distinct beeps
      playBeep(0);
      playBeep(0.35);
      playBeep(0.7);
    } catch {
      // Audio not supported – silent fallback
    }
  };

  const startTimer = (index) => {
    // Initialize audio on user interaction
    initAudio();
    
    if (timerStates[index].isRunning || timerStates[index].remaining <= 0) return;
    
    // Auto-expand when starting
    setExpandedIndex(index);
    
    setTimerStates(prev => prev.map((s, i) => 
      i === index ? { ...s, isRunning: true, isFinished: false } : s
    ));

    intervalRefs.current[index] = setInterval(() => {
      setTimerStates(prev => {
        const newStates = [...prev];
        if (newStates[index].remaining <= 1) {
          clearInterval(intervalRefs.current[index]);
          newStates[index] = { ...newStates[index], remaining: 0, isRunning: false, isFinished: true };
          playAlarm();
          // Vibrate if supported
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        } else {
          newStates[index] = { ...newStates[index], remaining: newStates[index].remaining - 1 };
        }
        return newStates;
      });
    }, 1000);
  };

  const pauseTimer = (index) => {
    clearInterval(intervalRefs.current[index]);
    setTimerStates(prev => prev.map((s, i) => 
      i === index ? { ...s, isRunning: false } : s
    ));
  };

  const resetTimer = (index) => {
    clearInterval(intervalRefs.current[index]);
    setTimerStates(prev => prev.map((s, i) => 
      i === index ? { remaining: timers[i].duration * 60, isRunning: false, isFinished: false } : s
    ));
  };

  const dismissFinished = (index) => {
    resetTimer(index);
    setExpandedIndex(null);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes) => {
    if (minutes % 1 === 0) return `${minutes} min`;
    return `${minutes.toFixed(1)} min`;
  };

  if (timers.length === 0) {
    return <div className="text-sm text-gray-500">Inga timers</div>;
  }

  return (
    <div className="space-y-2">
      {timers.map((timer, index) => {
        const state = timerStates[index] || { remaining: timer.duration * 60, isRunning: false, isFinished: false };
        const progress = state.remaining / (timer.duration * 60);
        const isActive = state.isRunning || state.isFinished;
        const isExpanded = expandedIndex === index || isActive;
        
        // Compact view for inactive timers
        if (!isExpanded) {
          return (
            <button
              key={index}
              onClick={() => setExpandedIndex(index)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-all text-left group"
            >
              <Timer size={16} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-200 truncate flex-1">{timer.label || 'Timer'}</span>
              <span className="text-sm text-gray-500 tabular-nums">({formatTime(state.remaining)})</span>
            </button>
          );
        }
        
        // Expanded view for active or selected timers - compact single row
        return (
          <div 
            key={index}
            onClick={(e) => {
              // Close if clicking outside buttons and not active
              if (!isActive && !e.target.closest('button')) {
                setExpandedIndex(null);
              }
            }}
            className={`px-3 py-2.5 rounded-xl border transition-all ${
              state.isFinished 
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                : state.isRunning 
                  ? 'bg-amber-500/10 border-amber-500/30' 
                  : 'bg-white/5 border-white/10'
            }`}
          >
            {/* Header row with name */}
            <div className="flex items-center gap-2 mb-2">
              <Timer size={14} className={state.isFinished ? 'text-green-400' : state.isRunning ? 'text-amber-400' : 'text-gray-400'} />
              <span className="text-sm font-medium text-white truncate flex-1">{timer.label || 'Timer'}</span>
              <span className="text-xs text-gray-500">({formatDuration(timer.duration)})</span>
            </div>
            
            {/* Compact control row: progress bar, time, buttons */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${state.isFinished ? 'bg-gradient-to-r from-green-500 to-emerald-400' : state.isRunning ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-blue-500'}`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              
              <span className={`text-base font-mono font-bold tabular-nums min-w-[3.5rem] text-right ${
                state.isFinished ? 'text-green-400' : state.isRunning ? 'text-amber-400' : 'text-white'
              }`}>
                {state.isFinished ? 'Klar!' : formatTime(state.remaining)}
              </span>
              
              {/* Control buttons inline */}
              {state.isFinished ? (
                <button
                  onClick={() => dismissFinished(index)}
                  className="w-9 h-9 rounded-lg bg-green-500/30 text-green-300 hover:bg-green-500/40 transition-colors flex items-center justify-center"
                  title="Stäng"
                >
                  <Check size={18} />
                </button>
              ) : (
                <>
                  {!state.isRunning ? (
                    <button
                      onClick={() => startTimer(index)}
                      className="w-9 h-9 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors flex items-center justify-center"
                      title="Starta"
                    >
                      <Play size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => pauseTimer(index)}
                      className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors flex items-center justify-center"
                      title="Pausa"
                    >
                      <Pause size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => resetTimer(index)}
                    className="w-9 h-9 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center"
                    title="Återställ"
                  >
                    <RotateCw size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
