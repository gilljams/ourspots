import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Check, Trash2, GripVertical, Heading, ClipboardPaste } from 'lucide-react';

// Simple list editor modal - optimized for mobile with single-column lists
export function ListEditorModal({ rows: initialRows, title, onSave, onCancel }) {
  const [rows, setRows] = useState(() => 
    (initialRows || []).map((row, i) => ({ 
      ...row, 
      id: row.id || `row-${i}-${Date.now()}` 
    }))
  );
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [viewportOffset, setViewportOffset] = useState(0);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const scrollYRef = useRef(0);
  const listRef = useRef(null);
  const inputRefs = useRef({});
  const lastAddedRef = useRef(null);
  
  const HEADER_HEIGHT = 52;
  
  // Handle viewport changes (keyboard open/close)
  useEffect(() => {
    const viewport = window.visualViewport;
    
    const updateLayout = () => {
      if (viewport) {
        setViewportHeight(viewport.height);
        setViewportOffset(viewport.offsetTop);
      } else {
        setViewportHeight(window.innerHeight);
        setViewportOffset(0);
      }
    };
    
    if (viewport) {
      viewport.addEventListener('resize', updateLayout);
      viewport.addEventListener('scroll', updateLayout);
    }
    window.addEventListener('resize', updateLayout);
    
    updateLayout();
    
    // Lock body scroll
    scrollYRef.current = window.scrollY;
    const scrollY = scrollYRef.current;
    
    document.documentElement.style.backgroundColor = '#1e293b';
    document.body.style.backgroundColor = '#1e293b';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollYRef.current);
      
      if (viewport) {
        viewport.removeEventListener('resize', updateLayout);
        viewport.removeEventListener('scroll', updateLayout);
      }
      window.removeEventListener('resize', updateLayout);
    };
  }, []);
  
  // Focus newly added row
  useEffect(() => {
    if (lastAddedRef.current && inputRefs.current[lastAddedRef.current]) {
      inputRefs.current[lastAddedRef.current].focus();
      lastAddedRef.current = null;
    }
  }, [rows]);
  
  const addRow = (isHeader = false) => {
    const newRow = { 
      id: `row-${Date.now()}`,
      item: '',
      ...(isHeader ? { isHeader: true } : { done: false })
    };
    setRows([...rows, newRow]);
    lastAddedRef.current = newRow.id;
    
    // Scroll to bottom
    setTimeout(() => {
      listRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
    }, 50);
  };
  
  const addRowAfter = (afterId) => {
    const idx = rows.findIndex(r => r.id === afterId);
    const newRow = { 
      id: `row-${Date.now()}`,
      item: '',
      done: false
    };
    const newRows = [...rows];
    newRows.splice(idx + 1, 0, newRow);
    setRows(newRows);
    lastAddedRef.current = newRow.id;
  };
  
  const removeRow = (rowId) => {
    setRows(rows.filter(r => r.id !== rowId));
  };
  
  const updateRow = (rowId, text) => {
    setRows(rows.map(r => 
      r.id === rowId ? { ...r, item: text } : r
    ));
  };
  
  const handleKeyDown = (e, rowId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRowAfter(rowId);
    } else if (e.key === 'Backspace' && e.target.value === '') {
      e.preventDefault();
      const idx = rows.findIndex(r => r.id === rowId);
      if (idx > 0) {
        // Focus previous row
        const prevRow = rows[idx - 1];
        if (inputRefs.current[prevRow.id]) {
          inputRefs.current[prevRow.id].focus();
        }
      }
      removeRow(rowId);
    }
  };
  
  // Drag and drop handlers
  const handleDragStart = (e, rowId) => {
    setDraggedId(rowId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowId);
  };
  
  const handleDragOver = (e, rowId) => {
    e.preventDefault();
    if (rowId !== draggedId) {
      setDragOverId(rowId);
    }
  };
  
  const handleDragLeave = () => {
    setDragOverId(null);
  };
  
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    
    const draggedIdx = rows.findIndex(r => r.id === draggedId);
    const targetIdx = rows.findIndex(r => r.id === targetId);
    
    const newRows = [...rows];
    const [removed] = newRows.splice(draggedIdx, 1);
    newRows.splice(targetIdx, 0, removed);
    
    setRows(newRows);
    setDraggedId(null);
    setDragOverId(null);
  };
  
  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };
  
  // Touch-based reordering
  const [touchDragId, setTouchDragId] = useState(null);
  const [touchY, setTouchY] = useState(0);
  const touchStartY = useRef(0);
  const touchRowRef = useRef(null);
  
  const handleTouchStart = (e, rowId) => {
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchRowRef.current = rowId;
  };
  
  const handleTouchMove = useCallback((e) => {
    if (!touchRowRef.current) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY.current;
    
    if (Math.abs(deltaY) > 10 && !touchDragId) {
      setTouchDragId(touchRowRef.current);
    }
    
    if (touchDragId) {
      setTouchY(deltaY);
      
      // Find which row we're over
      const elements = listRef.current?.querySelectorAll('[data-row-id]');
      elements?.forEach(el => {
        const rect = el.getBoundingClientRect();
        const rowId = el.dataset.rowId;
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom && rowId !== touchDragId) {
          setDragOverId(rowId);
        }
      });
    }
  }, [touchDragId]);
  
  const handleTouchEnd = useCallback(() => {
    if (touchDragId && dragOverId) {
      const draggedIdx = rows.findIndex(r => r.id === touchDragId);
      const targetIdx = rows.findIndex(r => r.id === dragOverId);
      
      const newRows = [...rows];
      const [removed] = newRows.splice(draggedIdx, 1);
      newRows.splice(targetIdx, 0, removed);
      
      setRows(newRows);
    }
    
    setTouchDragId(null);
    setTouchY(0);
    setDragOverId(null);
    touchRowRef.current = null;
  }, [touchDragId, dragOverId, rows]);
  
  useEffect(() => {
    if (touchDragId) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [touchDragId, handleTouchMove, handleTouchEnd]);
  
  const handleSave = () => {
    const cleanRows = rows.map(({ id, ...rest }) => rest);
    onSave(cleanRows);
  };
  
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      
      // Split by newlines and filter empty lines
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      // Create new rows for each line
      const newRows = lines.map(line => ({
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        item: line.trim(),
        done: false
      }));
      
      setRows([...rows, ...newRows]);
      
      // Scroll to bottom
      setTimeout(() => {
        listRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
      }, 50);
    } catch (err) {
      // Fallback: prompt user to paste
      const text = prompt('Klistra in text här (en rad per punkt):');
      if (text && text.trim()) {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        const newRows = lines.map(line => ({
          id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          item: line.trim(),
          done: false
        }));
        setRows([...rows, ...newRows]);
      }
    }
  };
  
  const contentHeight = viewportHeight - HEADER_HEIGHT;
  
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1999] bg-slate-800" />
      
      {/* Main modal */}
      <div
        className="fixed left-0 right-0 z-[2000] bg-slate-800 flex flex-col"
        style={{
          top: `${viewportOffset}px`,
          height: `${viewportHeight}px`
        }}
      >
        {/* Header */}
        <div 
          className="flex-shrink-0 flex items-center justify-between px-3 border-b border-white/5 bg-slate-900/50"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-base font-medium text-white truncate">
              {title || 'Redigera lista'}
            </span>
            <span className="text-xs text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded-full">
              {rows.filter(r => !r.isHeader).length}
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Add header row button */}
            <button
              type="button"
              onClick={() => addRow(true)}
              className="h-9 px-3 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-white flex items-center gap-1.5 transition-colors text-sm"
            >
              <Plus size={14} />
              Rubrik
            </button>
            
            {/* Paste button */}
            <button
              type="button"
              onClick={handlePaste}
              className="h-9 w-9 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-white flex items-center justify-center transition-colors"
              title="Klistra in från urklipp"
            >
              <ClipboardPaste size={16} />
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Scrollable list */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto"
          style={{ height: `${contentHeight}px`, paddingBottom: '100px' }}
        >
          {rows.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                <Plus size={24} className="text-slate-500" />
              </div>
              <p className="font-medium">Listan är tom</p>
              <p className="text-sm mt-1 text-slate-600">Börja skriva nedan</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {rows.map((row) => (
                <div
                  key={row.id}
                  data-row-id={row.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, row.id)}
                  onDragOver={(e) => handleDragOver(e, row.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, row.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 transition-all ${
                    draggedId === row.id ? 'opacity-50' : ''
                  } ${
                    dragOverId === row.id ? 'bg-blue-500/10 border-t-2 border-blue-500' : ''
                  } ${
                    touchDragId === row.id ? 'opacity-50 scale-105' : ''
                  }`}
                  style={touchDragId === row.id ? { transform: `translateY(${touchY}px)` } : {}}
                >
                  {row.isHeader ? (
                    // Header row
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-blue-500/5">
                      <div
                        className="text-slate-500 cursor-grab active:cursor-grabbing touch-none"
                        onTouchStart={(e) => handleTouchStart(e, row.id)}
                      >
                        <GripVertical size={16} />
                      </div>
                      <input
                        ref={el => inputRefs.current[row.id] = el}
                        type="text"
                        value={row.item || ''}
                        onChange={(e) => updateRow(row.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, row.id)}
                        placeholder="Rubrik..."
                        className="flex-1 bg-transparent text-blue-400 text-sm font-semibold uppercase tracking-wide placeholder-slate-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    // Regular row
                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5">
                      <div
                        className="text-slate-600 cursor-grab active:cursor-grabbing touch-none"
                        onTouchStart={(e) => handleTouchStart(e, row.id)}
                      >
                        <GripVertical size={16} />
                      </div>
                      <input
                        ref={el => inputRefs.current[row.id] = el}
                        type="text"
                        value={row.item || ''}
                        onChange={(e) => updateRow(row.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, row.id)}
                        placeholder="Skriv här..."
                        className="flex-1 bg-transparent text-white text-sm placeholder-slate-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Add row input at bottom */}
          <div className="px-3 py-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => addRow(false)}
              className="w-full h-11 rounded-xl border border-dashed border-slate-600 text-slate-500 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 flex items-center justify-center gap-2 transition-all text-sm"
            >
              <Plus size={16} />
              Lägg till rad
            </button>
          </div>
        </div>
        
        {/* Floating save button */}
        <button
          type="button"
          onClick={handleSave}
          className="fixed z-[2001] right-4 w-14 h-14 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center"
          style={{
            bottom: `${Math.max(16, viewportHeight - window.innerHeight + 16)}px`
          }}
        >
          <Check size={24} strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
}

export default ListEditorModal;
