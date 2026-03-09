import React, { useState, useRef, useCallback } from 'react';
import { X, Link2, Trash2, Check } from 'lucide-react';
import { useFullscreenModal } from '../../utils/useFullscreenModal';
import { useConfirm } from '../../utils/useConfirm';
import { usePrompt } from '../../utils/usePrompt';

// Fullscreen text editor for mobile - iOS Notes-like experience
function FullscreenTextEditor({ content, title, onSave, onCancel }) {
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [text, setText] = useState(content || '');
  const textareaRef = useRef(null);
  const containerRef = useRef(null);
  
  const HEADER_HEIGHT = 48;
  const TOOLBAR_HEIGHT = 56;
  
  const { viewportHeight, viewportOffset, contentHeight: availableHeight } = useFullscreenModal({
    bgColor: '#111827',
    headerHeight: HEADER_HEIGHT,
    toolbarHeight: TOOLBAR_HEIGHT,
    useRAF: true,
  });

  // Focus textarea after a short delay to open keyboard
  React.useEffect(() => {
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 150);
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
  
  const insertLink = useCallback(async () => {
    // Save selection before prompt steals focus
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart || 0;
    const end = textarea?.selectionEnd || 0;
    const selectedText = text.substring(start, end);
    
    const url = await prompt({ title: 'Infoga länk', placeholder: 'https://...' });
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
  
  const handleClear = useCallback(async () => {
    if (text && await confirm({ title: 'Rensa text?', message: 'All text i editorn raderas.', confirmText: 'Rensa', variant: 'danger' })) {
      setText('');
      textareaRef.current?.focus();
    }
  }, [text, confirm]);
  
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
          top: `calc(${viewportOffset}px + env(safe-area-inset-top))`,
          height: `calc(${viewportHeight}px - env(safe-area-inset-top))`
        }}
        onTouchMove={(e) => {
          // Only allow touchmove on the textarea
          if (e.target !== textareaRef.current) {
            e.preventDefault();
          }
        }}
      >
        {/* Header - full width bg, centered content */}
        <div 
          className="flex-shrink-0 border-b border-white/10"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          <div className="max-w-4xl mx-auto h-full flex items-center justify-between px-2">
          <span className="text-sm text-gray-400 truncate flex-1 pl-2">
            {title || 'Anteckning'}
        </span>
        <button
          type="button"
          onTouchEnd={async (e) => {
            e.preventDefault();
            if (text !== (content || '') && !await confirm({ title: 'Osparade ändringar', message: 'Vill du kasta dina ändringar?', confirmText: 'Kasta', variant: 'warning' })) return;
            onCancel();
          }}
          onClick={async () => {
            if (text !== (content || '') && !await confirm({ title: 'Osparade ändringar', message: 'Vill du kasta dina ändringar?', confirmText: 'Kasta', variant: 'warning' })) return;
            onCancel();
          }}
          className="w-12 h-12 flex items-center justify-center text-gray-400 active:text-white transition-colors touch-manipulation"
        >
          <X size={24} />
        </button>
          </div>
      </div>
      
      {/* Markdown toolbar - full width bg, centered content */}
      <div 
        className="flex-shrink-0 border-b border-white/5"
        style={{ height: `${TOOLBAR_HEIGHT}px` }}
      >
        <div className="max-w-4xl mx-auto h-full flex items-center px-3">
        <div className="flex items-center gap-1 flex-1">
          <ToolbarButton onPress={() => insertMarkdown('**', '**', 'text')} title="Fetstil">
            <span className="font-bold text-sm">B</span>
          </ToolbarButton>
          <ToolbarButton onPress={() => insertMarkdown('*', '*', 'text')} title="Kursiv">
            <span className="italic text-sm">I</span>
          </ToolbarButton>
          <ToolbarButton onPress={() => insertMarkdown('~~', '~~', 'text')} title="Genomstruken">
            <span className="line-through text-sm">S</span>
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
          <ToolbarButton onPress={() => insertMarkdown('```\n', '\n```', 'kod')} title="Kodblock">
            <span className="font-mono text-xs">{'</>'}</span>
          </ToolbarButton>
          <ToolbarButton onPress={() => insertMarkdown('\n---\n', '', '')} title="Skiljelinje">
            <span className="text-sm">―</span>
          </ToolbarButton>
          <div className="flex-1" />
          <ToolbarButton onPress={handleClear} title="Rensa" variant="danger">
            <Trash2 size={16} />
          </ToolbarButton>
        </div>
        </div>
      </div>
      
      {/* Textarea container with floating button */}
      <div className="relative flex-1">
        <div className="max-w-4xl mx-auto h-full relative lg:border-x lg:border-white/[0.06]">
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
      </div>
    </>
  );
}

export { FullscreenTextEditor };
export default FullscreenTextEditor;
