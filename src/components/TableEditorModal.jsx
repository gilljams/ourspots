import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Check, Trash2, ChevronDown, GripVertical, ArrowUp, ArrowDown, ListPlus, Heading } from 'lucide-react';

// Fullscreen table editor modal - mobile optimized
export function TableEditorModal({ rows: initialRows, columns, template, title, onSave, onCancel }) {
  const [rows, setRows] = useState(() => 
    (initialRows || []).map((row, i) => ({ ...row, id: row.id || `row-${i}-${Date.now()}` }))
  );
  const [expandedRowId, setExpandedRowId] = useState(null);
  const containerRef = useRef(null);
  const scrollYRef = useRef(0);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [viewportOffset, setViewportOffset] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
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
  
  // Get display columns (filter out hidden ones for editor)
  const editorColumns = columns.filter(col => !col.hideInEditor);
  
  // Get primary display field for collapsed view
  const getPrimaryField = (row) => {
    if (row.isHeader) return row.headerText || 'Rubrik';
    // First text column that's not hidden
    const textCol = columns.find(c => c.type === 'text' && !c.hideInEditor);
    if (textCol) return row[textCol.id] || '';
    // Fallback to item field
    return row.item || row.task || row.name || '';
  };
  
  // Get secondary fields for display
  const getSecondaryInfo = (row) => {
    if (row.isHeader) return null;
    const parts = [];
    editorColumns.forEach(col => {
      if (col.type === 'text' && row[col.id] && col.id !== columns.find(c => c.type === 'text')?.id) {
        parts.push(row[col.id]);
      }
      if (col.type === 'number' && row[col.id]) {
        parts.push(`${col.label}: ${row[col.id]}`);
      }
    });
    return parts.length > 0 ? parts.join(' • ') : null;
  };
  
  const addRow = (isHeader = false) => {
    const newRow = isHeader 
      ? { id: `row-${Date.now()}`, isHeader: true, item: '' }
      : { id: `row-${Date.now()}` };
    
    // Initialize all columns with empty values
    if (!isHeader) {
      columns.forEach(col => {
        if (col.type === 'checkbox') {
          newRow[col.id] = false;
        } else if (col.type === 'number') {
          newRow[col.id] = '';
        } else {
          newRow[col.id] = '';
        }
      });
    }
    
    setRows([...rows, newRow]);
    setExpandedRowId(newRow.id);
    setHasChanges(true);
    setShowAddMenu(false);
    
    // Scroll to bottom after adding
    setTimeout(() => {
      containerRef.current?.querySelector('[data-row-list]')?.scrollTo({
        top: 99999,
        behavior: 'smooth'
      });
    }, 100);
  };
  
  const removeRow = (rowId) => {
    setRows(rows.filter(r => r.id !== rowId));
    setHasChanges(true);
    if (expandedRowId === rowId) {
      setExpandedRowId(null);
    }
  };
  
  const updateRow = (rowId, field, value) => {
    setRows(rows.map(r => 
      r.id === rowId ? { ...r, [field]: value } : r
    ));
    setHasChanges(true);
  };
  
  const toggleCheckbox = (rowId, field) => {
    setRows(rows.map(r => 
      r.id === rowId ? { ...r, [field]: !r[field] } : r
    ));
    setHasChanges(true);
  };
  
  const moveRow = (rowId, direction) => {
    const idx = rows.findIndex(r => r.id === rowId);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= rows.length) return;
    
    const newRows = [...rows];
    [newRows[idx], newRows[newIdx]] = [newRows[newIdx], newRows[idx]];
    setRows(newRows);
    setHasChanges(true);
  };
  
  const handleSave = () => {
    // Clean up rows - remove id field if it was added
    const cleanRows = rows.map(({ id, ...rest }) => rest);
    onSave(cleanRows);
  };
  
  const contentHeight = viewportHeight - HEADER_HEIGHT;
  
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1999] bg-slate-800" />
      
      {/* Main modal */}
      <div
        ref={containerRef}
        className="fixed left-0 right-0 z-[2000] bg-slate-800 flex flex-col"
        style={{
          top: `${viewportOffset}px`,
          height: `${viewportHeight}px`
        }}
      >
        {/* Header with actions */}
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
          
          {/* Add dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="h-9 px-3 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex items-center gap-1.5 transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Lägg till
            </button>
            
            {showAddMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowAddMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-1 z-20 bg-slate-700 rounded-lg shadow-xl border border-white/10 overflow-hidden min-w-[140px]">
                  <button
                    type="button"
                    onClick={() => addRow(false)}
                    className="w-full px-3 py-2.5 flex items-center gap-2 text-white hover:bg-white/10 transition-colors text-sm"
                  >
                    <ListPlus size={16} className="text-slate-400" />
                    Ny rad
                  </button>
                  <button
                    type="button"
                    onClick={() => addRow(true)}
                    className="w-full px-3 py-2.5 flex items-center gap-2 text-white hover:bg-white/10 transition-colors text-sm border-t border-white/5"
                  >
                    <Heading size={16} className="text-slate-400" />
                    Ny rubrik
                  </button>
                </div>
              </>
            )}
          </div>
          
          <button
            type="button"
            onClick={onCancel}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors ml-1"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Scrollable row list */}
        <div 
          data-row-list
          className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
          style={{ height: `${contentHeight}px`, paddingBottom: '80px' }}
        >
          {rows.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                <Plus size={24} className="text-slate-500" />
              </div>
              <p className="font-medium">Inga rader ännu</p>
              <p className="text-sm mt-1 text-slate-600">Tryck på "Lägg till" ovan</p>
            </div>
          ) : (
            rows.map((row, idx) => (
              <RowCard
                key={row.id}
                row={row}
                idx={idx}
                total={rows.length}
                columns={editorColumns}
                allColumns={columns}
                isExpanded={expandedRowId === row.id}
                onToggle={() => setExpandedRowId(expandedRowId === row.id ? null : row.id)}
                onUpdate={(field, value) => updateRow(row.id, field, value)}
                onToggleCheckbox={(field) => toggleCheckbox(row.id, field)}
                onMove={(dir) => moveRow(row.id, dir)}
                onRemove={() => removeRow(row.id)}
              />
            ))
          )}
        </div>
        
        {/* Floating save button (FAB) */}
        <button
          type="button"
          onClick={handleSave}
          className={`fixed z-[2001] right-4 w-14 h-14 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center ${
            hasChanges ? 'animate-pulse shadow-emerald-500/50' : ''
          }`}
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

// Individual row card component
function RowCard({ 
  row, 
  idx, 
  total, 
  columns, 
  allColumns,
  isExpanded, 
  onToggle, 
  onUpdate, 
  onToggleCheckbox,
  onMove, 
  onRemove 
}) {
  const inputRefs = useRef({});
  
  // Focus first input when expanded
  useEffect(() => {
    if (isExpanded) {
      const firstInput = Object.values(inputRefs.current)[0];
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }, [isExpanded]);
  
  // Header row - special styling
  if (row.isHeader) {
    return (
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <ChevronDown 
              size={14} 
              className={`text-sky-400 transition-transform flex-shrink-0 ${isExpanded ? '' : '-rotate-90'}`}
            />
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-wide truncate">
              {row.item || 'Rubrik'}
            </span>
          </button>
          <div className="flex gap-1.5 flex-shrink-0">
            <button 
              type="button" 
              onClick={() => onMove(-1)} 
              disabled={idx === 0}
              className="w-7 h-7 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <ArrowUp size={14} />
            </button>
            <button 
              type="button" 
              onClick={() => onMove(1)} 
              disabled={idx === total - 1}
              className="w-7 h-7 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <ArrowDown size={14} />
            </button>
            <button 
              type="button" 
              onClick={onRemove}
              className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="px-3 pb-3">
            <input
              type="text"
              value={row.item || ''}
              onChange={(e) => onUpdate('item', e.target.value)}
              placeholder="Rubriktext..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-sky-500/20 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>
        )}
      </div>
    );
  }
  
  // Check if has checkbox column
  const checkboxCol = allColumns.find(c => c.type === 'checkbox');
  const isChecked = checkboxCol && row[checkboxCol.id];
  
  // Get primary text to display
  const primaryText = columns.find(c => c.type === 'text');
  const primaryValue = primaryText ? row[primaryText.id] || '' : '';
  
  // Get secondary info
  const secondaryParts = [];
  columns.forEach(col => {
    if (col.type === 'text' && col.id !== primaryText?.id && row[col.id]) {
      secondaryParts.push(row[col.id]);
    }
    if (col.type === 'number' && row[col.id]) {
      secondaryParts.push(`${col.label}: ${row[col.id]}`);
    }
  });
  
  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isChecked 
        ? 'border-emerald-500/20 bg-emerald-500/5' 
        : 'border-white/5 bg-slate-700/30'
    }`}>
      {/* Collapsed view - clickable row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Checkbox if exists */}
        {checkboxCol && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCheckbox(checkboxCol.id);
            }}
            className="flex-shrink-0"
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              isChecked 
                ? 'bg-emerald-500 border-emerald-500' 
                : 'border-slate-500 hover:border-emerald-400'
            }`}>
              {isChecked && <Check size={12} className="text-white" />}
            </div>
          </button>
        )}
        
        {/* Main content - expand on tap */}
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 min-w-0 text-left"
        >
          <div className={`text-sm truncate ${isChecked ? 'text-slate-500 line-through' : 'text-white'}`}>
            {primaryValue || <span className="text-slate-500 italic">Tom rad</span>}
          </div>
          {secondaryParts.length > 0 && (
            <div className="text-xs text-slate-500 truncate mt-0.5">
              {secondaryParts.join(' • ')}
            </div>
          )}
        </button>
        
        {/* Expand indicator */}
        <ChevronDown 
          size={14} 
          onClick={onToggle}
          className={`text-slate-500 transition-transform flex-shrink-0 cursor-pointer ${isExpanded ? '' : '-rotate-90'}`}
        />
      </div>
      
      {/* Expanded editing view */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-3">
          {columns.map((col, colIdx) => (
            <div key={col.id} className="flex items-center gap-2">
              <label className="text-xs text-slate-500 w-16 flex-shrink-0">
                {col.label || col.id}
              </label>
              {col.type === 'checkbox' ? (
                <button
                  type="button"
                  onClick={() => onToggleCheckbox(col.id)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    row[col.id] 
                      ? 'bg-emerald-500 border-emerald-500' 
                      : 'border-slate-500 hover:border-emerald-400'
                  }`}>
                    {row[col.id] && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-xs text-slate-400">
                    {row[col.id] ? 'Klar' : 'Ej klar'}
                  </span>
                </button>
              ) : col.type === 'number' ? (
                <input
                  ref={el => inputRefs.current[col.id] = el}
                  type="text"
                  inputMode="numeric"
                  value={row[col.id] || ''}
                  onChange={(e) => onUpdate(col.id, e.target.value)}
                  placeholder={col.label}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-700/50 border border-white/5 text-white text-sm text-right placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                />
              ) : (
                <input
                  ref={el => inputRefs.current[col.id] = el}
                  type="text"
                  value={row[col.id] || ''}
                  onChange={(e) => onUpdate(col.id, e.target.value)}
                  placeholder={col.label}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-700/50 border border-white/5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                />
              )}
            </div>
          ))}
          
          {/* Row actions - compact */}
          <div className="flex gap-1.5 pt-2">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={idx === 0}
              className="w-8 h-8 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={idx === total - 1}
              className="w-8 h-8 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <ArrowDown size={14} />
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onRemove}
              className="px-3 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"
            >
              <Trash2 size={12} /> Ta bort
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TableEditorModal;
