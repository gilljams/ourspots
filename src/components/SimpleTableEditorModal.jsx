import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Check, Trash2, GripVertical, ClipboardPaste, Phone, Link, Hash, Type, MoreVertical, CheckSquare, Square, RotateCcw, ListX, ArrowDownUp, Undo2, CheckCheck } from 'lucide-react';
import { useFullscreenModal } from '../utils/useFullscreenModal';
import { useDragReorder } from '../utils/useDragReorder';

// Column type labels
const COL2_TYPE_LABELS = {
  text: { label: 'Text', icon: Type },
  tel: { label: 'Tel', icon: Phone },
  url: { label: 'Länk', icon: Link },
  number: { label: 'Num', icon: Hash }
};

// Simple table editor modal - 2 columns + checkbox, mobile optimized
export function SimpleTableEditorModal({ 
  rows: initialRows, 
  title, 
  col2Type: initialCol2Type = 'text',
  col1Label = 'Text',
  col2Label = 'Värde',
  onSave, 
  onCancel 
}) {
  const [rows, setRows] = useState(() => 
    (initialRows || []).map((row, i) => ({ 
      ...row, 
      id: row.id || `row-${i}-${Date.now()}` 
    }))
  );
  const col2Type = initialCol2Type;
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showUtilsMenu, setShowUtilsMenu] = useState(false);
  const [deletedRow, setDeletedRow] = useState(null);
  const undoTimerRef = useRef(null);
  const listRef = useRef(null);
  const inputRefs = useRef({});
  const lastAddedRef = useRef(null);
  const focusTargetRef = useRef(null);
  
  const HEADER_HEIGHT = 52;
  
  const { viewportHeight, viewportOffset } = useFullscreenModal({
    bgColor: '#111827',
    headerHeight: HEADER_HEIGHT,
    onCleanup: () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); },
  });

  const {
    draggedId, dragOverId, touchDragId, touchY,
    handleDragStart, handleDragOver, handleDragLeave,
    handleDrop, handleDragEnd, handleTouchStart,
  } = useDragReorder({ rows, setRows, selectMode, selectedIds, listRef });
  
  // Focus newly added row and scroll it into view
  useEffect(() => {
    if (lastAddedRef.current) {
      const input = inputRefs.current[`${lastAddedRef.current}-col1`];
      if (input) {
        input.focus();
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      lastAddedRef.current = null;
    }
  }, [rows]);
  
  // Handle focus target after state update
  useEffect(() => {
    if (focusTargetRef.current) {
      const input = inputRefs.current[focusTargetRef.current];
      if (input) {
        input.focus();
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      focusTargetRef.current = null;
    }
  }, [rows]);
  
  const addRow = (isHeader = false) => {
    const newRow = { 
      id: `row-${Date.now()}`,
      col1: '',
      col2: '',
      ...(isHeader ? { isHeader: true } : { done: false })
    };
    setRows([...rows, newRow]);
    lastAddedRef.current = newRow.id;
  };
  
  const addRowAfter = (afterId) => {
    const idx = rows.findIndex(r => r.id === afterId);
    const newRow = { 
      id: `row-${Date.now()}`,
      col1: '',
      col2: '',
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
  
  const updateRow = (rowId, field, value) => {
    setRows(rows.map(r => 
      r.id === rowId ? { ...r, [field]: value } : r
    ));
  };
  
  const handleKeyDown = (e, rowId, column) => {
    const currentRow = rows.find(r => r.id === rowId);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      // If on header row, Enter creates a new normal row below
      if (currentRow?.isHeader) {
        addRowAfter(rowId);
      } else if (column === 'col1') {
        // Move to col2 on same row
        focusTargetRef.current = `${rowId}-col2`;
        // Trigger re-render to apply focus
        setRows(r => [...r]);
      } else {
        // In col2, add new row
        addRowAfter(rowId);
      }
    } else if (e.key === 'Backspace' && e.target.value === '') {
      e.preventDefault();
      const idx = rows.findIndex(r => r.id === rowId);
      
      if (column === 'col2') {
        // Move back to col1
        focusTargetRef.current = `${rowId}-col1`;
        setRows(r => [...r]);
      } else if (idx > 0) {
        // Focus previous row's col2
        const prevRow = rows[idx - 1];
        focusTargetRef.current = `${prevRow.id}-col2`;
        removeRow(rowId);
      } else {
        // First row, just remove if empty
        if (!rows[idx].col1 && !rows[idx].col2) {
          removeRow(rowId);
        }
      }
    } else if (e.key === 'Tab' && !e.shiftKey && column === 'col1') {
      e.preventDefault();
      focusTargetRef.current = `${rowId}-col2`;
      setRows(r => [...r]);
    } else if (e.key === 'Tab' && e.shiftKey && column === 'col2') {
      e.preventDefault();
      focusTargetRef.current = `${rowId}-col1`;
      setRows(r => [...r]);
    }
  };
  
  const toggleSelection = (rowId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };
  
  const handleSave = () => {
    const cleanRows = rows.map(({ id, ...rest }) => rest);
    onSave(cleanRows, col2Type);
  };
  
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      
      // Split by newlines and filter empty lines
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      // Try to detect tab-separated values
      const newRows = lines.map(line => {
        const parts = line.split('\t');
        return {
          id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          col1: (parts[0] || '').trim(),
          col2: (parts[1] || '').trim(),
          done: false
        };
      });
      
      setRows([...rows, ...newRows]);
      
      setTimeout(() => {
        listRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
      }, 50);
    } catch (err) {
      const text = prompt('Klistra in text här (en rad per punkt, tab-separerat för två kolumner):');
      if (text && text.trim()) {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        const newRows = lines.map(line => {
          const parts = line.split('\t');
          return {
            id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            col1: (parts[0] || '').trim(),
            col2: (parts[1] || '').trim(),
            done: false
          };
        });
        setRows([...rows, ...newRows]);
      }
    }
  };
  
  const getInputType = () => {
    switch (col2Type) {
      case 'tel': return 'tel';
      case 'number': return 'number';
      case 'url': return 'url';
      default: return 'text';
    }
  };
  
  const contentHeight = viewportHeight - HEADER_HEIGHT;
  
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1999] bg-gray-900" />
      
      {/* Main modal */}
      <div
        className="fixed left-0 right-0 z-[2000] bg-gray-900 flex flex-col"
        style={{
          top: `${viewportOffset}px`,
          height: `${viewportHeight}px`
        }}
      >
        {/* Header */}
        <div 
          className="flex-shrink-0 flex items-center justify-between px-3 border-b border-white/5 bg-gray-950/50"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-base font-medium text-white truncate">
              {title || 'Redigera tabell'}
            </span>
            <span className="text-xs text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded-full">
              {rows.filter(r => !r.isHeader).length}
            </span>
            {/* Show col2 type indicator */}
            {col2Type && COL2_TYPE_LABELS[col2Type] && (() => {
              const TypeIcon = COL2_TYPE_LABELS[col2Type].icon;
              return (
                <span className="text-xs text-gray-500 bg-gray-700/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <TypeIcon size={10} />
                  <span className="hidden sm:inline">{COL2_TYPE_LABELS[col2Type].label}</span>
                </span>
              );
            })()}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Add header row button */}
            <button
              type="button"
              onClick={() => addRow(true)}
              className="h-9 px-3 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white flex items-center gap-1.5 transition-colors text-sm"
            >
              <Plus size={14} />
              Rubrik
            </button>
            
            {/* Utils dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUtilsMenu(!showUtilsMenu)}
                className={`h-9 w-9 rounded-lg ${selectMode ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white'} flex items-center justify-center transition-colors`}
                title="Verktyg"
              >
                <MoreVertical size={16} />
              </button>
              
              {showUtilsMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-[2001]" 
                    onClick={() => setShowUtilsMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-gray-700 rounded-lg shadow-xl border border-white/10 py-1 z-[2002]">
                    <button
                      type="button"
                      onClick={() => {
                        handlePaste();
                        setShowUtilsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-600/50 flex items-center gap-2"
                    >
                      <ClipboardPaste size={14} />
                      Klistra in
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectMode(!selectMode);
                        if (selectMode) {
                          setSelectedIds(new Set());
                        }
                        setShowUtilsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-600/50 flex items-center gap-2"
                    >
                      <CheckSquare size={14} />
                      {selectMode ? 'Avsluta val' : 'Välj flera'}
                    </button>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setRows(rows.map(r => r.isHeader ? r : { ...r, done: true }));
                        setShowUtilsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-600/50 flex items-center gap-2"
                    >
                      <CheckCheck size={14} />
                      Bocka i alla
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Vill du rensa alla ibockningar?')) {
                          setRows(rows.map(r => r.isHeader ? r : { ...r, done: false }));
                        }
                        setShowUtilsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-600/50 flex items-center gap-2"
                    >
                      <RotateCcw size={14} />
                      Rensa ibockningar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const result = [];
                        let currentSection = [];
                        const flushSection = () => {
                          if (currentSection.length === 0) return;
                          const unchecked = currentSection.filter(r => !r.done);
                          const checked = currentSection.filter(r => r.done);
                          result.push(...unchecked, ...checked);
                          currentSection = [];
                        };
                        rows.forEach(r => {
                          if (r.isHeader) { flushSection(); result.push(r); }
                          else { currentSection.push(r); }
                        });
                        flushSection();
                        setRows(result);
                        setShowUtilsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-600/50 flex items-center gap-2"
                    >
                      <ArrowDownUp size={14} />
                      Sortera klara sist
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const checkedCount = rows.filter(r => !r.isHeader && r.done).length;
                        if (checkedCount === 0) { setShowUtilsMenu(false); return; }
                        if (window.confirm(`Ta bort ${checkedCount} ibockade rad${checkedCount > 1 ? 'er' : ''}?`)) {
                          setRows(rows.filter(r => r.isHeader || !r.done));
                        }
                        setShowUtilsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-orange-400 hover:bg-orange-500/10 flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      Ta bort ibockade
                    </button>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Vill du ta bort alla rader från tabellen?')) {
                          setRows([]);
                        }
                        setShowUtilsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <ListX size={14} />
                      Rensa tabellen
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <button
              type="button"
              onClick={onCancel}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
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
            <div className="text-center py-16 text-gray-500">
              <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center mx-auto mb-3">
                <Plus size={24} className="text-gray-500" />
              </div>
              <p className="font-medium">Tabellen är tom</p>
              <p className="text-sm mt-1 text-gray-600">Börja skriva nedan</p>
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
                  } ${
                    selectMode && selectedIds.has(row.id) ? 'bg-blue-500/20' : ''
                  }`}
                  style={touchDragId === row.id ? { transform: `translateY(${touchY}px)` } : {}}
                >
                  {row.isHeader ? (
                    // Header row
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-blue-500/5">
                      {selectMode && (
                        <button
                          type="button"
                          onClick={() => toggleSelection(row.id)}
                          className="text-gray-400 hover:text-blue-400 transition-colors"
                        >
                          {selectedIds.has(row.id) ? (
                            <CheckSquare size={18} className="text-blue-400" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      )}
                      <div
                        className="text-gray-500 cursor-grab active:cursor-grabbing touch-none"
                        onTouchStart={(e) => handleTouchStart(e, row.id)}
                      >
                        <GripVertical size={16} />
                      </div>
                      <input
                        ref={el => inputRefs.current[`${row.id}-col1`] = el}
                        type="text"
                        value={row.col1 || ''}
                        onChange={(e) => updateRow(row.id, 'col1', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, row.id, 'col1')}
                        placeholder="Rubrik..."
                        className="flex-1 bg-transparent text-blue-400 text-base font-semibold uppercase tracking-wide placeholder-gray-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    // Regular row with 2 columns
                    <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 ${row.done ? 'bg-white/[0.02]' : ''}`}>
                      {selectMode && (
                        <button
                          type="button"
                          onClick={() => toggleSelection(row.id)}
                          className="text-gray-400 hover:text-blue-400 transition-colors"
                        >
                          {selectedIds.has(row.id) ? (
                            <CheckSquare size={18} className="text-blue-400" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      )}
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${row.done ? 'bg-emerald-500/20' : ''}`}>
                        {row.done && <Check size={10} className="text-emerald-400" />}
                      </div>
                      <div
                        className="text-gray-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
                        onTouchStart={(e) => handleTouchStart(e, row.id)}
                      >
                        <GripVertical size={16} />
                      </div>
                      
                      {/* Column 1 - main text */}
                      <input
                        ref={el => inputRefs.current[`${row.id}-col1`] = el}
                        type="text"
                        value={row.col1 || ''}
                        onChange={(e) => updateRow(row.id, 'col1', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, row.id, 'col1')}
                        placeholder={col1Label}
                        className={`flex-1 bg-transparent text-base placeholder-gray-600 focus:outline-none min-w-0 ${row.done ? 'text-gray-500' : 'text-white'}`}
                      />
                      
                      {/* Column 2 - typed input */}
                      <input
                        ref={el => inputRefs.current[`${row.id}-col2`] = el}
                        type={getInputType()}
                        inputMode={col2Type === 'tel' ? 'tel' : col2Type === 'number' ? 'numeric' : 'text'}
                        value={row.col2 || ''}
                        onChange={(e) => updateRow(row.id, 'col2', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, row.id, 'col2')}
                        placeholder={col2Label}
                        className="w-28 flex-shrink-0 bg-gray-700/30 rounded px-2 py-1 text-gray-300 text-base placeholder-gray-600 focus:outline-none focus:bg-gray-700/50"
                      />
                      
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Add row buttons at bottom */}
          <div className="px-3 py-3 border-t border-white/5 space-y-2">
            <button
              type="button"
              onClick={() => addRow(false)}
              className="w-full h-11 rounded-xl border border-dashed border-gray-600 text-gray-500 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 flex items-center justify-center gap-2 transition-all text-sm"
            >
              <Plus size={16} />
              Lägg till rad
            </button>

          </div>
        </div>
        
        {/* Undo delete toast */}
        {deletedRow && (
          <div 
            className="fixed z-[2001] left-4 right-20 flex items-center gap-3 bg-gray-700 text-white text-sm rounded-xl px-4 py-3 shadow-lg border border-white/10"
            style={{
              bottom: `${Math.max(16, viewportHeight - window.innerHeight + 16)}px`
            }}
          >
            <span className="flex-1 truncate">
              "{deletedRow.row.col1 || 'Rad'}" borttagen
            </span>
            <button
              type="button"
              onClick={undoDelete}
              className="flex items-center gap-1.5 text-blue-400 font-medium hover:text-blue-300 transition-colors flex-shrink-0"
            >
              <Undo2 size={14} />
              Ångra
            </button>
          </div>
        )}
        
        {/* Floating save button */}
        <button
          type="button"
          onClick={handleSave}
          className="fixed z-[2001] right-4 w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center"
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

// Multi-column table editor for templates like fusebox (3+ columns)
export function MultiColumnTableEditorModal({ 
  rows: initialRows, 
  title, 
  columns = [],
  useCollapse = false,
  onSave, 
  onCancel 
}) {
  const [rows, setRows] = useState(() => 
    (initialRows || []).map((row, i) => ({ 
      ...row, 
      id: row.id || `row-${i}-${Date.now()}` 
    }))
  );
  const listRef = useRef(null);
  const inputRefs = useRef({});
  const lastAddedRef = useRef(null);
  const focusTargetRef = useRef(null);
  
  const HEADER_HEIGHT = 52;
  
  const { viewportHeight, viewportOffset } = useFullscreenModal({
    bgColor: '#111827',
    headerHeight: HEADER_HEIGHT,
  });
  
  // Focus newly added row
  useEffect(() => {
    if (lastAddedRef.current && columns.length > 0) {
      const input = inputRefs.current[`${lastAddedRef.current}-${columns[0].id}`];
      if (input) {
        input.focus();
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      lastAddedRef.current = null;
    }
  }, [rows, columns]);
  
  // Handle focus target after state update
  useEffect(() => {
    if (focusTargetRef.current) {
      const input = inputRefs.current[focusTargetRef.current];
      if (input) {
        input.focus();
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      focusTargetRef.current = null;
    }
  }, [rows]);
  
  const addRow = (isHeader = false) => {
    const newRow = { 
      id: `row-${Date.now()}`,
      ...(isHeader ? { isHeader: true } : {})
    };
    // Initialize all column values
    columns.forEach(col => {
      newRow[col.id] = '';
    });
    setRows([...rows, newRow]);
    lastAddedRef.current = newRow.id;
  };
  
  const addRowAfter = (afterId) => {
    const idx = rows.findIndex(r => r.id === afterId);
    const newRow = { 
      id: `row-${Date.now()}`
    };
    columns.forEach(col => {
      newRow[col.id] = '';
    });
    const newRows = [...rows];
    newRows.splice(idx + 1, 0, newRow);
    setRows(newRows);
    lastAddedRef.current = newRow.id;
  };
  
  const removeRow = (rowId) => {
    setRows(rows.filter(r => r.id !== rowId));
  };
  
  const updateRow = (rowId, field, value) => {
    setRows(rows.map(r => 
      r.id === rowId ? { ...r, [field]: value } : r
    ));
  };
  
  const handleKeyDown = (e, rowId, columnId) => {
    const currentRow = rows.find(r => r.id === rowId);
    const colIndex = columns.findIndex(c => c.id === columnId);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      // If on header row, Enter creates a new normal row below
      if (currentRow?.isHeader) {
        addRowAfter(rowId);
      } else if (colIndex < columns.length - 1) {
        // Move to next column on same row
        focusTargetRef.current = `${rowId}-${columns[colIndex + 1].id}`;
        setRows(r => [...r]);
      } else {
        // Last column, add new row
        addRowAfter(rowId);
      }
    } else if (e.key === 'Backspace' && e.target.value === '') {
      e.preventDefault();
      const idx = rows.findIndex(r => r.id === rowId);
      
      if (colIndex > 0) {
        // Move back to previous column
        focusTargetRef.current = `${rowId}-${columns[colIndex - 1].id}`;
        setRows(r => [...r]);
      } else if (idx > 0) {
        // Focus previous row's last column
        const prevRow = rows[idx - 1];
        focusTargetRef.current = `${prevRow.id}-${columns[columns.length - 1].id}`;
        removeRow(rowId);
      } else {
        // First row, first column - remove if all empty
        const allEmpty = columns.every(col => !rows[idx][col.id]);
        if (allEmpty) {
          removeRow(rowId);
        }
      }
    } else if (e.key === 'Tab' && !e.shiftKey && colIndex < columns.length - 1) {
      e.preventDefault();
      focusTargetRef.current = `${rowId}-${columns[colIndex + 1].id}`;
      setRows(r => [...r]);
    } else if (e.key === 'Tab' && e.shiftKey && colIndex > 0) {
      e.preventDefault();
      focusTargetRef.current = `${rowId}-${columns[colIndex - 1].id}`;
      setRows(r => [...r]);
    }
  };
  
  const handleSave = () => {
    // Clean up empty rows and row metadata
    const cleanedRows = rows
      .filter(row => {
        if (row.isHeader) {
          return columns.some(col => row[col.id]?.trim());
        }
        return columns.some(col => row[col.id]?.trim());
      })
      .map(row => {
        const cleanRow = {};
        if (row.isHeader) cleanRow.isHeader = true;
        columns.forEach(col => {
          if (row[col.id]) cleanRow[col.id] = row[col.id];
        });
        return cleanRow;
      });
    onSave(cleanedRows);
  };
  
  const contentHeight = viewportHeight - HEADER_HEIGHT;
  
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1999] bg-gray-900" />
      
      {/* Main modal */}
      <div
        className="fixed left-0 right-0 z-[2000] bg-gray-900 flex flex-col"
        style={{
          top: `${viewportOffset}px`,
          height: `${viewportHeight}px`
        }}
      >
        {/* Header */}
        <div 
          className="flex-shrink-0 flex items-center justify-between px-3 border-b border-white/5 bg-gray-950/50"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-base font-medium text-white truncate">
              {title || 'Redigera'}
            </span>
            <span className="text-xs text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded-full">
              {rows.filter(r => !r.isHeader).length} rader
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Add header row button */}
            {useCollapse && (
              <button
                type="button"
                onClick={() => addRow(true)}
                className="h-9 px-3 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white flex items-center gap-1.5 transition-colors text-sm"
              >
                <Plus size={14} />
                Rubrik
              </button>
            )}
            
            <button
              type="button"
              onClick={onCancel}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Column headers */}
        <div className="flex-shrink-0 flex items-center px-3 py-2 border-b border-white/10 bg-gray-950/30 gap-2">
          <div className="w-8" /> {/* Spacer for grip */}
          {columns.map((col, idx) => (
            <div
              key={col.id}
              className={`text-xs font-medium text-gray-400 uppercase tracking-wide ${col.width || 'flex-1'} ${col.align === 'center' ? 'text-center' : ''}`}
            >
              {col.label}
            </div>
          ))}
          <div className="w-8" /> {/* Spacer for delete button */}
        </div>
        
        {/* Scrollable list */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto"
          style={{ height: `${contentHeight - 40}px`, paddingBottom: '100px' }}
        >
          {rows.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center mx-auto mb-3">
                <Plus size={24} className="text-gray-500" />
              </div>
              <p className="font-medium">Tabellen är tom</p>
              <p className="text-sm mt-1 text-gray-600">Lägg till rader nedan</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {rows.map((row, rowIndex) => (
                <div
                  key={row.id}
                  className={`flex items-center gap-2 px-3 py-2.5 min-w-0 ${
                    row.isHeader ? 'bg-blue-500/10' : ''
                  }`}
                >
                  <div className="w-6 flex-shrink-0 text-gray-600">
                    <GripVertical size={16} />
                  </div>
                  
                  {row.isHeader ? (
                    // Header row - single full-width input
                    <input
                      ref={el => inputRefs.current[`${row.id}-${columns[0]?.id}`] = el}
                      type="text"
                      value={row[columns[0]?.id] || ''}
                      onChange={(e) => updateRow(row.id, columns[0]?.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, row.id, columns[0]?.id)}
                      placeholder="Grupp/rubrik..."
                      className="flex-1 min-w-0 bg-transparent text-blue-400 text-base font-semibold uppercase tracking-wide placeholder-gray-600 focus:outline-none"
                    />
                  ) : (
                    // Regular row - dynamic columns with flex container
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                      {columns.map((col, colIdx) => (
                        <input
                          key={col.id}
                          ref={el => inputRefs.current[`${row.id}-${col.id}`] = el}
                          type="text"
                          inputMode={col.type === 'number' ? 'numeric' : 'text'}
                          maxLength={col.maxLength}
                          value={row[col.id] || ''}
                          onChange={(e) => updateRow(row.id, col.id, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, row.id, col.id)}
                          placeholder={col.placeholder || col.label}
                          className={`${col.width === 'flex-1' ? 'flex-1 min-w-0' : `flex-shrink-0 ${col.width}`} bg-gray-700/30 rounded px-2 py-1.5 text-base placeholder-gray-600 focus:outline-none focus:bg-gray-700/50 ${
                            col.align === 'center' ? 'text-center' : ''
                          } ${colIdx === columns.length - 1 ? 'text-gray-300' : 'text-white'}`}
                        />
                      ))}
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add row button at bottom */}
          <div className="px-3 py-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => addRow(false)}
              className="w-full h-11 rounded-xl border border-dashed border-gray-600 text-gray-500 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 flex items-center justify-center gap-2 transition-all text-sm"
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
          className="fixed z-[2001] right-4 w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center"
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

export default SimpleTableEditorModal;
