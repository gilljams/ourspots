import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { X, Plus, Check, Trash2, GripVertical, ClipboardPaste, MoreVertical, CheckSquare, Square, RotateCcw, ListX, ArrowDownUp, Undo2, CheckCheck, ChevronLeft, ChevronRight, Copy, ArrowRightFromLine } from 'lucide-react';
import { useFullscreenModal } from '../utils/useFullscreenModal';
import { useDragReorder } from '../utils/useDragReorder';
import { useConfirm } from '../utils/useConfirm';
import { usePrompt } from '../utils/usePrompt';

// Expandable input - shows textarea when focused if text is long
const ExpandableInput = forwardRef(({ value, onChange, onKeyDown, placeholder, className, isHeader }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef(null);
  const LONG_TEXT_THRESHOLD = 40;
  
  const isLongText = (value || '').length > LONG_TEXT_THRESHOLD;
  const showTextarea = isExpanded && isLongText;
  
  // Sync refs
  useEffect(() => {
    if (ref) {
      ref.current = showTextarea ? textareaRef.current : ref.current;
    }
  }, [showTextarea, ref]);
  
  const handleFocus = () => {
    setIsExpanded(true);
  };
  
  const handleBlur = () => {
    setIsExpanded(false);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onKeyDown(e);
    } else if (e.key === 'Backspace') {
      onKeyDown(e);
    }
  };
  
  // Auto-resize textarea
  const adjustTextareaHeight = (textarea) => {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  };
  
  if (showTextarea) {
    return (
      <textarea
        ref={(el) => {
          textareaRef.current = el;
          if (ref) ref.current = el;
          if (el) adjustTextareaHeight(el);
        }}
        value={value || ''}
        onChange={(e) => {
          onChange(e);
          adjustTextareaHeight(e.target);
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={2}
        className={`${className} resize-none min-h-[40px]`}
        autoFocus
      />
    );
  }
  
  return (
    <input
      ref={ref}
      type="text"
      value={value || ''}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={handleFocus}
      placeholder={placeholder}
      className={className}
    />
  );
});

// Simple list editor modal - optimized for mobile with single-column lists
export function ListEditorModal({ rows: initialRows, title, onSave, onCancel, yearMode = false, yearData: initialYearData }) {
  const confirm = useConfirm();
  const prompt = usePrompt();

  const CURRENT_YEAR = new Date().getFullYear();
  const [activeYear, setActiveYear] = useState(CURRENT_YEAR);

  // Year data: { "2026": [...rows], "2025": [...rows] }
  const [yearData, setYearData] = useState(() => {
    if (!yearMode) return {};
    if (initialYearData && Object.keys(initialYearData).length > 0) {
      // Add ids to all rows in all years
      const data = {};
      Object.entries(initialYearData).forEach(([year, yearRows]) => {
        data[year] = (yearRows || []).map((row, i) => ({
          ...row,
          id: row.id || `row-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        }));
      });
      return data;
    }
    // Migration: if yearMode but no yearData, put initialRows in current year
    if (initialRows && initialRows.length > 0) {
      return {
        [CURRENT_YEAR]: initialRows.map((row, i) => ({
          ...row,
          id: row.id || `row-${i}-${Date.now()}`
        }))
      };
    }
    return {};
  });

  // For yearMode, rows = the active year's rows; otherwise flat list
  const [rows, setRows] = useState(() => {
    if (yearMode) {
      return (yearData[CURRENT_YEAR] || []).map((row, i) => ({
        ...row,
        id: row.id || `row-${i}-${Date.now()}`
      }));
    }
    return (initialRows || []).map((row, i) => ({
      ...row,
      id: row.id || `row-${i}-${Date.now()}`
    }));
  });
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showUtilsMenu, setShowUtilsMenu] = useState(false);
  const [deletedRow, setDeletedRow] = useState(null);
  const undoTimerRef = useRef(null);
  const listRef = useRef(null);
  const inputRefs = useRef({});
  const lastAddedRef = useRef(null);

  // Keep yearData in sync when rows change (yearMode)
  useEffect(() => {
    if (yearMode) {
      setYearData(prev => ({ ...prev, [activeYear]: rows }));
    }
  }, [rows, yearMode, activeYear]);

  // Switch year: save current rows, load target year
  const switchYear = (targetYear) => {
    if (targetYear === activeYear) return;
    // Save current
    setYearData(prev => {
      const updated = { ...prev, [activeYear]: rows };
      // Load target year
      const targetRows = (updated[targetYear] || []).map((row, i) => ({
        ...row,
        id: row.id || `row-${i}-${Date.now()}`
      }));
      setRows(targetRows);
      return updated;
    });
    setActiveYear(targetYear);
    setEditingYear(null);
  };

  // Copy current year to another year
  const copyYearTo = async (targetYear) => {
    const existing = yearData[targetYear] || [];
    if (existing.length > 0) {
      if (!await confirm({
        title: `Kopiera till ${targetYear}?`,
        message: `${targetYear} har redan ${existing.filter(r => !r.isHeader).length} rader. Dessa ersätts.`,
        confirmText: 'Kopiera',
        variant: 'warning'
      })) return;
    }
    // Deep-copy rows, reset done status, assign new ids
    const copiedRows = rows.map(row => ({
      ...row,
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      done: row.isHeader ? undefined : false
    }));
    setYearData(prev => ({ ...prev, [targetYear]: copiedRows }));
  };

  // Get all years that have data, plus current year and surrounding
  const getAvailableYears = () => {
    const years = new Set(Object.keys(yearData).map(Number));
    years.add(CURRENT_YEAR);
    years.add(activeYear);
    return [...years].sort((a, b) => a - b);
  };

  // Move unchecked items (+ their headers) to next year
  const moveUnfinishedToNextYear = async () => {
    const nextYear = activeYear + 1;
    const uncheckedCount = rows.filter(r => !r.isHeader && !r.done).length;
    if (uncheckedCount === 0) return;

    // Build sections: each header + its items
    const sections = [];
    let currentSection = { header: null, items: [] };
    rows.forEach(row => {
      if (row.isHeader) {
        if (currentSection.header || currentSection.items.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { header: row, items: [] };
      } else {
        currentSection.items.push(row);
      }
    });
    if (currentSection.header || currentSection.items.length > 0) {
      sections.push(currentSection);
    }

    // Rows to move: headers that have unchecked items + the unchecked items themselves
    const movedRows = [];
    const remainingRows = [];
    sections.forEach(section => {
      const unchecked = section.items.filter(r => !r.done);
      const checked = section.items.filter(r => r.done);
      if (unchecked.length > 0) {
        // Move header + unchecked to next year
        if (section.header) movedRows.push({ ...section.header, id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` });
        unchecked.forEach(r => movedRows.push({ ...r, done: false, id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }));
      }
      // Keep header + checked in current year (if any checked exist)
      if (checked.length > 0) {
        if (section.header) remainingRows.push(section.header);
        checked.forEach(r => remainingRows.push(r));
      }
    });

    // Merge moved rows into next year, grouping under existing headers
    const existingNext = (yearData[nextYear] || []).map((r, i) => ({
      ...r,
      id: r.id || `row-${i}-${Date.now()}`
    }));

    // Build a map of sections in next year keyed by header label (lowercase)
    const nextSections = [];
    let curSec = { header: null, items: [] };
    existingNext.forEach(row => {
      if (row.isHeader) {
        if (curSec.header || curSec.items.length > 0) nextSections.push(curSec);
        curSec = { header: row, items: [] };
      } else {
        curSec.items.push(row);
      }
    });
    if (curSec.header || curSec.items.length > 0) nextSections.push(curSec);

    // Build map of header labels → section index for quick lookup
    const headerMap = {};
    nextSections.forEach((sec, idx) => {
      if (sec.header) headerMap[(sec.header.label || '').trim().toLowerCase()] = idx;
    });

    // Group moved rows by their header
    const movedSections = [];
    let mSec = { header: null, items: [] };
    movedRows.forEach(row => {
      if (row.isHeader) {
        if (mSec.header || mSec.items.length > 0) movedSections.push(mSec);
        mSec = { header: row, items: [] };
      } else {
        mSec.items.push(row);
      }
    });
    if (mSec.header || mSec.items.length > 0) movedSections.push(mSec);

    // Merge: append items under matching header, or add new section at end
    movedSections.forEach(moved => {
      const key = moved.header ? (moved.header.label || '').trim().toLowerCase() : null;
      if (key && headerMap[key] !== undefined) {
        // Matching header exists – append items under it
        nextSections[headerMap[key]].items.push(...moved.items);
      } else {
        // No match – add as new section
        nextSections.push(moved);
      }
    });

    // Flatten sections back to rows
    const mergedNext = [];
    nextSections.forEach(sec => {
      if (sec.header) mergedNext.push(sec.header);
      sec.items.forEach(r => mergedNext.push(r));
    });

    setYearData(prev => ({
      ...prev,
      [nextYear]: mergedNext
    }));

    // Update current year to only keep done items
    setRows(remainingRows);
  };

  // State for showing year picker
  const [editingYear, setEditingYear] = useState(null);
  
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
    if (lastAddedRef.current && inputRefs.current[lastAddedRef.current]) {
      const input = inputRefs.current[lastAddedRef.current];
      input.focus();
      // Wait a bit for keyboard to open, then scroll input into view
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
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
    const idx = rows.findIndex(r => r.id === rowId);
    const row = rows[idx];
    if (idx === -1) return;
    
    // Save for undo
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setDeletedRow({ row, index: idx });
    undoTimerRef.current = setTimeout(() => {
      setDeletedRow(null);
    }, 5000);
    
    setRows(rows.filter(r => r.id !== rowId));
  };
  
  const undoDelete = () => {
    if (!deletedRow) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const newRows = [...rows];
    const insertAt = Math.min(deletedRow.index, newRows.length);
    newRows.splice(insertAt, 0, deletedRow.row);
    setRows(newRows);
    setDeletedRow(null);
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
    if (yearMode) {
      // Save all years, including current rows in active year
      const finalYearData = { ...yearData, [activeYear]: rows };
      const cleanYearData = {};
      Object.entries(finalYearData).forEach(([year, yearRows]) => {
        if (yearRows && yearRows.length > 0) {
          cleanYearData[year] = yearRows.map(({ id, ...rest }) => rest);
        }
      });
      onSave(cleanRows, cleanYearData);
    } else {
      onSave(cleanRows);
    }
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
      const text = await prompt({ title: 'Klistra in', message: 'En rad per punkt', placeholder: 'Klistra in text här...', multiline: true });
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
  
  const contentHeight = viewportHeight - HEADER_HEIGHT - (yearMode ? 44 : 0);
  
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1999] bg-gray-900" />
      
      {/* Main modal */}
      <div
        className="fixed left-0 right-0 z-[2000] bg-gray-900 flex flex-col"
        style={{
          top: `calc(${viewportOffset}px + env(safe-area-inset-top))`,
          height: `calc(${viewportHeight}px - env(safe-area-inset-top))`
        }}
      >
        {/* Header */}
        <div 
          className="flex-shrink-0 flex items-center justify-between px-3 border-b border-white/5 bg-gray-950/50"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-base font-medium text-white truncate">
              {title || 'Redigera lista'}
            </span>
            <span className="text-xs text-gray-400 bg-white/10 px-1.5 py-0.5 rounded-full">
              {rows.filter(r => !r.isHeader).length}
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Add header row button */}
            <button
              type="button"
              onClick={() => addRow(true)}
              className="h-9 px-3 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white flex items-center gap-1.5 transition-colors text-sm"
            >
              <Plus size={14} />
              Rubrik
            </button>
            
            {/* Utils dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUtilsMenu(!showUtilsMenu)}
                className={`h-9 w-9 rounded-lg ${selectMode ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'} flex items-center justify-center transition-colors`}
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
                  <div className="absolute right-0 top-full mt-1 w-44 bg-gray-900 rounded-lg shadow-xl border border-white/10 py-1 z-[2002]">
                    <button
                      type="button"
                      onClick={() => {
                        handlePaste();
                        setShowUtilsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-2"
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
                      className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-2"
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
                      className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-2"
                    >
                      <CheckCheck size={14} />
                      Bocka i alla
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (await confirm({ title: 'Rensa ibockningar?', message: 'Alla ibockningar tas bort.', confirmText: 'Rensa', variant: 'warning' })) {
                          setRows(rows.map(r => r.isHeader ? r : { ...r, done: false }));
                        }
                        setShowUtilsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-2"
                    >
                      <RotateCcw size={14} />
                      Rensa ibockningar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Sort: headers stay, unchecked first, then checked — preserving relative order
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
                          if (r.isHeader) {
                            flushSection();
                            result.push(r);
                          } else {
                            currentSection.push(r);
                          }
                        });
                        flushSection();
                        
                        setRows(result);
                        setShowUtilsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-2"
                    >
                      <ArrowDownUp size={14} />
                      Sortera klara sist
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const checkedCount = rows.filter(r => !r.isHeader && r.done).length;
                        if (checkedCount === 0) {
                          setShowUtilsMenu(false);
                          return;
                        }
                        if (await confirm({ title: 'Ta bort ibockade?', message: `${checkedCount} ibockade rad${checkedCount > 1 ? 'er' : ''} tas bort.`, confirmText: 'Ta bort', variant: 'danger' })) {
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
                    {yearMode && (
                      <button
                        type="button"
                        onClick={() => {
                          copyYearTo(activeYear + 1);
                          setShowUtilsMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-2"
                      >
                        <Copy size={14} />
                        Kopiera till {activeYear + 1}
                      </button>
                    )}
                    {yearMode && rows.some(r => !r.isHeader && !r.done) && (
                      <button
                        type="button"
                        onClick={() => {
                          moveUnfinishedToNextYear();
                          setShowUtilsMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-2"
                      >
                        <ArrowRightFromLine size={14} />
                        Flytta ej klara → {activeYear + 1}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (await confirm({ title: 'Rensa listan?', message: 'Alla rader tas bort från listan.', confirmText: 'Rensa', variant: 'danger' })) {
                          setRows([]);
                        }
                        setShowUtilsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <ListX size={14} />
                      Rensa listan
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

        {/* Year navigator (yearMode only) */}
        {yearMode && (
          <div className="flex-shrink-0 flex items-center justify-center gap-3 px-3 py-2 border-b border-white/5 bg-gray-950/30" style={{ height: '44px' }}>
            <button
              type="button"
              onClick={() => switchYear(activeYear - 1)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setEditingYear(editingYear ? null : activeYear)}
              className="text-base font-semibold text-white tabular-nums min-w-[4rem] text-center"
            >
              {activeYear}
            </button>
            <button
              type="button"
              onClick={() => switchYear(activeYear + 1)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            {/* Year dots - show which years have data */}
            <div className="flex items-center gap-1 ml-2">
              {getAvailableYears().map(year => {
                const hasData = (yearData[year] || []).filter(r => !r.isHeader).length > 0 || (year === activeYear && rows.filter(r => !r.isHeader).length > 0);
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => switchYear(year)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      year === activeYear
                        ? 'bg-blue-400 w-4'
                        : hasData
                          ? 'bg-gray-500 hover:bg-gray-400'
                          : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    title={`${year}${hasData ? '' : ' (tom)'}`}
                  />
                );
              })}
            </div>
          </div>
        )}
        
        {/* Scrollable list */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto"
          style={{ height: `${contentHeight}px`, paddingBottom: '100px' }}
        >
          {rows.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                <Plus size={24} className="text-gray-500" />
              </div>
              <p className="font-medium">Listan är tom</p>
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
                  className={`flex items-center gap-2 transition-all overflow-hidden ${
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
                        ref={el => inputRefs.current[row.id] = el}
                        type="text"
                        value={row.item || ''}
                        onChange={(e) => updateRow(row.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, row.id)}
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
                    // Regular row
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
                        className="text-gray-600 cursor-grab active:cursor-grabbing touch-none"
                        onTouchStart={(e) => handleTouchStart(e, row.id)}
                      >
                        <GripVertical size={16} />
                      </div>
                      <ExpandableInput
                        ref={el => inputRefs.current[row.id] = el}
                        value={row.item || ''}
                        onChange={(e) => updateRow(row.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, row.id)}
                        placeholder="Skriv här..."
                        className={`flex-1 bg-transparent text-base placeholder-gray-600 focus:outline-none ${row.done ? 'text-gray-500' : 'text-white'}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors"
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
            className="absolute z-[2001] left-4 right-20 bottom-4 flex items-center gap-3 bg-gray-900 text-white text-sm rounded-xl px-4 py-3 shadow-lg border border-white/10"
          >
            <span className="flex-1 truncate">
              "{deletedRow.row.item || 'Rad'}" borttagen
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
          className="absolute z-[2001] right-4 bottom-4 w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center"
        >
          <Check size={24} strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
}

export default ListEditorModal;
