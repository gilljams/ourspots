import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, FileText, CheckSquare, ClipboardList, Link2, Plus, ChevronDown, Table2, Trash2, GripVertical } from 'lucide-react';
import { getIconComponent, LINK_ICONS } from '../utils/iconHelpers';
import { TABLE_TEMPLATES } from './blocks';

// Links block editor component
function LinksBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title || '');
  const [links, setLinks] = useState(block.links || []);
  const [showIconPicker, setShowIconPicker] = useState(null); // index of link being edited

  const syncToParent = (newTitle, newLinks) => {
    onUpdate(block.id, { title: newTitle, links: newLinks });
  };

  const addLink = () => {
    const newLinks = [...links, { title: '', url: '', icon: 'Link' }];
    setLinks(newLinks);
    syncToParent(title, newLinks);
  };

  const updateLink = (linkIndex, field, value) => {
    const newLinks = links.map((link, i) => 
      i === linkIndex ? { ...link, [field]: value } : link
    );
    setLinks(newLinks);
  };

  const syncLink = (linkIndex) => {
    syncToParent(title, links);
  };

  const removeLink = (linkIndex) => {
    const newLinks = links.filter((_, i) => i !== linkIndex);
    setLinks(newLinks);
    syncToParent(title, newLinks);
  };

  const selectIcon = (linkIndex, iconName) => {
    const newLinks = links.map((link, i) => 
      i === linkIndex ? { ...link, icon: iconName } : link
    );
    setLinks(newLinks);
    setShowIconPicker(null);
    syncToParent(title, newLinks);
  };

  return (
    <div className="rounded-xl border border-white/10 p-3 bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Link2 size={16} className="text-purple-400" /> Länkar
        </span>
        <div className="flex gap-1">
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

      {/* Optional title for the links block */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => syncToParent(title, links)}
        placeholder="Rubrik (valfritt)"
        disabled={saving}
        className="w-full px-3 py-2 mb-3 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-purple-500"
      />

      {/* Links list */}
      <div className="space-y-2">
        {links.map((link, linkIndex) => {
          const IconComponent = getIconComponent(link.icon || 'Link');
          return (
            <div key={linkIndex} className="flex gap-2 items-start">
              {/* Icon picker button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(showIconPicker === linkIndex ? null : linkIndex)}
                  className="w-10 h-10 rounded-lg bg-purple-500/20 border border-white/10 flex items-center justify-center hover:bg-purple-500/30 transition-colors"
                  title="Välj ikon"
                >
                  <IconComponent size={18} className="text-purple-400" />
                </button>
                
                {/* Icon dropdown */}
                {showIconPicker === linkIndex && (
                  <div className="absolute top-12 left-0 z-50 bg-gray-800 border border-white/10 rounded-xl p-2 shadow-xl grid grid-cols-4 gap-1 w-48">
                    {LINK_ICONS.map(({ name, label }) => {
                      const Icon = getIconComponent(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => selectIcon(linkIndex, name)}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            link.icon === name ? 'bg-purple-500/30 text-purple-300' : 'hover:bg-white/10 text-gray-400'
                          }`}
                          title={label}
                        >
                          <Icon size={18} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Title and URL inputs */}
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={link.title}
                  onChange={(e) => updateLink(linkIndex, 'title', e.target.value)}
                  onBlur={() => syncLink(linkIndex)}
                  placeholder="Länktext (t.ex. Boka bord)"
                  disabled={saving}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(linkIndex, 'url', e.target.value)}
                  onBlur={() => syncLink(linkIndex)}
                  placeholder="https://..."
                  disabled={saving}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Remove link button */}
              <button
                type="button"
                onClick={() => removeLink(linkIndex)}
                disabled={saving}
                className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add link button */}
      <button
        type="button"
        onClick={addLink}
        disabled={saving}
        className="w-full mt-3 px-3 py-2 rounded-lg border border-dashed border-white/20 text-gray-400 hover:border-purple-400 hover:text-purple-400 text-sm flex items-center justify-center gap-2 transition-colors"
      >
        <Plus size={16} /> Lägg till länk
      </button>
    </div>
  );
}

// Table block editor component
function TableBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title || '');
  const [template, setTemplate] = useState(block.template || 'tasks');
  const [rows, setRows] = useState(block.rows || []);
  
  const currentTemplate = TABLE_TEMPLATES[template];
  const columns = currentTemplate?.columns || [];

  const syncToParent = (newTitle, newTemplate, newRows) => {
    onUpdate(block.id, { 
      title: newTitle, 
      template: newTemplate, 
      rows: newRows,
      columns: TABLE_TEMPLATES[newTemplate]?.columns || []
    });
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

  const addRow = () => {
    const newRow = { id: Math.random().toString(36).substr(2, 9) };
    columns.forEach(col => {
      newRow[col.id] = col.type === 'checkbox' ? false : '';
    });
    const newRows = [...rows, newRow];
    setRows(newRows);
    syncToParent(title, template, newRows);
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

  const toggleCheckbox = (rowIndex, colId) => {
    const newRows = rows.map((row, i) => 
      i === rowIndex ? { ...row, [colId]: !row[colId] } : row
    );
    setRows(newRows);
    syncToParent(title, template, newRows);
  };

  return (
    <div className="rounded-xl border border-white/10 p-3 bg-white/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Table2 size={16} className="text-amber-400" /> Tabell
        </span>
        <div className="flex gap-1">
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

      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => syncToParent(title, template, rows)}
        placeholder="Rubrik (valfritt)"
        disabled={saving}
        className="w-full px-3 py-2 mb-3 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-amber-500"
      />

      {/* Template selector */}
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-2">Välj tabelltyp</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(TABLE_TEMPLATES).map(t => {
            const Icon = getIconComponent(t.icon);
            const isSelected = template === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTemplateChange(t.id)}
                disabled={saving}
                className={`p-2 rounded-lg border transition-colors text-center ${
                  isSelected 
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300' 
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <Icon size={16} className="mx-auto mb-1" />
                <div className="text-[10px] truncate">{t.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table rows editor */}
      {columns.length > 0 && (
        <div className="space-y-2">
          {/* Header */}
          <div className="flex gap-1 text-xs text-gray-500 px-1">
            {columns.map(col => (
              <div key={col.id} className={`${col.width} ${col.type === 'checkbox' ? 'text-center' : ''}`}>
                {col.label}
              </div>
            ))}
            <div className="w-8"></div>
          </div>

          {/* Rows */}
          {rows.map((row, rowIndex) => (
            <div key={row.id} className="flex gap-1 items-center">
              {columns.map(col => (
                <div key={col.id} className={col.width}>
                    {col.type === 'checkbox' ? (
                      <button
                        type="button"
                        onClick={() => toggleCheckbox(rowIndex, col.id)}
                        className="w-full flex justify-center"
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          row[col.id] ? 'bg-amber-500 border-amber-500' : 'border-gray-600 hover:border-amber-400'
                        }`}>
                          {row[col.id] && <span className="text-white text-xs">✓</span>}
                        </div>
                      </button>
                    ) : col.type === 'number' ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={row[col.id] || ''}
                        onChange={(e) => updateCell(rowIndex, col.id, e.target.value)}
                        onBlur={syncRowsOnBlur}
                        disabled={saving}
                        className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-base text-right focus:outline-none focus:border-amber-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={row[col.id] || ''}
                        onChange={(e) => updateCell(rowIndex, col.id, e.target.value)}
                        onBlur={syncRowsOnBlur}
                        disabled={saving}
                        className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:border-amber-500"
                      />
                    )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => removeRow(rowIndex)}
                disabled={saving}
                className="w-8 h-8 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Add row button */}
          <button
            type="button"
            onClick={addRow}
            disabled={saving}
            className="w-full mt-2 px-3 py-2 rounded-lg border border-dashed border-white/20 text-gray-400 hover:border-amber-400 hover:text-amber-400 text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={16} /> Lägg till rad
          </button>
        </div>
      )}
    </div>
  );
}

// Simple block editor with local state to avoid parent re-renders on each keystroke
function BlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  // Use specialized editor for links
  if (block.type === 'links') {
    return (
      <LinksBlockEditor
        block={block}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMove={onMove}
        index={index}
        total={total}
        saving={saving}
      />
    );
  }

  // Use specialized editor for tables
  if (block.type === 'table') {
    return (
      <TableBlockEditor
        block={block}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMove={onMove}
        index={index}
        total={total}
        saving={saving}
      />
    );
  }

  const [title, setTitle] = useState(block.title);
  const [content, setContent] = useState(block.content);
  
  const syncTitle = () => onUpdate(block.id, { title });
  const syncContent = () => onUpdate(block.id, { content });
  
  return (
    <div className="rounded-xl border border-white/10 p-3 bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
          {block.type === 'text' && <><FileText size={16} className="text-blue-400" /> Anteckning</>}
          {block.type === 'checklist' && <><CheckSquare size={16} className="text-green-400" /> Checklista</>}
          {block.type === 'todo' && <><ClipboardList size={16} className="text-amber-400" /> Att göra</>}
        </span>
        <div className="flex gap-1">
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
      <input
        type="text"
        defaultValue={block.title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={syncTitle}
        placeholder="Rubrik (valfritt)"
        disabled={saving}
        className="w-full px-3 py-2 mb-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />
      <textarea
        defaultValue={block.content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={syncContent}
        placeholder={block.type === 'text' ? 'Skriv text här...' : 'En per rad'}
        rows={3}
        disabled={saving}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
      />
    </div>
  );
}

export default BlockEditor;
