import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Wallet, ChevronDown, Lock, Edit2, RotateCcw, ArrowRight } from 'lucide-react';

// Split Block - expense sharing for trips etc.
export const SplitBlock = ({ data, currentUser, shares = {}, canEdit = false, onUpdateAmount, onCloseSplit, onResetSplit, onExpand }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const [myAmount, setMyAmount] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const blockRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const savedFlashRef = useRef(null);
  
  const title = data.title || 'Splitt';
  const model = data.model || 'individual'; // 'individual' or 'family'
  const participants = data.participants || [];
  const isClosed = data.closed || false;
  const currency = data.currency || 'kr';
  
  // Easter egg: evaluate simple math expressions like "100+300+100"
  const evaluateMathExpression = (str) => {
    if (!str || typeof str !== 'string') return parseFloat(str) || 0;
    const sanitized = str.replace(/[^0-9+\-*/().\s]/g, '');
    if (!sanitized) return 0;
    try {
      const result = new Function('return ' + sanitized)();
      return typeof result === 'number' && isFinite(result) ? result : 0;
    } catch {
      return parseFloat(str) || 0;
    }
  };
  
  const currentUserEmail = currentUser?.email?.toLowerCase();
  
  // Find current user's participant data
  const myParticipant = participants.find(p => p.email?.toLowerCase() === currentUserEmail);
  const otherParticipants = participants.filter(p => p.email?.toLowerCase() !== currentUserEmail);
  
  // Calculate totals
  const totalPaid = participants.reduce((sum, p) => sum + (parseFloat(p.paid) || 0), 0);
  const totalWeight = participants.reduce((sum, p) => sum + (p.weight || 1), 0);
  
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
  
  // Sync myAmount with saved value (only when not focused)
  useEffect(() => {
    if (myParticipant && document.activeElement?.dataset?.splitInput !== 'true') {
      const savedPaid = parseFloat(myParticipant.paid) || 0;
      setMyAmount(savedPaid > 0 ? savedPaid.toString() : '');
    }
  }, [myParticipant?.paid]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
    };
  }, []);
  
  // Calculate per-participant data
  const getParticipantData = (participant) => {
    const paid = parseFloat(participant.paid) || 0;
    const share = totalWeight > 0 ? (totalPaid * (participant.weight || 1)) / totalWeight : 0;
    const balance = paid - share;
    return { paid, share, balance };
  };
  
  // Generate settlement suggestions (minimize transactions)
  const getSettlements = () => {
    if (participants.length < 2) return [];
    
    const balances = participants.map(p => ({
      ...p,
      ...getParticipantData(p)
    })).filter(p => Math.abs(p.balance) >= 0.5);
    
    const debtors = balances.filter(p => p.balance < -0.5).map(p => ({ ...p, balance: Math.abs(p.balance) }));
    const creditors = balances.filter(p => p.balance > 0.5);
    
    const settlements = [];
    
    debtors.sort((a, b) => b.balance - a.balance);
    creditors.sort((a, b) => b.balance - a.balance);
    
    for (const debtor of debtors) {
      let remaining = debtor.balance;
      for (const creditor of creditors) {
        if (remaining < 0.5 || creditor.balance < 0.5) continue;
        
        const amount = Math.min(remaining, creditor.balance);
        if (amount >= 0.5) {
          settlements.push({
            from: debtor.name || debtor.email,
            to: creditor.name || creditor.email,
            amount: Math.round(amount)
          });
          remaining -= amount;
          creditor.balance -= amount;
        }
      }
    }
    
    return settlements;
  };
  
  const doSave = useCallback((value) => {
    if (onUpdateAmount && myParticipant) {
      const evaluated = evaluateMathExpression(value);
      const currentSaved = parseFloat(myParticipant.paid) || 0;
      if (evaluated !== currentSaved) {
        onUpdateAmount(myParticipant.email, evaluated);
        setMyAmount(evaluated > 0 ? evaluated.toString() : '');
        // Show saved flash
        setShowSaved(true);
        if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
        savedFlashRef.current = setTimeout(() => setShowSaved(false), 1200);
      }
    }
  }, [onUpdateAmount, myParticipant]);

  const handleAmountChange = (value) => {
    setMyAmount(value);
    // Debounced save after 800ms
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => doSave(value), 800);
  };

  const handleAmountBlur = () => {
    // Immediate save on blur
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    doSave(myAmount);
  };
  
  const formatAmount = (amount) => {
    return Math.round(amount).toLocaleString('sv-SE');
  };

  // Get initials from name or email
  const getInitials = (participant) => {
    const name = participant.name || participant.email?.split('@')[0] || '?';
    return name.charAt(0).toUpperCase();
  };
  
  if (participants.length === 0) {
    return (
      <div className="bg-white/[0.03] rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Wallet size={18} className="text-gray-400" />
          <span className="text-sm">{title} – inga deltagare tillagda än</span>
        </div>
      </div>
    );
  }
  
  // Count how many have paid
  const paidCount = participants.filter(p => (parseFloat(p.paid) || 0) > 0).length;
  
  // Render a participant row
  const renderParticipantRow = (participant, isMe = false) => {
    const { paid, balance } = getParticipantData(participant);
    const displayName = isMe 
      ? (participant.name || 'Jag')
      : (participant.name || participant.email?.split('@')[0]);
    
    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? 'bg-white/[0.03]' : ''}`}>
        {/* Avatar */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0 ${
          isMe ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.06] text-gray-500'
        }`}>
          {getInitials(participant)}
        </div>
        
        {/* Name + paid amount */}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-300 truncate">
            {displayName}
            {model === 'family' && <span className="text-gray-600 ml-1">×{participant.weight || 1}</span>}
          </div>
          {paid > 0 && (
            <div className="text-[11px] text-gray-500 tabular-nums">
              betalade {formatAmount(paid)} {currency}
            </div>
          )}
        </div>
        
        {/* Inline input for my row */}
        {isMe && !isClosed && onUpdateAmount ? (
          <div className="relative flex-shrink-0">
            <input
              data-split-input="true"
              type="text"
              inputMode="decimal"
              value={myAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={handleAmountBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
              placeholder="0"
              className="w-20 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-blue-500/50 text-white placeholder-gray-600 text-right tabular-nums transition-colors"
            />
            {showSaved && (
              <span className="absolute -right-4 top-1/2 -translate-y-1/2 text-[10px] text-blue-400 pointer-events-none">✓</span>
            )}
          </div>
        ) : (
          /* Balance */
          <div className="flex-shrink-0 text-right">
            {Math.abs(balance) >= 0.5 ? (
              <div className={`text-xs font-medium tabular-nums ${balance > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                {balance > 0 ? '+' : ''}{formatAmount(balance)} {currency}
              </div>
            ) : (
              <div className="text-xs text-gray-600 tabular-nums">±0</div>
            )}
          </div>
        )}
      </div>
    );
  };
  
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
            <Wallet size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
              {title}
            </span>
          </div>
          {isClosed ? (
            <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-500 flex items-center gap-1.5">
              <Lock size={10} />
              Avslutad
            </span>
          ) : (
            <div className="flex items-center gap-2">
              {totalPaid > 0 && (
                <span className="text-xs text-gray-400">{formatAmount(totalPaid)} {currency}</span>
              )}
              <span className="text-xs text-gray-500 tabular-nums">{paidCount}/{participants.length}</span>
            </div>
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
        <div className="bg-white/[0.03] rounded-xl overflow-hidden">
          {/* Edit mode actions */}
          {showEditMode && canEdit && (
            <div className="flex items-center justify-end gap-3 px-4 py-2 border-b border-white/5">
              {!isClosed && onCloseSplit && totalPaid > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Vill du avsluta splitten? Inga ändringar kan göras efteråt.')) {
                      onCloseSplit();
                      setShowEditMode(false);
                    }
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                  <Lock size={11} />
                  Avsluta
                </button>
              )}
              {totalPaid > 0 && onResetSplit && (
                <button
                  onClick={() => {
                    if (window.confirm('Vill du nollställa alla belopp? Detta kan inte ångras.')) {
                      onResetSplit();
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
          
          {/* Participant rows */}
          <div className="divide-y divide-white/[0.04]">
            {myParticipant && renderParticipantRow(myParticipant, true)}
            {otherParticipants.map((participant, idx) => (
              <React.Fragment key={idx}>
                {renderParticipantRow(participant, false)}
              </React.Fragment>
            ))}
          </div>
          
          {/* Total summary */}
          {totalPaid > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-white/[0.02]">
              <span className="text-[11px] text-gray-500 uppercase tracking-wider">Totalt</span>
              <span className="text-xs text-gray-300 font-medium tabular-nums">{formatAmount(totalPaid)} {currency}</span>
            </div>
          )}
      
          {/* Settlement suggestions (when closed) */}
          {isClosed && totalPaid > 0 && getSettlements().length > 0 && (
            <div className="border-t border-white/5">
              <div className="px-4 py-2 text-[11px] text-gray-500 uppercase tracking-wider">Gör upp</div>
              {getSettlements().map((s, idx) => (
                <div key={idx} className="flex items-center gap-2.5 px-4 py-2.5 border-t border-white/[0.03]">
                  <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-gray-500 font-medium flex-shrink-0">
                    {s.from.charAt(0).toUpperCase()}
                  </div>
                  <ArrowRight size={12} className="text-gray-600 flex-shrink-0" />
                  <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-gray-500 font-medium flex-shrink-0">
                    {s.to.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-400 flex-1 min-w-0 truncate">
                    {s.from} → {s.to}
                  </span>
                  <span className="text-xs text-white font-medium tabular-nums flex-shrink-0">{formatAmount(s.amount)} {currency}</span>
                </div>
              ))}
            </div>
          )}
          {isClosed && totalPaid > 0 && getSettlements().length === 0 && (
            <div className="px-4 py-3 border-t border-white/5 text-xs text-gray-500 text-center">Alla är kvitt! ✓</div>
          )}
        </div>
      )}
    </div>
  );
};
