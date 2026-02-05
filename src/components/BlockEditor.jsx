import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowUp, ArrowDown, FileText, CheckSquare, ClipboardList, Link2, Plus, ChevronDown, Table2, Trash2, GripVertical, Calendar, Phone, Mail, Globe, Timer, Check, Maximize2, RotateCcw, BarChart3, Type, Music, Wallet, Users, Trophy, Minus } from 'lucide-react';
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
  const [showIconPicker, setShowIconPicker] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? true);

  // Use refs to always have latest values
  const titleRef = React.useRef(title);
  const linksRef = React.useRef(links);
  const defaultCollapsedRef = React.useRef(defaultCollapsed);
  titleRef.current = title;
  linksRef.current = links;
  defaultCollapsedRef.current = defaultCollapsed;

  // Prevent iOS scroll-to-top on input focus
  const handleInputFocus = (e) => {
    const scrollParent = e.target.closest('.overflow-y-auto');
    if (scrollParent) {
      const scrollTop = scrollParent.scrollTop;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollParent.scrollTop !== scrollTop) {
            scrollParent.scrollTop = scrollTop;
          }
        });
      });
    }
  };

  const syncToParent = (newTitle, newLinks, newDefaultCollapsed = defaultCollapsedRef.current) => {
    titleRef.current = newTitle;
    linksRef.current = newLinks;
    defaultCollapsedRef.current = newDefaultCollapsed;
    onUpdate(block.id, { title: newTitle, links: newLinks, defaultCollapsed: newDefaultCollapsed });
  };
  
  const handleDefaultCollapsedChange = (newValue) => {
    setDefaultCollapsed(newValue);
    defaultCollapsedRef.current = newValue;
    onUpdate(block.id, { defaultCollapsed: newValue });
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
          <Link2 size={16} className="text-purple-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            {title || 'Länkar'}
          </span>
          {links.length > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">({links.length})</span>
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
          {/* Optional title for the links block */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => syncToParent(title, links)}
            onFocus={handleInputFocus}
            placeholder="Rubrik (valfritt)"
            disabled={saving}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-purple-500"
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
                      onFocus={handleInputFocus}
                      placeholder="Länktext (t.ex. Boka bord)"
                      disabled={saving}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateLink(linkIndex, 'url', e.target.value)}
                      onBlur={() => syncLink(linkIndex)}
                      onFocus={handleInputFocus}
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
            className="w-full px-3 py-2 rounded-lg border border-dashed border-white/20 text-gray-400 hover:border-purple-400 hover:text-purple-400 text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={16} /> Lägg till länk
          </button>
          
          {/* Default collapsed toggle - only show if more than 1 link */}
          {links.length > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
              <span className="text-sm text-gray-400">Ihopfälld som standard</span>
              <button
                type="button"
                onClick={() => handleDefaultCollapsedChange(!defaultCollapsed)}
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  defaultCollapsed ? 'bg-purple-500' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  defaultCollapsed ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Table block editor component
function TableBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title || '');
  const [template, setTemplate] = useState(block.template || 'tasks');
  const [rows, setRows] = useState(block.rows || []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? false);
  
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

  const syncToParent = (newTitle, newTemplate, newRows, newDefaultCollapsed = defaultCollapsed) => {
    onUpdate(block.id, { 
      title: newTitle, 
      template: newTemplate, 
      rows: newRows,
      columns: TABLE_TEMPLATES[newTemplate]?.columns || [],
      defaultCollapsed: newDefaultCollapsed
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
          <Icon size={16} className="text-amber-400 flex-shrink-0" />
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
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => syncToParent(title, template, rows)}
            placeholder="Rubrik (valfritt)"
            disabled={saving}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />

          {/* Template selector - hide when 'list' is selected */}
          {template !== 'list' && (
            <div>
              <label className="block text-xs text-gray-500 mb-2">Välj tabelltyp</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.values(TABLE_TEMPLATES).map(t => {
                  const TIcon = getIconComponent(t.icon);
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
                      <TIcon size={16} className="mx-auto mb-1" />
                      <div className="text-[10px] truncate">{t.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Default collapsed toggle */}
          <div className="flex items-center justify-between py-2 px-1">
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
                defaultCollapsed ? 'bg-amber-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                defaultCollapsed ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Table rows editor */}
          {editorColumns.length > 0 && (
            <div className="space-y-2">
              {/* Header - only show if there are columns to show */}
              {editorColumns.length > 0 && !currentTemplate?.hideHeader && (
                <div className="flex gap-1 text-xs text-gray-500 px-1">
                  {editorColumns.map(col => (
                    <div key={col.id} className={`${col.width} ${col.type === 'checkbox' ? 'text-center' : ''}`}>
                      {col.label}
                    </div>
                  ))}
                  <div className="w-20"></div>
                </div>
              )}

              {/* Rows */}
              {rows.map((row, rowIndex) => (
                row.isHeader ? (
                  // Header row editor - full width, distinct styling
                  <div key={row.id} className="flex gap-1 items-center bg-amber-500/10 rounded-lg p-1">
                    <input
                      type="text"
                      value={row.item || ''}
                      onChange={(e) => updateCell(rowIndex, 'item', e.target.value)}
                      onBlur={syncRowsOnBlur}
                      onPaste={handlePaste}
                      placeholder="Rubrik..."
                      disabled={saving}
                      className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-amber-300 text-sm font-medium focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => moveRow(rowIndex, -1)}
                      disabled={saving || rowIndex === 0}
                      className="w-6 h-6 rounded bg-white/5 text-gray-500 hover:bg-white/10 flex items-center justify-center disabled:opacity-30"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(rowIndex, 1)}
                      disabled={saving || rowIndex === rows.length - 1}
                      className="w-6 h-6 rounded bg-white/5 text-gray-500 hover:bg-white/10 flex items-center justify-center disabled:opacity-30"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(rowIndex)}
                      disabled={saving}
                      className="w-6 h-6 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  // Regular row editor
                  <div key={row.id} className="flex gap-1 items-center">
                    {editorColumns.map(col => (
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
                              ref={el => inputRefs.current[`${rowIndex}-${col.id}`] = el}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={row[col.id] || ''}
                              onChange={(e) => updateCell(rowIndex, col.id, e.target.value)}
                              onBlur={syncRowsOnBlur}
                              onKeyDown={(e) => handleKeyDown(e, rowIndex, col.id)}
                              disabled={saving}
                              className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-base text-right focus:outline-none focus:border-amber-500"
                            />
                          ) : (
                            <input
                              ref={el => inputRefs.current[`${rowIndex}-${col.id}`] = el}
                              type="text"
                              value={row[col.id] || ''}
                              onChange={(e) => updateCell(rowIndex, col.id, e.target.value)}
                              onBlur={syncRowsOnBlur}
                              onPaste={handlePaste}
                              onKeyDown={(e) => handleKeyDown(e, rowIndex, col.id)}
                              disabled={saving}
                              className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:border-amber-500"
                            />
                          )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => moveRow(rowIndex, -1)}
                      disabled={saving || rowIndex === 0}
                      className="w-6 h-6 rounded bg-white/5 text-gray-500 hover:bg-white/10 flex items-center justify-center disabled:opacity-30"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(rowIndex, 1)}
                      disabled={saving || rowIndex === rows.length - 1}
                      className="w-6 h-6 rounded bg-white/5 text-gray-500 hover:bg-white/10 flex items-center justify-center disabled:opacity-30"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(rowIndex)}
                      disabled={saving}
                      className="w-6 h-6 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              ))}

              {/* Add row buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => addRow(false)}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg border border-dashed border-white/20 text-gray-400 hover:border-amber-400 hover:text-amber-400 text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={16} /> Rad
                </button>
                <button
                  type="button"
                  onClick={() => addRow(true)}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg border border-dashed border-white/20 text-gray-400 hover:border-amber-400 hover:text-amber-400 text-sm flex items-center justify-center gap-2 transition-colors"
                  title="Lägg till en rubrikrad för att gruppera punkter"
                >
                  <Plus size={16} /> Rubrik
                </button>
              </div>
              
              {/* Reset checkboxes button - only show for templates with checkboxes */}
              {columns.some(col => col.type === 'checkbox') && rows.some(row => !row.isHeader && row.checked) && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Vill du avbocka alla checkboxar? Detta kan inte ångras.')) {
                      const resetRows = rows.map(row => row.isHeader ? row : { ...row, checked: false });
                      setRows(resetRows);
                      syncToParent(title, template, resetRows);
                    }
                  }}
                  disabled={saving}
                  className="w-full py-2 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg border border-amber-500/20 transition-colors"
                >
                  Avbocka alla ({rows.filter(r => !r.isHeader && r.checked).length} av {rows.filter(r => !r.isHeader).length})
                </button>
              )}
              
              {/* Hint */}
              <p className="text-xs text-gray-600 text-center">
                Tips: Enter = ny rad • Ctrl+V = klistra in flera
              </p>
            </div>
          )}
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
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? false);
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
  const defaultCollapsedRef = React.useRef(defaultCollapsed);
  titleRef.current = title;
  contentRef.current = content;
  defaultCollapsedRef.current = defaultCollapsed;
  
  const syncTitle = () => onUpdate(block.id, { title: titleRef.current, defaultCollapsed: defaultCollapsedRef.current });
  const syncContent = () => {
    setIsFocused(false);
    onUpdate(block.id, { content: contentRef.current, defaultCollapsed: defaultCollapsedRef.current });
  };
  
  const handleDefaultCollapsedChange = (newValue) => {
    setDefaultCollapsed(newValue);
    defaultCollapsedRef.current = newValue;
    onUpdate(block.id, { defaultCollapsed: newValue });
  };
  
  // Handle fullscreen editor save
  const handleFullscreenSave = (newContent) => {
    setContent(newContent);
    contentRef.current = newContent;
    onUpdate(block.id, { content: newContent, defaultCollapsed: defaultCollapsedRef.current });
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
      
      {/* Default collapsed toggle - only for text blocks */}
      {block.type === 'text' && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
          <span className="text-sm text-gray-400">Ihopfälld som standard</span>
          <button
            type="button"
            onClick={() => handleDefaultCollapsedChange(!defaultCollapsed)}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              defaultCollapsed ? 'bg-blue-500' : 'bg-gray-600'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              defaultCollapsed ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      )}
      
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

// Section block editor component - simple title separator
function SectionBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title || 'Sektion');
  const [uppercase, setUppercase] = useState(block.uppercase !== false);
  const [isExpanded, setIsExpanded] = useState(false);

  const titleRef = React.useRef(title);
  titleRef.current = title;

  const syncTitle = () => {
    onUpdate(block.id, { title: titleRef.current, uppercase });
  };

  const handleUppercaseChange = (newValue) => {
    setUppercase(newValue);
    onUpdate(block.id, { title: titleRef.current, uppercase: newValue });
  };

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
          <Minus size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            Sektion: {title}
          </span>
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
            <label className="block text-xs text-gray-500 mb-1">Rubrik</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={syncTitle}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="Sektionsrubrik..."
            />
          </div>

          {/* Uppercase toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Versaler</span>
            <button
              type="button"
              onClick={() => handleUppercaseChange(!uppercase)}
              className={`relative w-10 h-5 rounded-full transition-colors ${uppercase ? 'bg-blue-500' : 'bg-white/20'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${uppercase ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Preview */}
          <div className="pt-2 border-t border-white/10">
            <label className="block text-xs text-gray-500 mb-2">Förhandsgranskning</label>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-blue-500/50" />
              <span className={`text-sm font-semibold text-blue-400 tracking-wide ${uppercase ? 'uppercase' : ''}`}>
                {title || 'Sektion'}
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-blue-500/30 to-blue-500/50" />
            </div>
          </div>
        </div>
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
  const [isExpanded, setIsExpanded] = useState(false);

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
          <Calendar size={16} className="text-cyan-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            Datum
          </span>
          {tags.length > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">({tags.length} st)</span>
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
          {/* Existing tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
      )}
    </div>
  );
}

// Timer block editor component
function TimerBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [timers, setTimers] = useState(block.timers || []);
  const [newLabel, setNewLabel] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = React.useRef(null);

  // Sync timers state when block changes (e.g., after move)
  React.useEffect(() => {
    setTimers(block.timers || []);
  }, [block.id, block.timers]);

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
          <Timer size={16} className="text-orange-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            Timers
          </span>
          {timers.length > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">({timers.length} st)</span>
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
          {/* Existing timers */}
          {timers.length > 0 && (
            <div className="space-y-2">
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
      )}
    </div>
  );
}

// Poll block editor component - for admin to create poll options
function PollBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title || '');
  const [pollType, setPollType] = useState(block.pollType || 'date');
  const [options, setOptions] = useState(block.options || []);
  const [allowSuggestions, setAllowSuggestions] = useState(block.allowSuggestions || false);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? false);
  const [newOption, setNewOption] = useState('');
  const [newOptionUrl, setNewOptionUrl] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Use refs to always have latest values
  const titleRef = React.useRef(title);
  const optionsRef = React.useRef(options);
  const pollTypeRef = React.useRef(pollType);
  titleRef.current = title;
  optionsRef.current = options;
  pollTypeRef.current = pollType;

  const syncToParent = (newTitle, newOptions, newVotes = block.votes || {}, newPollType = pollType, newClosed = block.closed || false, newAllowSuggestions = allowSuggestions, newDefaultCollapsed = defaultCollapsed) => {
    titleRef.current = newTitle;
    optionsRef.current = newOptions;
    pollTypeRef.current = newPollType;
    onUpdate(block.id, { title: newTitle, options: newOptions, votes: newVotes, pollType: newPollType, closed: newClosed, allowSuggestions: newAllowSuggestions, defaultCollapsed: newDefaultCollapsed });
  };

  const handleDefaultCollapsedChange = (value) => {
    setDefaultCollapsed(value);
    syncToParent(title, options, block.votes || {}, pollType, block.closed || false, allowSuggestions, value);
  };

  const handleAllowSuggestionsChange = (value) => {
    setAllowSuggestions(value);
    syncToParent(title, options, block.votes || {}, pollType, block.closed || false, value);
  };

  const resetVotes = () => {
    if (window.confirm('Vill du nollställa alla röster? Detta kan inte ångras.')) {
      syncToParent(title, options, {}, pollType, false);
    }
  };

  const handlePollTypeChange = (newType) => {
    if (voteCount > 0) {
      if (!window.confirm('Att byta typ nollställer alla röster. Fortsätta?')) {
        return;
      }
    }
    setPollType(newType);
    // Reset votes when changing type as vote formats differ
    syncToParent(title, options, {}, newType, false);
  };

  const voteCount = Object.keys(block.votes || {}).length;

  const addOption = () => {
    if (!newOption.trim()) return;
    const newOpt = {
      id: Math.random().toString(36).substr(2, 9),
      label: newOption.trim(),
      ...(pollType === 'ranked' && newOptionUrl.trim() ? { url: newOptionUrl.trim() } : {})
    };
    const newOptions = [...options, newOpt];
    setOptions(newOptions);
    setNewOption('');
    setNewOptionUrl('');
    syncToParent(title, newOptions);
    
    // Focus back on new option input after adding
    setTimeout(() => {
      const input = document.querySelector('[data-poll-new-option]');
      if (input) input.focus();
    }, 10);
  };
  
  // Handle Enter key navigation like in table blocks
  const handleOptionKeyDown = (e, optionId, field) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    
    const optionIndex = options.findIndex(opt => opt.id === optionId);
    const isLastOption = optionIndex === options.length - 1;
    
    if (pollType === 'ranked') {
      // For ranked polls: label -> url -> next label (or add new)
      if (field === 'label') {
        // Go to URL field for this option
        const urlInput = document.querySelector(`[data-poll-url="${optionId}"]`);
        if (urlInput) urlInput.focus();
      } else if (field === 'url') {
        // Go to next option's label, or focus new option input
        if (isLastOption) {
          const newInput = document.querySelector('[data-poll-new-option]');
          if (newInput) newInput.focus();
        } else {
          const nextLabel = document.querySelector(`[data-poll-label="${options[optionIndex + 1].id}"]`);
          if (nextLabel) nextLabel.focus();
        }
      }
    } else {
      // For date polls: label -> next label (or add new)
      if (isLastOption) {
        const newInput = document.querySelector('[data-poll-new-option]');
        if (newInput) newInput.focus();
      } else {
        const nextLabel = document.querySelector(`[data-poll-label="${options[optionIndex + 1].id}"]`);
        if (nextLabel) nextLabel.focus();
      }
    }
  };
  
  const handleNewOptionKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    
    if (pollType === 'ranked' && newOption.trim()) {
      // Go to URL field first
      const urlInput = document.querySelector('[data-poll-new-url]');
      if (urlInput) urlInput.focus();
    } else if (newOption.trim()) {
      // Add option and stay on new option input
      addOption();
    }
  };
  
  const handleNewUrlKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    
    if (newOption.trim()) {
      addOption();
    }
  };

  const updateOption = (optionId, updates) => {
    const newOptions = options.map(opt => 
      opt.id === optionId ? { ...opt, ...updates } : opt
    );
    setOptions(newOptions);
    optionsRef.current = newOptions;
  };

  const syncOption = () => {
    syncToParent(titleRef.current, optionsRef.current);
  };

  const removeOption = (optionId) => {
    const newOptions = options.filter(opt => opt.id !== optionId);
    setOptions(newOptions);
    syncToParent(title, newOptions);
  };

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
          <BarChart3 size={16} className="text-indigo-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            {title || 'Omröstning'}
          </span>
          {options.length > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">({options.length} alt)</span>
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
          {/* Poll type selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handlePollTypeChange('date')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                pollType === 'date' 
                  ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              📅 Datum/tid
            </button>
            <button
              type="button"
              onClick={() => handlePollTypeChange('ranked')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                pollType === 'ranked' 
                  ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              🏆 Rankning
            </button>
          </div>
          
          {/* Poll title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => syncToParent(title, options)}
            placeholder={pollType === 'ranked' ? "Fråga (t.ex. 'Bästa pizzerian?')" : "Fråga (t.ex. 'När passar helgen?')"}
            disabled={saving}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />

          {/* Options list */}
          {options.length > 0 && (
            <div className="space-y-2">
              {options.map((option, i) => (
                <div key={option.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm w-5">{i + 1}.</span>
                    <input
                      type="text"
                      data-poll-label={option.id}
                      value={option.label}
                      onChange={(e) => updateOption(option.id, { label: e.target.value })}
                      onBlur={syncOption}
                      onKeyDown={(e) => handleOptionKeyDown(e, option.id, 'label')}
                      disabled={saving}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(option.id)}
                      className="w-8 h-8 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {/* URL field for ranked polls */}
                  {pollType === 'ranked' && (
                    <div className="flex items-center gap-2 ml-7">
                      <input
                        type="url"
                        data-poll-url={option.id}
                        value={option.url || ''}
                        onChange={(e) => updateOption(option.id, { url: e.target.value })}
                        onBlur={syncOption}
                        onKeyDown={(e) => handleOptionKeyDown(e, option.id, 'url')}
                        placeholder="Länk (valfritt)"
                        disabled={saving}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-blue-400 text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new option */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm w-5">{options.length + 1}.</span>
              <input
                type="text"
                data-poll-new-option
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={handleNewOptionKeyDown}
                placeholder={pollType === 'ranked' ? "Nytt alternativ (t.ex. 'Pizzeria X')" : "Nytt alternativ (t.ex. '1-3 maj')"}
                disabled={saving}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={addOption}
                disabled={saving || !newOption.trim()}
                className="w-8 h-8 flex-shrink-0 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                <Plus size={18} />
              </button>
            </div>
            {/* URL field for new option in ranked polls */}
            {pollType === 'ranked' && (
              <div className="flex items-center gap-2 ml-7">
                <input
                  type="url"
                  data-poll-new-url
                  value={newOptionUrl}
                  onChange={(e) => setNewOptionUrl(e.target.value)}
                  onKeyDown={handleNewUrlKeyDown}
                  placeholder="Länk (valfritt)"
                  disabled={saving}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-blue-400 text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Instructions + Reset button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {pollType === 'ranked' 
                ? 'Deltagare röstar 🥇🥈🥉 (3p, 2p, 1p)' 
                : 'Deltagare kan rösta Ja/Nej/Kanske'}
            </p>
            {voteCount > 0 && (
              <button
                type="button"
                onClick={resetVotes}
                className="text-xs text-red-400 hover:text-red-300 hover:underline"
              >
                Nollställ ({voteCount})
              </button>
            )}
          </div>

          {/* Allow suggestions toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div>
              <span className="text-sm text-white">Tillåt förslag</span>
              <p className="text-xs text-gray-500">Viewers kan lägga till alternativ</p>
            </div>
            <button
              type="button"
              onClick={() => handleAllowSuggestionsChange(!allowSuggestions)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                allowSuggestions ? 'bg-indigo-500' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                allowSuggestions ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Default collapsed toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div>
              <span className="text-sm text-white">Ihopfälld som standard</span>
              <p className="text-xs text-gray-500">I visningsläge</p>
            </div>
            <button
              type="button"
              onClick={() => handleDefaultCollapsedChange(!defaultCollapsed)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                defaultCollapsed ? 'bg-indigo-500' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                defaultCollapsed ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Audio Block Editor - for admin-only audio blocks
function AudioBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title || '');
  const [url, setUrl] = useState(block.url || '');
  const [discrete, setDiscrete] = useState(block.discrete !== false); // Default to true (discrete)

  // Sync with block changes
  useEffect(() => {
    setTitle(block.title || '');
    setUrl(block.url || '');
    setDiscrete(block.discrete !== false);
  }, [block.id, block.title, block.url, block.discrete]);

  const handleTitleChange = (value) => {
    setTitle(value);
    onUpdate(block.id, { title: value });
  };

  const handleUrlChange = (value) => {
    setUrl(value);
    onUpdate(block.id, { url: value });
  };

  const handleDiscreteChange = (value) => {
    setDiscrete(value);
    onUpdate(block.id, { discrete: value });
  };

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-purple-500/10 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Music size={16} className="text-purple-400" />
          <span className="text-sm font-medium text-white">Ljud (admin)</span>
        </div>
        <div className="flex items-center gap-1">
          {onMove && index > 0 && (
            <button type="button" onClick={() => onMove(index, index - 1)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400">
              <ArrowUp size={14} />
            </button>
          )}
          {onMove && index < total - 1 && (
            <button type="button" onClick={() => onMove(index, index + 1)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400">
              <ArrowDown size={14} />
            </button>
          )}
          {onRemove && (
            <button type="button" onClick={() => onRemove(block.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Titel</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="T.ex. Vår låt"
            disabled={saving}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">URL till ljudfil</label>
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="/ourspots/media/låt.mp3 eller https://..."
            disabled={saving}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Lägg filer i public/media/ för /ourspots/media/filnamn.mp3
          </p>
        </div>
        
        {/* Discrete toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div>
            <span className="text-sm text-white">Diskret läge</span>
            <p className="text-xs text-gray-500">Visa endast play-knapp vid plats</p>
          </div>
          <button
            type="button"
            onClick={() => handleDiscreteChange(!discrete)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              discrete ? 'bg-purple-500' : 'bg-white/20'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
              discrete ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Separate component for weighted participant row (needed for hooks)
function WeightedParticipantRow({ participant, idx, onUpdateWeight, onRemove }) {
  const [localWeight, setLocalWeight] = useState(String(participant.weight ?? 1));
  
  // Sync when external value changes
  useEffect(() => {
    setLocalWeight(String(participant.weight ?? 1));
  }, [participant.weight]);
  
  return (
    <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white truncate block">{participant.name || participant.email}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Vikt:</label>
        <input
          type="text"
          inputMode="decimal"
          data-weight-input={idx}
          value={localWeight}
          onChange={(e) => setLocalWeight(e.target.value)}
          onBlur={(e) => {
            const val = e.target.value.replace(',', '.');
            const num = parseFloat(val) || 1;
            const clamped = Math.max(0.5, Math.min(10, num));
            setLocalWeight(String(clamped));
            onUpdateWeight(clamped);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.target.blur();
              const nextInput = document.querySelector(`[data-weight-input="${idx + 1}"]`);
              if (nextInput) {
                setTimeout(() => {
                  nextInput.focus();
                  nextInput.select();
                }, 10);
              }
            }
          }}
          className="w-14 px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white text-center"
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-gray-500 hover:text-red-400"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// Split Block Editor - expense sharing configuration
function SplitBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving, shares = {}, currentUser, currentUserDisplayName }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState(block.title || 'Splitt');
  const [model, setModel] = useState(block.model || 'individual');
  const [participants, setParticipants] = useState(block.participants || []);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? true);
  const [closed, setClosed] = useState(block.closed || false);

  // Sync with block changes
  useEffect(() => {
    setTitle(block.title || 'Splitt');
    setModel(block.model || 'individual');
    setParticipants(block.participants || []);
    setDefaultCollapsed(block.defaultCollapsed ?? true);
    setClosed(block.closed || false);
  }, [block.id, block.title, block.model, block.participants, block.defaultCollapsed, block.closed]);

  const syncToParent = (updates) => {
    onUpdate(block.id, {
      title,
      model,
      participants,
      defaultCollapsed,
      closed,
      ...updates
    });
  };

  const handleTitleChange = (value) => {
    setTitle(value);
    syncToParent({ title: value });
  };

  const handleModelChange = (value) => {
    setModel(value);
    // Reset weights when changing model
    const updatedParticipants = participants.map(p => ({
      ...p,
      weight: value === 'individual' ? 1 : (p.weight || 1)
    }));
    setParticipants(updatedParticipants);
    syncToParent({ model: value, participants: updatedParticipants });
  };

  const handleDefaultCollapsedChange = (value) => {
    setDefaultCollapsed(value);
    syncToParent({ defaultCollapsed: value });
  };

  const handleReopenSplit = () => {
    setClosed(false);
    syncToParent({ closed: false });
  };

  const handleResetAmounts = () => {
    if (window.confirm('Vill du nollställa alla belopp? Detta kan inte ångras.')) {
      const resetParticipants = participants.map(p => ({ ...p, paid: 0 }));
      setParticipants(resetParticipants);
      setClosed(false);
      syncToParent({ participants: resetParticipants, closed: false });
    }
  };

  // Toggle participant (for individual mode badges)
  const toggleParticipant = (email, name) => {
    const exists = participants.some(p => p.email?.toLowerCase() === email);
    if (exists) {
      const updated = participants.filter(p => p.email?.toLowerCase() !== email);
      setParticipants(updated);
      syncToParent({ participants: updated });
    } else {
      const newParticipant = {
        email,
        name,
        weight: 1,
        paid: 0
      };
      const updated = [...participants, newParticipant];
      setParticipants(updated);
      syncToParent({ participants: updated });
    }
  };

  // Get available users from shares (accepted or inherited) + owner
  const sharedUsers = Object.entries(shares)
    .filter(([_, share]) => share.status === 'accepted' || share.status === 'inherited')
    .map(([key, share]) => ({
      email: share.email?.toLowerCase(),
      name: share.displayName || share.email?.split('@')[0]
    }));
  
  // Add current user (owner) to the list
  const ownerEmail = currentUser?.email?.toLowerCase();
  const ownerName = currentUserDisplayName || ownerEmail?.split('@')[0] || 'Jag';
  
  const availableUsers = ownerEmail 
    ? [{ email: ownerEmail, name: ownerName, isOwner: true }, ...sharedUsers]
    : sharedUsers;

  const addParticipant = (email, name) => {
    if (participants.some(p => p.email?.toLowerCase() === email)) return;
    
    const newParticipant = {
      email,
      name,
      weight: 1,
      paid: 0
    };
    
    const updated = [...participants, newParticipant];
    setParticipants(updated);
    syncToParent({ participants: updated });
  };

  const removeParticipant = (email) => {
    const updated = participants.filter(p => p.email?.toLowerCase() !== email);
    setParticipants(updated);
    syncToParent({ participants: updated });
  };

  const updateParticipantWeight = (email, weight) => {
    const updated = participants.map(p => {
      if (p.email?.toLowerCase() === email) {
        return {
          ...p,
          weight: weight || 1
        };
      }
      return p;
    });
    setParticipants(updated);
    syncToParent({ participants: updated });
  };

  const totalWeight = participants.reduce((sum, p) => sum + (p.weight || 1), 0);

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
          <Wallet size={16} className="text-green-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            {title || 'Splitt'}
          </span>
          {participants.length > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">({participants.length} deltagare)</span>
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
        <div className="p-3 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-green-500 text-white placeholder-gray-500"
              placeholder="T.ex. Resekostnader"
            />
          </div>

          {/* Model selection */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Delningsmodell</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleModelChange('individual')}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  model === 'individual'
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                Lika
              </button>
              <button
                type="button"
                onClick={() => handleModelChange('family')}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  model === 'family'
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                Viktad
              </button>
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">
              Deltagare {model === 'family' && totalWeight > 0 && `(total vikt: ${totalWeight})`}
            </label>
            
            {/* Individual mode: Toggle badges */}
            {model === 'individual' && availableUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {availableUsers.map((user, idx) => {
                  const isSelected = participants.some(p => p.email?.toLowerCase() === user.email);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleParticipant(user.email, user.name)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {user.name}{user.isOwner ? ' (jag)' : ''}
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Weighted mode: List with single weight field */}
            {model === 'family' && (
              <>
                <div className="space-y-2 mb-3">
                  {participants.map((p, idx) => (
                    <WeightedParticipantRow
                      key={p.email || idx}
                      participant={p}
                      idx={idx}
                      onUpdateWeight={(weight) => updateParticipantWeight(p.email, weight)}
                      onRemove={() => removeParticipant(p.email)}
                    />
                  ))}
                </div>
                
                {/* Help text */}
                <div className="text-xs text-gray-500 mb-2">
                  T.ex. 3 för hela resan, 2 för de som kom dag 2 av 3
                </div>

                {/* Add participant for weighted mode */}
                {availableUsers.filter(u => !participants.some(p => p.email === u.email)).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {availableUsers
                      .filter(u => !participants.some(p => p.email === u.email))
                      .map((user, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => addParticipant(user.email, user.name)}
                          className="px-2 py-1 text-xs bg-white/10 hover:bg-green-500/20 text-gray-400 hover:text-green-400 rounded-lg flex items-center gap-1"
                        >
                          <Plus size={12} />
                          {user.name}
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
            
            {availableUsers.length === 0 && participants.length === 0 && (
              <div className="text-xs text-gray-500 italic">
                Dela objektet med andra för att lägga till deltagare
              </div>
            )}
          </div>

          {/* Reopen / Reset buttons */}
          {(closed || participants.some(p => (parseFloat(p.paid) || 0) > 0)) && (
            <div className="flex gap-2 pt-3 border-t border-white/5">
              {closed && (
                <button
                  type="button"
                  onClick={handleReopenSplit}
                  className="flex-1 py-2 text-sm text-amber-500 hover:bg-amber-500/10 rounded-lg flex items-center justify-center gap-1"
                >
                  <RotateCcw size={12} />
                  Öppna igen
                </button>
              )}
              <button
                type="button"
                onClick={handleResetAmounts}
                className="flex-1 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center justify-center gap-1"
              >
                <Trash2 size={12} />
                Nollställ belopp
              </button>
            </div>
          )}

          {/* Default collapsed toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div>
              <span className="text-sm text-white">Ihopfälld som standard</span>
              <p className="text-xs text-gray-500">I visningsläge</p>
            </div>
            <button
              type="button"
              onClick={() => handleDefaultCollapsedChange(!defaultCollapsed)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                defaultCollapsed ? 'bg-green-500' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                defaultCollapsed ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Leaderboard Block Editor - competition/ranking configuration
function LeaderboardBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving, shares = {}, currentUser, currentUserDisplayName }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState(block.title || 'Leaderboard');
  const [participants, setParticipants] = useState(block.participants || []);
  const [roundCount, setRoundCount] = useState(block.roundCount || 0);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? true);
  const [status, setStatus] = useState(block.status || 'active');
  const [mode, setMode] = useState(block.mode || 'single'); // 'single' or 'team'
  const [teams, setTeams] = useState(block.teams || [
    { id: 1, name: 'Lag 1' },
    { id: 2, name: 'Lag 2' }
  ]);
  const [selectedTeam, setSelectedTeam] = useState(1); // Which team is selected for adding members

  // Sync with block changes
  useEffect(() => {
    setTitle(block.title || 'Leaderboard');
    setParticipants(block.participants || []);
    setRoundCount(block.roundCount || 0);
    setDefaultCollapsed(block.defaultCollapsed ?? true);
    setStatus(block.status || 'active');
    setMode(block.mode || 'single');
    setTeams(block.teams || [
      { id: 1, name: 'Lag 1' },
      { id: 2, name: 'Lag 2' }
    ]);
  }, [block.id, block.title, block.participants, block.roundCount, block.defaultCollapsed, block.status, block.mode, block.teams]);

  const syncToParent = (updates) => {
    onUpdate(block.id, {
      title,
      participants,
      roundCount,
      scores: block.scores || {},
      defaultCollapsed,
      status,
      sortOrder: block.sortOrder || 'desc',
      mode,
      teams,
      ...updates
    });
  };

  const handleTitleChange = (value) => {
    setTitle(value);
    syncToParent({ title: value });
  };

  const handleDefaultCollapsedChange = (value) => {
    setDefaultCollapsed(value);
    syncToParent({ defaultCollapsed: value });
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // When switching to team mode, clear team assignments
    if (newMode === 'team') {
      const updatedParticipants = participants.map(p => ({ ...p, team: undefined }));
      setParticipants(updatedParticipants);
      syncToParent({ mode: newMode, participants: updatedParticipants });
    } else {
      syncToParent({ mode: newMode });
    }
  };

  const handleReopenLeaderboard = () => {
    setStatus('active');
    syncToParent({ status: 'active' });
  };

  const handleResetScores = () => {
    if (window.confirm('Vill du nollställa alla poäng? Detta kan inte ångras.')) {
      setStatus('active');
      setRoundCount(0);
      syncToParent({ scores: {}, roundCount: 0, status: 'active' });
    }
  };

  // Toggle participant (for single mode)
  const toggleParticipant = (email, name) => {
    const exists = participants.some(p => p.email?.toLowerCase() === email);
    if (exists) {
      const updated = participants.filter(p => p.email?.toLowerCase() !== email);
      setParticipants(updated);
      syncToParent({ participants: updated });
    } else {
      const newParticipant = { email, name };
      const updated = [...participants, newParticipant];
      setParticipants(updated);
      syncToParent({ participants: updated });
    }
  };

  // Add participant to selected team (for team mode)
  const addToTeam = (email, name) => {
    const exists = participants.some(p => p.email?.toLowerCase() === email);
    if (exists) {
      // Update existing participant's team
      const updated = participants.map(p => 
        p.email?.toLowerCase() === email ? { ...p, team: selectedTeam } : p
      );
      setParticipants(updated);
      syncToParent({ participants: updated });
    } else {
      // Add new participant with team
      const newParticipant = { email, name, team: selectedTeam };
      const updated = [...participants, newParticipant];
      setParticipants(updated);
      syncToParent({ participants: updated });
    }
  };

  // Remove participant from team (make them available again)
  const removeFromTeam = (email) => {
    const updated = participants.filter(p => p.email?.toLowerCase() !== email);
    setParticipants(updated);
    syncToParent({ participants: updated });
  };

  // Get participants for a specific team
  const getTeamMembers = (teamId) => {
    return participants.filter(p => p.team === teamId);
  };

  // Get available users not in any team (for team mode)
  const getAvailableForTeam = () => {
    const assignedEmails = participants.filter(p => p.team).map(p => p.email?.toLowerCase());
    return availableUsers.filter(u => !assignedEmails.includes(u.email));
  };

  // Get available users from shares (accepted or inherited) + owner
  const sharedUsers = Object.entries(shares)
    .filter(([_, share]) => share.status === 'accepted' || share.status === 'inherited')
    .map(([key, share]) => ({
      email: share.email?.toLowerCase(),
      name: share.displayName || share.email?.split('@')[0]
    }));
  
  // Add current user (owner) to the list
  const ownerEmail = currentUser?.email?.toLowerCase();
  const ownerName = currentUserDisplayName || ownerEmail?.split('@')[0] || 'Jag';
  
  const availableUsers = ownerEmail 
    ? [{ email: ownerEmail, name: ownerName, isOwner: true }, ...sharedUsers]
    : sharedUsers;

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
          <Trophy size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            {title || 'Leaderboard'}
          </span>
          {participants.length > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">({participants.length} deltagare)</span>
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
        <div className="p-3 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
              placeholder="T.ex. Golfhelg 2026"
            />
          </div>

          {/* Mode toggle: Singel / Lag */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Tävlingstyp</label>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                type="button"
                onClick={() => handleModeChange('single')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  mode === 'single'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300'
                }`}
              >
                Singel
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('team')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  mode === 'team'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300'
                }`}
              >
                Lag
              </button>
            </div>
          </div>

          {/* Single mode: Participants */}
          {mode === 'single' && (
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                Deltagare
              </label>
              
              {availableUsers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {availableUsers.map((user, idx) => {
                    const isSelected = participants.some(p => p.email?.toLowerCase() === user.email);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleParticipant(user.email, user.name)}
                        className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {user.name}{user.isOwner ? ' (jag)' : ''}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic">
                  Dela objektet med andra för att lägga till deltagare
                </div>
              )}
            </div>
          )}

          {/* Team mode: Team assignment */}
          {mode === 'team' && (
            <div className="space-y-3">
              {/* Team columns */}
              <div className="grid grid-cols-2 gap-2">
                {teams.map((team) => {
                  const teamMembers = getTeamMembers(team.id);
                  const isSelected = selectedTeam === team.id;
                  const teamColor = team.id === 1 ? 'cyan' : 'orange';
                  
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedTeam(team.id)}
                      className={`p-2 rounded-lg border transition-all text-left ${
                        isSelected
                          ? team.id === 1
                            ? 'border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                            : 'border-orange-500/50 bg-orange-500/10 ring-1 ring-orange-500/30'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`text-xs font-medium mb-2 ${
                        team.id === 1 ? 'text-cyan-400' : 'text-orange-400'
                      }`}>
                        {team.name}
                        {isSelected && <span className="ml-1">✓</span>}
                      </div>
                      <div className="space-y-1 min-h-[32px]">
                        {teamMembers.length === 0 ? (
                          <div className="text-xs text-gray-600 italic">
                            {isSelected ? 'Välj deltagare nedan' : 'Inga deltagare'}
                          </div>
                        ) : (
                          teamMembers.map((member, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center justify-between gap-1 text-xs text-gray-300 bg-white/5 rounded px-1.5 py-1"
                            >
                              <span className="truncate">{member.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromTeam(member.email);
                                }}
                                className="text-gray-500 hover:text-red-400 flex-shrink-0"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Available users to add to teams */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">
                  Tillgängliga att lägga till i {teams.find(t => t.id === selectedTeam)?.name}
                </label>
                {getAvailableForTeam().length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {getAvailableForTeam().map((user, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => addToTeam(user.email, user.name)}
                        className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                          selectedTeam === 1
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                            : 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                        }`}
                      >
                        + {user.name}{user.isOwner ? ' (jag)' : ''}
                      </button>
                    ))}
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="text-xs text-gray-500 italic">
                    Dela objektet med andra för att lägga till deltagare
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">
                    Alla deltagare är tilldelade ett lag
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Round count info */}
          {roundCount > 0 && (
            <div className="text-xs text-gray-500">
              {roundCount} {roundCount === 1 ? 'runda' : 'rundor'} registrerade
            </div>
          )}

          {/* Default collapsed toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-xs text-gray-400">Visa ihopfälld</span>
            <button
              type="button"
              onClick={() => handleDefaultCollapsedChange(!defaultCollapsed)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                defaultCollapsed ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                defaultCollapsed ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Reopen / Reset buttons */}
          {(status === 'finished' || roundCount > 0) && (
            <div className="flex gap-2 pt-3 border-t border-white/5">
              {status === 'finished' && (
                <button
                  type="button"
                  onClick={handleReopenLeaderboard}
                  className="flex-1 py-2 text-sm text-blue-500 hover:bg-blue-500/10 rounded-lg flex items-center justify-center gap-1"
                >
                  <RotateCcw size={12} />
                  Återöppna
                </button>
              )}
              {roundCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetScores}
                  className="flex-1 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center justify-center gap-1"
                >
                  <Trash2 size={12} />
                  Nollställ
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Distribution block editor - for carpool/tasks presets
function DistributionBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving, shares = {}, currentUser, currentUserDisplayName }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState(block.title || '');
  const [participants, setParticipants] = useState(block.participants || []);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? true);
  
  // Sync with block changes
  useEffect(() => {
    setTitle(block.title || '');
    setParticipants(block.participants || []);
    setDefaultCollapsed(block.defaultCollapsed ?? true);
  }, [block.id, block.title, block.participants, block.defaultCollapsed]);
  
  const syncToParent = (updates) => {
    onUpdate(block.id, {
      title,
      participants,
      defaultCollapsed,
      preset: block.preset,
      slots: block.slots || [],
      ...updates
    });
  };
  
  const handleTitleChange = (value) => {
    setTitle(value);
    syncToParent({ title: value });
  };
  
  const handleDefaultCollapsedChange = (value) => {
    setDefaultCollapsed(value);
    syncToParent({ defaultCollapsed: value });
  };
  
  // Toggle participant
  const toggleParticipant = (email, name) => {
    const exists = participants.some(p => p.email?.toLowerCase() === email);
    if (exists) {
      const updated = participants.filter(p => p.email?.toLowerCase() !== email);
      setParticipants(updated);
      syncToParent({ participants: updated });
    } else {
      const newParticipant = { email, name };
      const updated = [...participants, newParticipant];
      setParticipants(updated);
      syncToParent({ participants: updated });
    }
  };
  
  // Get available users from shares (accepted or inherited) + owner
  const sharedUsers = Object.entries(shares)
    .filter(([_, share]) => share.status === 'accepted' || share.status === 'inherited')
    .map(([key, share]) => ({
      email: share.email?.toLowerCase(),
      name: share.displayName || share.email?.split('@')[0]
    }));
  
  // Add current user (owner) to the list
  const ownerEmail = currentUser?.email?.toLowerCase();
  const ownerName = currentUserDisplayName || ownerEmail?.split('@')[0] || 'Jag';
  
  const availableUsers = ownerEmail 
    ? [{ email: ownerEmail, name: ownerName, isOwner: true }, ...sharedUsers]
    : sharedUsers;
  
  // Preset config
  const presetConfig = {
    carpool: { label: 'Samåkning', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    tasks: { label: 'Uppgiftstilldelning', color: 'text-blue-400', bgColor: 'bg-blue-500/20' }
  };
  
  const currentPreset = presetConfig[block.preset] || presetConfig.carpool;
  
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={currentPreset.color}>
            {block.preset === 'carpool' ? (
              <>
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-1.8-3.2c-.3-.5-.8-.8-1.4-.8H9.2c-.6 0-1.1.3-1.4.8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </>
            ) : (
              <>
                <rect x="3" y="5" width="6" height="6" rx="1" />
                <path d="m3 17 2 2 4-4" />
                <path d="M13 6h8" />
                <path d="M13 12h8" />
                <path d="M13 18h8" />
              </>
            )}
          </svg>
          <span className="text-sm font-medium text-gray-300 truncate">
            {title || currentPreset.label}
          </span>
          {participants.length > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">({participants.length} deltagare)</span>
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
        <div className="p-3 pt-0 space-y-4">
          {/* Custom title (optional) */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={`Standard: ${currentPreset.label}`}
              disabled={saving}
              className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
            />
          </div>
          
          {/* Preset indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
            <span className="text-sm text-gray-400">Typ:</span>
            <span className={`text-sm font-medium ${currentPreset.color}`}>{currentPreset.label}</span>
          </div>
          
          {/* Participants */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Deltagare</label>
            
            {availableUsers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {availableUsers.map((user, idx) => {
                  const isSelected = participants.some(p => p.email?.toLowerCase() === user.email);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleParticipant(user.email, user.name)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                        isSelected
                          ? `${currentPreset.bgColor} border-white/20 ${currentPreset.color}`
                          : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {user.name}{user.isOwner ? ' (jag)' : ''}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">
                Dela objektet med andra för att lägga till deltagare
              </div>
            )}
          </div>
          
          {/* Default collapsed toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={defaultCollapsed}
              onChange={(e) => handleDefaultCollapsedChange(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-400">Ihopfälld som standard</span>
          </label>
          
          {/* Reset slots button */}
          {(block.slots || []).length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Vill du nollställa alla ${block.preset === 'carpool' ? 'bilar' : 'uppgifter'}? Detta kan inte ångras.`)) {
                  syncToParent({ slots: [] });
                }
              }}
              className="w-full py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-colors"
            >
              Nollställ {block.preset === 'carpool' ? 'bilar' : 'uppgifter'} ({(block.slots || []).length})
            </button>
          )}
          
          <div className="text-xs text-gray-500 pt-3 border-t border-white/5">
            Deltagare kan skapa och välja {block.preset === 'carpool' ? 'bilar' : 'uppgifter'} i objektvyn.
          </div>
        </div>
      )}
    </div>
  );
}

export { DateTagBlockEditor, TimerBlockEditor, PollBlockEditor, AudioBlockEditor, SplitBlockEditor, LeaderboardBlockEditor, FullscreenTextEditor, DistributionBlockEditor, SectionBlockEditor };

export default BlockEditor;
