import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowUp, ArrowDown, FileText, CheckSquare, ClipboardList, Link2, Plus, ChevronDown, Table2, Trash2, GripVertical, Calendar, Phone, Mail, Globe, Timer, Check, Maximize2, RotateCcw } from 'lucide-react';
import { getIconComponent, LINK_ICONS } from '../utils/iconHelpers';
import { TABLE_TEMPLATES } from './blocks';

// Fullscreen text editor for mobile - iOS Notes-like experience
function FullscreenTextEditor({ content, title, onSave, onCancel }) {
  const [text, setText] = useState(content || '');
  const textareaRef = useRef(null);
  const containerRef = useRef(null);
  const [availableHeight, setAvailableHeight] = useState(window.innerHeight - 104);
  const [viewportOffset, setViewportOffset] = useState(0);
  const scrollYRef = useRef(0);
  const rafRef = useRef(null);
  const lastValuesRef = useRef({ height: 0, offset: 0 });
  
  // Fixed heights
  const HEADER_HEIGHT = 48;
  const TOOLBAR_HEIGHT = 56;
  
  // Handle viewport changes (keyboard open/close)
  useEffect(() => {
    const viewport = window.visualViewport;
    
    const updateLayout = () => {
      // Cancel any pending RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      // Use RAF to batch updates and reduce jitter
      rafRef.current = requestAnimationFrame(() => {
        if (viewport) {
          const visibleHeight = viewport.height;
          const textareaHeight = visibleHeight - HEADER_HEIGHT - TOOLBAR_HEIGHT;
          const newHeight = Math.max(100, textareaHeight);
          const newOffset = viewport.offsetTop;
          
          // Only update if values changed significantly (reduce jitter)
          if (Math.abs(newHeight - lastValuesRef.current.height) > 2 ||
              Math.abs(newOffset - lastValuesRef.current.offset) > 2) {
            lastValuesRef.current = { height: newHeight, offset: newOffset };
            setAvailableHeight(newHeight);
            setViewportOffset(newOffset);
          }
        } else {
          setAvailableHeight(window.innerHeight - HEADER_HEIGHT - TOOLBAR_HEIGHT - 300);
          setViewportOffset(0);
        }
      });
    };
    
    if (viewport) {
      viewport.addEventListener('resize', updateLayout);
      viewport.addEventListener('scroll', updateLayout);
    }
    window.addEventListener('resize', updateLayout);
    
    // Initial calculation
    updateLayout();
    
    // Save scroll position and lock body scroll
    scrollYRef.current = window.scrollY;
    const scrollY = scrollYRef.current;
    
    // Set background color on html element to prevent white flash
    document.documentElement.style.backgroundColor = '#111827';
    document.body.style.backgroundColor = '#111827';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    
    // Focus textarea after a short delay to open keyboard
    setTimeout(() => {
      textareaRef.current?.focus();
      // Recalculate after keyboard opens
      setTimeout(updateLayout, 300);
    }, 150);
    
    return () => {
      // Restore
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
  
  // Markdown helper - wraps selected text or inserts at cursor
  const insertMarkdown = useCallback((prefix, suffix = prefix, placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);
    const textToWrap = selectedText || placeholder;
    
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newContent = before + prefix + textToWrap + suffix + after;
    
    setText(newContent);
    
    // Restore focus and selection after state update
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = selectedText 
        ? start + prefix.length + selectedText.length + suffix.length
        : start + prefix.length + placeholder.length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [text]);
  
  const insertLink = useCallback(() => {
    // Save selection before prompt steals focus
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart || 0;
    const end = textarea?.selectionEnd || 0;
    const selectedText = text.substring(start, end);
    
    const url = prompt('Ange URL:');
    if (url) {
      const linkText = selectedText || 'länktext';
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newContent = before + `[${linkText}](${url})` + after;
      setText(newContent);
      
      requestAnimationFrame(() => {
        textarea?.focus();
      });
    }
  }, [text]);
  
  const handleSave = () => {
    onSave(text);
  };
  
  const handleClear = useCallback(() => {
    if (text && confirm('Rensa all text?')) {
      setText('');
      textareaRef.current?.focus();
    }
  }, [text]);
  
  // Toolbar button - use onTouchStart to prevent keyboard dismissal
  const ToolbarButton = ({ onPress, children, title, variant }) => {
    const handlePress = (e) => {
      e.preventDefault(); // Prevent focus loss
      e.stopPropagation();
      onPress();
    };
    
    const baseClass = variant === 'danger' 
      ? 'w-8 h-8 rounded-md bg-white/5 active:bg-red-500/30 text-gray-500 active:text-red-400 flex items-center justify-center text-sm font-medium transition-colors touch-manipulation'
      : 'w-8 h-8 rounded-md bg-white/5 active:bg-white/20 text-gray-400 active:text-white flex items-center justify-center text-sm font-medium transition-colors touch-manipulation';
    
    return (
      <button
        type="button"
        onTouchStart={handlePress}
        onMouseDown={handlePress}
        className={baseClass}
        title={title}
      >
        {children}
      </button>
    );
  };
  
  return (
    <>
      {/* Full screen backdrop to prevent seeing through */}
      <div 
        className="fixed inset-0 z-[1999] bg-gray-900"
        onTouchMove={(e) => e.preventDefault()}
      />
      
      {/* Main editor container - positioned to visible viewport */}
      <div 
        ref={containerRef}
        className="fixed left-0 right-0 z-[2000] bg-gray-900 flex flex-col"
        style={{ 
          top: `${viewportOffset}px`,
          height: `${availableHeight + HEADER_HEIGHT + TOOLBAR_HEIGHT}px`
        }}
        onTouchMove={(e) => {
          // Only allow touchmove on the textarea
          if (e.target !== textareaRef.current) {
            e.preventDefault();
          }
        }}
      >
        {/* Header - fixed height */}
        <div 
          className="flex-shrink-0 flex items-center justify-between px-2 border-b border-white/10 bg-gray-900"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          <span className="text-sm text-gray-400 truncate flex-1 pl-2">
            {title || 'Anteckning'}
        </span>
        <button
          type="button"
          onTouchEnd={(e) => { e.preventDefault(); onCancel(); }}
          onClick={onCancel}
          className="w-12 h-12 flex items-center justify-center text-gray-400 active:text-white transition-colors touch-manipulation"
        >
          <X size={24} />
        </button>
      </div>
      
      {/* Markdown toolbar - fixed height */}
      <div 
        className="flex-shrink-0 px-3 py-2 border-b border-white/5 bg-gray-900"
        style={{ height: `${TOOLBAR_HEIGHT}px` }}
      >
        <div className="flex items-center gap-1">
          <ToolbarButton onPress={() => insertMarkdown('**', '**', 'text')} title="Fetstil">
            <span className="font-bold text-sm">B</span>
          </ToolbarButton>
          <ToolbarButton onPress={() => insertMarkdown('*', '*', 'text')} title="Kursiv">
            <span className="italic text-sm">I</span>
          </ToolbarButton>
          <ToolbarButton onPress={() => insertMarkdown('# ', '', 'Rubrik')} title="Rubrik">
            <span className="text-sm">H</span>
          </ToolbarButton>
          <ToolbarButton onPress={() => insertMarkdown('> ', '', 'citat')} title="Citat">
            <span className="text-sm">"</span>
          </ToolbarButton>
          <ToolbarButton onPress={() => insertMarkdown('- ', '', 'punkt')} title="Punktlista">
            <span className="text-sm">•</span>
          </ToolbarButton>
          <ToolbarButton onPress={() => insertMarkdown('1. ', '', 'punkt')} title="Numrerad lista">
            <span className="text-sm">1.</span>
          </ToolbarButton>
          <ToolbarButton onPress={insertLink} title="Länk">
            <Link2 size={16} />
          </ToolbarButton>
          <div className="flex-1" />
          <ToolbarButton onPress={handleClear} title="Rensa" variant="danger">
            <Trash2 size={16} />
          </ToolbarButton>
        </div>
      </div>
      
      {/* Textarea container with floating button */}
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Skriv text här..."
          className="absolute inset-0 w-full h-full px-4 py-3 bg-gray-900 text-white text-base placeholder-gray-600 focus:outline-none resize-none leading-relaxed overflow-auto"
          style={{ fontSize: '16px' }}
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck="true"
        />
        
        {/* Save button - absolute inside textarea area */}
        <button
          type="button"
          onTouchEnd={(e) => { e.preventDefault(); handleSave(); }}
          onClick={handleSave}
          className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:bg-blue-600 active:scale-95 transition-transform touch-manipulation flex items-center justify-center"
        >
          <Check size={24} />
        </button>
      </div>
      </div>
    </>
  );
}

// Contact block editor component
function ContactBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [phone, setPhone] = useState(block.phone || '');
  const [email, setEmail] = useState(block.email || '');
  const [website, setWebsite] = useState(block.website || '');

  // Use refs for blur handlers
  const phoneRef = React.useRef(phone);
  const emailRef = React.useRef(email);
  const websiteRef = React.useRef(website);
  phoneRef.current = phone;
  emailRef.current = email;
  websiteRef.current = website;

  const syncToParent = () => {
    onUpdate(block.id, { 
      phone: phoneRef.current, 
      email: emailRef.current, 
      website: websiteRef.current 
    });
  };

  return (
    <div className="rounded-xl border border-white/10 p-3 bg-white/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Phone size={16} className="text-green-400" /> Kontaktinfo
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
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-green-400 flex-shrink-0" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={syncToParent}
            placeholder="Telefonnummer"
            disabled={saving}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-blue-400 flex-shrink-0" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={syncToParent}
            placeholder="E-postadress"
            disabled={saving}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-purple-400 flex-shrink-0" />
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            onBlur={syncToParent}
            placeholder="Hemsida (t.ex. example.com)"
            disabled={saving}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>
    </div>
  );
}

// Links block editor component
function LinksBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title || '');
  const [links, setLinks] = useState(block.links || []);
  const [showIconPicker, setShowIconPicker] = useState(null); // index of link being edited

  // Use refs to always have latest values
  const titleRef = React.useRef(title);
  const linksRef = React.useRef(links);
  titleRef.current = title;
  linksRef.current = links;

  const syncToParent = (newTitle, newLinks) => {
    titleRef.current = newTitle;
    linksRef.current = newLinks;
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
    linksRef.current = newLinks;
  };

  const syncLink = (linkIndex) => {
    syncToParent(titleRef.current, linksRef.current);
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
                  onClick={(e) => { e.stopPropagation(); setShowIconPicker(showIconPicker === linkIndex ? null : linkIndex); }}
                  className="w-10 h-10 rounded-lg bg-purple-500/20 border border-white/10 flex items-center justify-center hover:bg-purple-500/30 transition-colors"
                  title="Välj ikon"
                >
                  <IconComponent size={18} className="text-purple-400" />
                </button>
                
                {/* Icon dropdown */}
                {showIconPicker === linkIndex && (
                  <>
                    {/* Backdrop to close on outside click */}
                    <div 
                      className="fixed inset-0 z-[100]" 
                      onClick={(e) => { e.stopPropagation(); setShowIconPicker(null); }}
                    />
                    <div 
                      className="absolute top-12 left-0 z-[101] bg-gray-800 border border-white/10 rounded-xl p-2 shadow-xl grid grid-cols-4 gap-1 w-48"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {LINK_ICONS.map(({ name, label }) => {
                        const Icon = getIconComponent(name);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); selectIcon(linkIndex, name); }}
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
                  </>
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
  // Use specialized editor for contact
  if (block.type === 'contact') {
    return (
      <ContactBlockEditor
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

  // Use specialized editor for date tags
  if (block.type === 'datetag') {
    return (
      <DateTagBlockEditor
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
  const [isFocused, setIsFocused] = useState(false);
  const [showFullscreenEditor, setShowFullscreenEditor] = useState(false);
  const textareaRef = React.useRef(null);
  
  // Detect mobile (simple check for touch device + small screen)
  const isMobile = typeof window !== 'undefined' && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0) && 
    window.innerWidth < 768;
  
  // Use refs to always have latest values for blur handlers
  const titleRef = React.useRef(title);
  const contentRef = React.useRef(content);
  titleRef.current = title;
  contentRef.current = content;
  
  const syncTitle = () => onUpdate(block.id, { title: titleRef.current });
  const syncContent = () => {
    setIsFocused(false);
    onUpdate(block.id, { content: contentRef.current });
  };
  
  // Handle fullscreen editor save
  const handleFullscreenSave = (newContent) => {
    setContent(newContent);
    contentRef.current = newContent;
    onUpdate(block.id, { content: newContent });
    setShowFullscreenEditor(false);
  };
  
  // Handle textarea click on mobile - open fullscreen for text blocks
  const handleTextareaClick = (e) => {
    if (isMobile && block.type === 'text') {
      e.preventDefault();
      e.target.blur();
      setShowFullscreenEditor(true);
    }
  };
  
  const handleClear = () => {
    setContent('');
    contentRef.current = '';
    onUpdate(block.id, { content: '' });
  };
  
  // Markdown helper - wraps selected text or inserts at cursor
  const insertMarkdown = (prefix, suffix = prefix, placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToWrap = selectedText || placeholder;
    
    const before = content.substring(0, start);
    const after = content.substring(end);
    const newContent = before + prefix + textToWrap + suffix + after;
    
    setContent(newContent);
    contentRef.current = newContent;
    
    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        // If text was selected, select the wrapped text
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + textToWrap.length);
      } else {
        // Place cursor after placeholder
        const cursorPos = start + prefix.length + textToWrap.length + suffix.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  };
  
  const insertLink = () => {
    const url = prompt('Ange URL:');
    if (url) {
      insertMarkdown('[', `](${url})`, 'länktext');
    }
  };
  
  const hasContent = content && content.trim().length > 0;
  
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
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={syncTitle}
        placeholder="Rubrik (valfritt)"
        disabled={saving}
        className="w-full px-3 py-2 mb-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />
      {/* Markdown toolbar - only for text blocks, hidden on mobile (uses fullscreen editor) */}
      {block.type === 'text' && !isMobile && (
        <div className="flex gap-1 mb-2">
          <button
            type="button"
            onClick={() => insertMarkdown('**', '**', 'text')}
            className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
            title="Fetstil (**text**)"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('*', '*', 'text')}
            className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center italic text-sm transition-colors"
            title="Kursiv (*text*)"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('# ', '', 'Rubrik')}
            className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-sm transition-colors"
            title="Rubrik (# Rubrik)"
          >
            H
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('> ', '', 'citat')}
            className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-sm transition-colors"
            title="Citat (> citat)"
          >
            "
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('- ', '', 'punkt')}
            className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-sm transition-colors"
            title="Punktlista (- punkt)"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('1. ', '', 'punkt')}
            className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-sm transition-colors"
            title="Numrerad lista (1. punkt)"
          >
            1.
          </button>
          <button
            type="button"
            onClick={insertLink}
            className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
            title="Länk ([text](url))"
          >
            <Link2 size={14} />
          </button>
          {/* Fullscreen button on mobile */}
          {isMobile && (
            <button
              type="button"
              onClick={() => setShowFullscreenEditor(true)}
              className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors ml-auto"
              title="Redigera i helskärm"
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onClick={handleTextareaClick}
          onFocus={() => !isMobile && setIsFocused(true)}
          onBlur={syncContent}
          placeholder={block.type === 'text' ? (isMobile ? 'Tryck för att redigera...' : 'Skriv text här...') : 'En per rad'}
          rows={isFocused ? 8 : 3}
          disabled={saving}
          readOnly={isMobile && block.type === 'text'}
          className={`w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none transition-all duration-200 ${isMobile && block.type === 'text' ? 'cursor-pointer' : ''}`}
        />
        {hasContent && !isMobile && (
          <button
            type="button"
            onClick={handleClear}
            disabled={saving}
            className="absolute bottom-2 right-2 px-2 py-1 rounded bg-white/10 text-gray-400 hover:bg-red-500/20 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
            title="Rensa innehåll"
          >
            <Trash2 size={12} /> Rensa
          </button>
        )}
      </div>
      
      {/* Fullscreen editor modal */}
      {showFullscreenEditor && (
        <FullscreenTextEditor
          content={content}
          title={title}
          onSave={handleFullscreenSave}
          onCancel={() => setShowFullscreenEditor(false)}
        />
      )}
    </div>
  );
}

// DateTag block editor component
function DateTagBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [tags, setTags] = useState(block.tags || []);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newRangeStart, setNewRangeStart] = useState('');
  const [newRangeEnd, setNewRangeEnd] = useState('');

  // Use ref to always have latest tags for sync
  const tagsRef = React.useRef(tags);
  tagsRef.current = tags;

  // Sync tags from block when it changes externally
  useEffect(() => {
    setTags(block.tags || []);
  }, [block.id]);

  const syncToParent = (newTags) => {
    tagsRef.current = newTags;
    onUpdate(block.id, { tags: newTags });
  };

  const addYearTag = () => {
    if (!newYear) return;
    const newTags = [...tags, { type: 'year', value: newYear }];
    setTags(newTags);
    syncToParent(newTags);
    setShowAddMenu(false);
    setNewYear(new Date().getFullYear().toString());
  };

  const addRangeTag = () => {
    if (!newRangeStart || !newRangeEnd) return;
    const newTags = [...tags, { type: 'range', start: newRangeStart, end: newRangeEnd }];
    setTags(newTags);
    syncToParent(newTags);
    setShowAddMenu(false);
    setNewRangeStart('');
    setNewRangeEnd('');
  };

  const removeTag = (tagIndex) => {
    const newTags = tags.filter((_, i) => i !== tagIndex);
    setTags(newTags);
    syncToParent(newTags);
  };

  const formatTag = (tag) => {
    if (tag.type === 'year') {
      return tag.value;
    } else if (tag.type === 'range') {
      const start = new Date(tag.start);
      const end = new Date(tag.end);
      const formatDate = (d) => d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      return `${formatDate(start)} – ${formatDate(end)}`;
    }
    return '';
  };

  return (
    <div className="rounded-xl border border-white/10 p-3 bg-white/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Calendar size={16} className="text-cyan-400" /> Datum
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

      {/* Existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag, i) => (
            <div 
              key={i}
              className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-sm ${
                tag.type === 'year' 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              }`}
            >
              <span>{formatTag(tag)}</span>
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button / menu */}
      {!showAddMenu ? (
        <button
          type="button"
          onClick={() => setShowAddMenu(true)}
          disabled={saving}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-dashed border-white/20 text-gray-400 hover:bg-white/10 hover:text-gray-300 text-sm w-full justify-center"
        >
          <Plus size={14} />
          Lägg till datum
        </button>
      ) : (
        <div className="space-y-3 p-3 bg-white/5 rounded-lg border border-white/10">
          {/* Year option */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">År (t.ex. besöksår)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                placeholder="2025"
                min="1900"
                max="2100"
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addYearTag}
                className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-sm"
              >
                Lägg till
              </button>
            </div>
          </div>
          
          {/* Date range option */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Datumperiod (t.ex. event)</label>
            <div className="flex gap-2 flex-wrap">
              <input
                type="date"
                value={newRangeStart}
                onChange={(e) => setNewRangeStart(e.target.value)}
                className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:border-purple-500"
              />
              <span className="text-gray-500 self-center">→</span>
              <input
                type="date"
                value={newRangeEnd}
                onChange={(e) => setNewRangeEnd(e.target.value)}
                className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={addRangeTag}
                disabled={!newRangeStart || !newRangeEnd}
                className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-sm disabled:opacity-50"
              >
                Lägg till
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddMenu(false)}
            className="text-sm text-gray-500 hover:text-gray-400"
          >
            Avbryt
          </button>
        </div>
      )}
    </div>
  );
}

// Timer block editor component
function TimerBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [timers, setTimers] = useState(block.timers || []);
  const [newLabel, setNewLabel] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const containerRef = React.useRef(null);

  // Sync timers state when block changes (e.g., after move)
  React.useEffect(() => {
    setTimers(block.timers || []);
  }, [block.id, block.timers]);

  // Prevent iOS scroll-to-top on input focus
  const handleInputFocus = (e) => {
    // Find scrollable parent and save its scroll position
    const scrollParent = e.target.closest('.overflow-y-auto');
    if (scrollParent) {
      const scrollTop = scrollParent.scrollTop;
      // Restore scroll position after iOS does its thing
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollParent.scrollTop !== scrollTop) {
            scrollParent.scrollTop = scrollTop;
          }
        });
      });
    }
  };

  const syncToParent = (newTimers) => {
    onUpdate(block.id, { timers: newTimers });
  };

  const addTimer = () => {
    // Support both . and , as decimal separator
    const normalizedDuration = newDuration.replace(',', '.');
    const duration = parseFloat(normalizedDuration);
    if (!newLabel.trim() || isNaN(duration) || duration <= 0) return;
    
    const updated = [...timers, { label: newLabel.trim(), duration }];
    setTimers(updated);
    syncToParent(updated);
    setNewLabel('');
    setNewDuration('');
  };

  const removeTimer = (timerIndex) => {
    const updated = timers.filter((_, i) => i !== timerIndex);
    setTimers(updated);
    syncToParent(updated);
  };

  return (
    <div className="rounded-xl border border-white/10 p-3 bg-white/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Timer size={16} className="text-orange-400" /> Timers
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

      {/* Existing timers */}
      {timers.length > 0 && (
        <div className="space-y-2 mb-3">
          {timers.map((timer, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
              <Timer size={14} className="text-orange-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-white truncate">{timer.label}</span>
              <span className="text-sm text-gray-400">{timer.duration % 1 === 0 ? timer.duration : timer.duration.toFixed(1)} min</span>
              <button
                type="button"
                onClick={() => removeTimer(i)}
                className="w-6 h-6 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new timer */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onFocus={handleInputFocus}
          placeholder="Namn"
          disabled={saving}
          autoComplete="off"
          autoCorrect="off"
          className="w-0 flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
        <input
          type="text"
          inputMode="decimal"
          value={newDuration}
          onChange={(e) => setNewDuration(e.target.value)}
          onFocus={handleInputFocus}
          placeholder="Min"
          disabled={saving}
          autoComplete="off"
          className="w-16 flex-shrink-0 px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-orange-500 text-center"
        />
        <button
          type="button"
          onClick={addTimer}
          disabled={saving || !newLabel.trim() || !newDuration}
          className="w-10 h-10 flex-shrink-0 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 disabled:opacity-50 transition-colors flex items-center justify-center"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

export { DateTagBlockEditor, TimerBlockEditor };

export default BlockEditor;
