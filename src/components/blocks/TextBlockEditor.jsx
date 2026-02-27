import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, FileText, ChevronDown, Edit2 } from 'lucide-react';
import { FullscreenTextEditor } from './FullscreenTextEditor';

// Text/note block editor - collapsible with fullscreen markdown editor
function TextBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title);
  const [content, setContent] = useState(block.content);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? true);
  const [viewerEditable, setViewerEditable] = useState(block.viewerEditable ?? false);
  const [showFullscreenEditor, setShowFullscreenEditor] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Use refs to always have latest values for blur handlers
  const titleRef = React.useRef(title);
  const contentRef = React.useRef(content);
  const defaultCollapsedRef = React.useRef(defaultCollapsed);
  const viewerEditableRef = React.useRef(viewerEditable);
  titleRef.current = title;
  contentRef.current = content;
  defaultCollapsedRef.current = defaultCollapsed;
  viewerEditableRef.current = viewerEditable;
  
  const syncTitle = () => onUpdate(block.id, { title: titleRef.current, defaultCollapsed: defaultCollapsedRef.current, viewerEditable: viewerEditableRef.current });
  const syncContent = () => {
    onUpdate(block.id, { content: contentRef.current, defaultCollapsed: defaultCollapsedRef.current, viewerEditable: viewerEditableRef.current });
  };
  
  const handleDefaultCollapsedChange = (newValue) => {
    setDefaultCollapsed(newValue);
    defaultCollapsedRef.current = newValue;
    onUpdate(block.id, { defaultCollapsed: newValue, viewerEditable: viewerEditableRef.current });
  };
  
  const handleViewerEditableChange = (newValue) => {
    setViewerEditable(newValue);
    viewerEditableRef.current = newValue;
    onUpdate(block.id, { defaultCollapsed: defaultCollapsedRef.current, viewerEditable: newValue });
  };
  
  // Handle fullscreen editor save
  const handleFullscreenSave = (newContent) => {
    setContent(newContent);
    contentRef.current = newContent;
    onUpdate(block.id, { content: newContent, defaultCollapsed: defaultCollapsedRef.current, viewerEditable: viewerEditableRef.current });
    setShowFullscreenEditor(false);
  };
  
  const hasContent = content && content.trim().length > 0;

  // Summary for collapsed state
  const getSummary = () => {
    if (!hasContent) return 'Ingen text';
    const firstLine = content.split('\n')[0];
    return firstLine.length > 30 ? firstLine.substring(0, 30) + '...' : firstLine;
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
          <FileText size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            {title || 'Anteckning'}
          </span>
          {!isExpanded && hasContent && (
            <span className="text-xs text-gray-500 truncate ml-1">
              {getSummary()}
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
              onBlur={syncTitle}
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
              onClick={() => handleDefaultCollapsedChange(!defaultCollapsed)}
              disabled={saving}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                defaultCollapsed ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                defaultCollapsed ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Viewer editable toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-gray-400">Viewers får redigera</span>
            <button
              type="button"
              onClick={() => handleViewerEditableChange(!viewerEditable)}
              disabled={saving}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                viewerEditable ? 'bg-green-500' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                viewerEditable ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Open fullscreen editor button */}
          <button
            type="button"
            onClick={() => setShowFullscreenEditor(true)}
            disabled={saving}
            className="w-full py-3 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg border border-blue-500/20 transition-colors flex items-center justify-center gap-2"
          >
            <Edit2 size={16} />
            Redigera texten
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

export { TextBlockEditor };
export default TextBlockEditor;
