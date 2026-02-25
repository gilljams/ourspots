import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Plus, Edit2, Type, Phone, Link2, Hash } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';
import { TABLE_TEMPLATES } from './index';
import { ListEditorModal } from '../ListEditorModal';
import { SimpleTableEditorModal, MultiColumnTableEditorModal } from '../SimpleTableEditorModal';

// Table block editor component
function TableBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title || '');
  const [template, setTemplate] = useState(block.template || 'table');
  const [rows, setRows] = useState(block.rows || []);
  const [col2Type, setCol2Type] = useState(block.col2Type || 'text');
  const [showCheckbox, setShowCheckbox] = useState(block.showCheckbox ?? true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? true);
  const [viewerEditable, setViewerEditable] = useState(block.viewerEditable ?? false);
  const [showTableEditor, setShowTableEditor] = useState(false);
  
  // Check if this is a legacy template (tasks, shopping, contacts)
  const isLegacyTemplate = ['tasks', 'shopping', 'contacts'].includes(template);
  
  // Ref to store input elements for focusing
  const inputRefs = React.useRef({});
  // Track which input should be focused after render
  const [focusTarget, setFocusTarget] = React.useState(null);
  
  const currentTemplate = TABLE_TEMPLATES[template];
  const columns = currentTemplate?.columns || [];
  // Filter out columns that should be hidden in editor (like checkbox for list type)
  const editorColumns = columns.filter(col => !col.hideInEditor);
  
  // Focus the target input after state updates
  React.useEffect(() => {
    if (focusTarget) {
      const { rowIndex, colId } = focusTarget;
      const key = `${rowIndex}-${colId}`;
      const input = inputRefs.current[key];
      if (input) {
        input.focus();
      }
      setFocusTarget(null);
    }
  }, [focusTarget, rows]);

  const syncToParent = (newTitle, newTemplate, newRows, newDefaultCollapsed = defaultCollapsed, newViewerEditable = viewerEditable, newCol2Type = col2Type, newShowCheckbox = showCheckbox) => {
    onUpdate(block.id, { 
      title: newTitle, 
      template: newTemplate, 
      rows: newRows,
      columns: TABLE_TEMPLATES[newTemplate]?.columns || [],
      defaultCollapsed: newDefaultCollapsed,
      viewerEditable: newViewerEditable,
      col2Type: newCol2Type,
      showCheckbox: newShowCheckbox
    });
  };

  const handleViewerEditableChange = (newValue) => {
    setViewerEditable(newValue);
    syncToParent(title, template, rows, defaultCollapsed, newValue);
  };

  const handleTemplateChange = (newTemplate) => {
    // Confirm if there are existing rows
    if (rows.length > 0) {
      if (!confirm('Byta tabelltyp raderar alla befintliga rader. Fortsätta?')) {
        return;
      }
    }
    setTemplate(newTemplate);
    setRows([]);
    syncToParent(title, newTemplate, []);
  };

  const addRow = (isHeader = false, focusAfter = false) => {
    const newRow = { id: Math.random().toString(36).substr(2, 9) };
    if (isHeader) {
      newRow.isHeader = true;
      newRow.item = '';
    } else {
      columns.forEach(col => {
        newRow[col.id] = col.type === 'checkbox' ? false : '';
      });
    }
    const newRows = [...rows, newRow];
    setRows(newRows);
    syncToParent(title, template, newRows);
    
    // Focus the first editable column of the new row
    if (focusAfter && editorColumns.length > 0) {
      const firstEditableCol = editorColumns.find(col => col.type !== 'checkbox');
      if (firstEditableCol) {
        setFocusTarget({ rowIndex: newRows.length - 1, colId: firstEditableCol.id });
      }
    }
  };

  // Handle Enter key in input fields
  const handleKeyDown = (e, rowIndex, colId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Find current column index
      const currentColIndex = editorColumns.findIndex(col => col.id === colId);
      const isLastColumn = currentColIndex === editorColumns.length - 1;
      const isSingleColumn = editorColumns.filter(col => col.type !== 'checkbox').length === 1;
      
      if (isSingleColumn || isLastColumn) {
        // Single column (like 'list') or last column: add new row and focus it
        addRow(false, true);
      } else {
        // Multi-column: move to next column
        const nextCol = editorColumns[currentColIndex + 1];
        if (nextCol && nextCol.type !== 'checkbox') {
          setFocusTarget({ rowIndex, colId: nextCol.id });
        } else {
          // If next is checkbox, try the one after
          const afterNext = editorColumns[currentColIndex + 2];
          if (afterNext) {
            setFocusTarget({ rowIndex, colId: afterNext.id });
          } else {
            // No more columns, add new row
            addRow(false, true);
          }
        }
      }
    }
  };

  const updateCell = (rowIndex, colId, value) => {
    setRows(prev => prev.map((row, i) => 
      i === rowIndex ? { ...row, [colId]: value } : row
    ));
  };

  // Use a ref to always have latest rows for blur handler
  const rowsRef = React.useRef(rows);
  rowsRef.current = rows;

  const syncRowsOnBlur = () => {
    syncToParent(title, template, rowsRef.current);
  };

  const removeRow = (rowIndex) => {
    const newRows = rows.filter((_, i) => i !== rowIndex);
    setRows(newRows);
    syncToParent(title, template, newRows);
  };

  const moveRow = (rowIndex, direction) => {
    const newIndex = rowIndex + direction;
    if (newIndex < 0 || newIndex >= rows.length) return;
    const newRows = [...rows];
    [newRows[rowIndex], newRows[newIndex]] = [newRows[newIndex], newRows[rowIndex]];
    setRows(newRows);
    syncToParent(title, template, newRows);
  };

  const toggleCheckbox = (rowIndex, colId) => {
    const newRows = rows.map((row, i) => 
      i === rowIndex ? { ...row, [colId]: !row[colId] } : row
    );
    setRows(newRows);
    syncToParent(title, template, newRows);
  };

  // Handle paste to add multiple rows at once
  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText || !pastedText.includes('\n')) return;
    
    e.preventDefault();
    const lines = pastedText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;

    const newRows = lines.map(line => {
      const newRow = { id: Math.random().toString(36).substr(2, 9) };
      columns.forEach(col => {
        if (col.type === 'checkbox') {
          newRow[col.id] = false;
        } else if (col.type === 'text' && (col.id === 'item' || col.id === 'task' || col.id === 'dish' || col.id === 'name')) {
          newRow[col.id] = line.trim();
        } else {
          newRow[col.id] = '';
        }
      });
      return newRow;
    });

    const allRows = [...rows, ...newRows];
    setRows(allRows);
    syncToParent(title, template, allRows);
  };

  const Icon = getIconComponent(currentTemplate?.icon || 'Table2');
  const rowCount = rows.filter(r => !r.isHeader).length;
  const checkedCount = rows.filter(r => !r.isHeader && r.done).length;

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
          <Icon size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            {title || currentTemplate?.name || 'Tabell'}
          </span>
          {rowCount > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">
              ({columns.find(c => c.type === 'checkbox') ? `${checkedCount}/${rowCount}` : rowCount})
            </span>
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
          {/* Title input */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => syncToParent(title, template, rows)}
              placeholder="Rubrik (valfritt)"
              disabled={saving}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Default collapsed toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-gray-400">Ihopfälld som standard</span>
            <button
              type="button"
              onClick={() => {
                const newValue = !defaultCollapsed;
                setDefaultCollapsed(newValue);
                syncToParent(title, template, rows, newValue);
              }}
              disabled={saving}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                defaultCollapsed ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                defaultCollapsed ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Show checkbox toggle - hidden for fusebox */}
          {template !== 'fusebox' && (
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-gray-400">Visa checkbox</span>
              <button
                type="button"
                onClick={() => {
                  const newVal = !showCheckbox;
                  setShowCheckbox(newVal);
                  syncToParent(title, template, rows, defaultCollapsed, viewerEditable, col2Type, newVal);
                }}
                disabled={saving}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  showCheckbox ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  showCheckbox ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          )}

          {/* Viewer editable toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-gray-400">Viewers får redigera</span>
            <button
              type="button"
              onClick={() => handleViewerEditableChange(!viewerEditable)}
              disabled={saving}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                viewerEditable ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                viewerEditable ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Column 2 type selector - only for table templates (not list or fusebox) */}
          {template !== 'list' && template !== 'fusebox' && (
            <div className="py-2">
              <label className="text-xs text-gray-400 mb-2 block">Kolumn 2-typ</label>
              <div className="flex gap-2">
                {[
                  { id: 'text', label: 'Text', icon: Type },
                  { id: 'tel', label: 'Telefon', icon: Phone },
                  { id: 'url', label: 'Länk', icon: Link2 },
                  { id: 'number', label: 'Nummer', icon: Hash }
                ].map(type => {
                  const TypeIcon = type.icon;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setCol2Type(type.id);
                        syncToParent(title, template, rows, defaultCollapsed, viewerEditable, type.id);
                      }}
                      disabled={saving}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors ${
                        col2Type === type.id 
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' 
                          : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <TypeIcon size={14} />
                      <span className="hidden sm:inline">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Open fullscreen editor button */}
          <button
            type="button"
            onClick={() => setShowTableEditor(true)}
            disabled={saving}
            className="w-full py-3 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg border border-blue-500/20 transition-colors flex items-center justify-center gap-2"
          >
            <Edit2 size={16} />
            {template === 'list' ? 'Redigera listan' : 'Redigera tabellen'}
          </button>
        </div>
      )}
      
      {/* Fullscreen list editor modal */}
      {showTableEditor && template === 'list' && (
        <ListEditorModal
          rows={rows}
          title={title || 'Lista'}
          onSave={(newRows) => {
            setRows(newRows);
            syncToParent(title, template, newRows);
            setShowTableEditor(false);
          }}
          onCancel={() => setShowTableEditor(false)}
        />
      )}
      
      {/* Fullscreen table editor modal - for all non-list, non-fusebox templates */}
      {showTableEditor && template !== 'list' && template !== 'fusebox' && (
        <SimpleTableEditorModal
          rows={(() => {
            // Convert legacy rows to new format if needed
            return rows.map(row => {
              if (row.col1 !== undefined) return row;
              let col1 = '';
              let col2 = '';
              if (template === 'tasks') {
                col1 = row.task || '';
                col2 = row.who || '';
              } else if (template === 'shopping') {
                col1 = row.item || '';
                col2 = row.qty?.toString() || '';
              } else if (template === 'contacts') {
                col1 = row.name || '';
                col2 = row.phone || '';
              } else {
                col1 = row.item || row.task || row.name || '';
                col2 = row.who || row.qty?.toString() || row.phone || '';
              }
              return { ...row, col1, col2, done: row.done || false };
            });
          })()}
          title={title || 'Tabell'}
          col2Type={col2Type}
          onSave={(newRows, newCol2Type) => {
            setRows(newRows);
            setCol2Type(newCol2Type);
            // Migrate to 'table' template when saving
            syncToParent(title, 'table', newRows, defaultCollapsed, viewerEditable, newCol2Type);
            setShowTableEditor(false);
          }}
          onCancel={() => setShowTableEditor(false)}
        />
      )}
      
      {/* Fullscreen multi-column editor for fusebox */}
      {showTableEditor && template === 'fusebox' && (
        <MultiColumnTableEditorModal
          rows={rows}
          title={title || 'Proppskåp'}
          columns={TABLE_TEMPLATES.fusebox.columns}
          useCollapse={true}
          onSave={(newRows) => {
            setRows(newRows);
            syncToParent(title, template, newRows);
            setShowTableEditor(false);
          }}
          onCancel={() => setShowTableEditor(false)}
        />
      )}
    </div>
  );
}

export { TableBlockEditor };
export default TableBlockEditor;
