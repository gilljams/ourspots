import React, { useState, useRef, useEffect } from 'react';
import { Wallet, ChevronDown, Lock, Edit2, RotateCcw } from 'lucide-react';

// Split Block - expense sharing for trips etc.
export const SplitBlock = ({ data, currentUser, shares = {}, canEdit = false, onUpdateAmount, onCloseSplit, onResetSplit, onExpand }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const [myAmount, setMyAmount] = useState('');
  const [hasEdited, setHasEdited] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const blockRef = useRef(null);
  
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
  
  // Sync myAmount with saved value (but only if user hasn't edited)
  useEffect(() => {
    if (!hasEdited && myParticipant) {
      const savedPaid = parseFloat(myParticipant.paid) || 0;
      setMyAmount(savedPaid > 0 ? savedPaid.toString() : '');
    }
  }, [myParticipant?.paid, hasEdited]);
  
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
  
  const handleSaveMyAmount = () => {
    if (onUpdateAmount && myParticipant) {
      const evaluated = evaluateMathExpression(myAmount);
      onUpdateAmount(myParticipant.email, evaluated);
      setMyAmount(evaluated > 0 ? evaluated.toString() : '');
      setHasEdited(false);
    }
  };
  
  const formatAmount = (amount) => {
    return Math.round(amount).toLocaleString('sv-SE');
  };
  
  // Check if my amount has changed from saved
  const myPaid = myParticipant ? (parseFloat(myParticipant.paid) || 0) : 0;
  const myAmountNum = parseFloat(myAmount) || 0;
  const hasUnsavedChanges = myParticipant && myAmountNum !== myPaid;
  
  if (participants.length === 0) {
    return (
      <div className="bg-white/[0.03] rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Wallet size={18} className="text-green-400" />
          <span className="text-sm">{title} – inga deltagare tillagda än</span>
        </div>
      </div>
    );
  }
  
  // Count how many have paid
  const paidCount = participants.filter(p => (parseFloat(p.paid) || 0) > 0).length;
  
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
              showEditMode ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            title="Redigera"
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>
      
      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="bg-white/[0.03] rounded-xl p-4 space-y-4">
          {/* Edit mode panel */}
          {showEditMode && canEdit && (
            <div className="flex gap-2 p-2 bg-white/5 rounded-lg border border-white/10 -mt-2">
              {!isClosed && onCloseSplit && totalPaid > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Vill du avsluta splitten? Inga ändringar kan göras efteråt.')) {
                      onCloseSplit();
                      setShowEditMode(false);
                    }
                  }}
                  className="flex-1 py-1.5 text-xs text-amber-400 hover:bg-amber-500/20 rounded flex items-center justify-center gap-1"
                >
                  <Lock size={12} />
                  Avsluta & visa swish
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
                  className="flex-1 py-1.5 text-xs text-red-400 hover:bg-red-500/20 rounded flex items-center justify-center gap-1"
                >
                  <RotateCcw size={12} />
                  Nollställ
                </button>
              )}
            </div>
          )}
          
          {/* My input section */}
          {myParticipant && !isClosed && onUpdateAmount && (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-400">Jag har lagt ut:</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={myAmount}
                  onChange={(e) => { setMyAmount(e.target.value); setHasEdited(true); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMyAmount(); }}
                  placeholder="0"
                  className="flex-1 px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-green-500 text-white placeholder-gray-600 text-right"
                />
                <button
                  onClick={handleSaveMyAmount}
                  disabled={!hasUnsavedChanges}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    hasUnsavedChanges 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Spara
                </button>
              </div>
            </div>
          )}
          
          {/* Participants table */}
          <div>
            {/* Column headers */}
            <div className="flex items-center justify-between px-2 pb-1 mb-1 border-b border-white/5">
              <span className="text-xs text-gray-500">Deltagare</span>
              <div className="flex items-center gap-2">
                <span className="w-16 text-right text-xs text-gray-500">Utlägg</span>
                <span className="w-16 text-right text-xs text-gray-500">Saldo</span>
              </div>
            </div>
            
            {/* All participants list */}
            <div className="space-y-0.5">
              {/* My row first */}
              {myParticipant && (() => {
                const { paid, balance } = getParticipantData(myParticipant);
                return (
                  <div className="flex items-center justify-between py-1 px-2 text-sm">
                    <span className="text-gray-300 truncate">
                      {myParticipant.name || 'Jag'}
                      {model === 'family' && <span className="text-gray-600 ml-1">×{myParticipant.weight || 1}</span>}
                    </span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className={`w-16 text-right ${paid > 0 ? 'text-gray-400' : 'text-gray-600'}`}>
                        {paid > 0 ? formatAmount(paid) : '–'}
                      </span>
                      <span className={`w-16 text-right ${balance > 0.5 ? 'text-green-400' : balance < -0.5 ? 'text-red-400' : 'text-gray-600'}`}>
                        {balance > 0.5 ? '+' : ''}{formatAmount(balance)}
                      </span>
                    </div>
                  </div>
                );
              })()}
              {/* Other participants */}
              {otherParticipants.map((participant, idx) => {
                const { paid, balance } = getParticipantData(participant);
                return (
                  <div 
                    key={idx}
                    className="flex items-center justify-between py-1 px-2 text-sm"
                  >
                    <span className="text-gray-400 truncate">
                      {participant.name || participant.email?.split('@')[0]}
                      {model === 'family' && <span className="text-gray-600 ml-1">×{participant.weight || 1}</span>}
                    </span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className={`w-16 text-right ${paid > 0 ? 'text-gray-400' : 'text-gray-600'}`}>
                        {paid > 0 ? formatAmount(paid) : '–'}
                      </span>
                      <span className={`w-16 text-right ${balance > 0.5 ? 'text-green-400' : balance < -0.5 ? 'text-red-400' : 'text-gray-600'}`}>
                        {balance > 0.5 ? '+' : ''}{formatAmount(balance)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Total row */}
            {totalPaid > 0 && (
              <div className="flex items-center justify-between py-1 px-2 text-sm mt-1 pt-1 border-t border-white/10">
                <span className="text-gray-500">Totalt</span>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="w-16 text-right text-gray-300">{formatAmount(totalPaid)}</span>
                  <span className="w-16"></span>
                </div>
              </div>
            )}
          </div>
      
          {/* Settlement suggestions (when closed or has amounts) */}
          {isClosed && totalPaid > 0 && (
            <div className="pt-3 border-t border-white/10">
              {getSettlements().length > 0 ? (
                <div className="space-y-1.5">
                  {getSettlements().map((s, idx) => (
                    <div key={idx} className="text-sm text-gray-400">
                      <span className="text-gray-300">{s.from}</span>
                      {' swishar '}
                      <span className="text-gray-300">{s.to}</span>
                      {' '}
                      <span className="text-white font-medium tabular-nums">{formatAmount(s.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Alla är kvitt!</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
