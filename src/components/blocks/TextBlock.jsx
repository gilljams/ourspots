import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Edit2, FileText } from 'lucide-react';
import { renderMarkdown } from './renderMarkdown';

export const TextBlock = ({ data, onExpand, onEditContent }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const blockRef = useRef(null);
  const title = data.title || 'Anteckning';
  
  // Sync collapsed state when defaultCollapsed changes
  useEffect(() => {
    setIsCollapsed(data.defaultCollapsed ?? true);
  }, [data.defaultCollapsed]);
  
  // Scroll into view when expanded
  const handleToggleCollapse = () => {
    const wasCollapsed = isCollapsed;
    setIsCollapsed(!isCollapsed);
    if (wasCollapsed && onExpand) {
      setTimeout(() => onExpand(blockRef.current), 100);
    }
  };
  
  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEditContent) {
      onEditContent();
    }
  };
  
  return (
    <div ref={blockRef} className="space-y-2">
      {/* Collapsible header */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleCollapse}
          className="flex-1 flex items-center gap-2.5 py-2 group touch-manipulation"
        >
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <ChevronDown 
              size={16} 
              className={`text-gray-400 group-hover:text-white transition-all ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
            />
          </div>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <FileText size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
              {title}
            </span>
          </div>
        </button>
        {/* Edit button - only show when expanded and edit handler is provided */}
        {!isCollapsed && onEditContent && (
          <button
            onClick={handleEditClick}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            title="Redigera text"
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>
      
      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="bg-white/[0.03] rounded-xl p-4">
          {data.content?.trim() ? (
            <div className="text-sm leading-relaxed space-y-1">
              {renderMarkdown(data.content)}
            </div>
          ) : onEditContent ? (
            <button
              onClick={handleEditClick}
              className="w-full text-left text-sm text-gray-500 italic hover:text-gray-400 transition-colors py-1"
            >
              Tryck för att skriva...
            </button>
          ) : (
            <div className="text-sm text-gray-600 italic">Tom anteckning</div>
          )}
        </div>
      )}
    </div>
  );
};
