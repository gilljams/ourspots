import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, ChevronDown, Link } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';

export const LinksBlock = ({ data, onExpand }) => {
  const items = data.items || [];
  const isSingleLink = items.length === 1;
  const isCollapsible = items.length > 1;
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const blockRef = useRef(null);
  const title = data.title || `Länkar (${items.length})`;
  
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
  
  // Single link - no collapse, just show inline
  if (isSingleLink) {
    const item = items[0];
    const IconComponent = getIconComponent(item.icon || 'Link');
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 py-1 hover:bg-white/[0.02] transition-colors group"
      >
        <div className="w-6 h-6 rounded-lg bg-white/5 group-hover:bg-white/10 flex items-center justify-center flex-shrink-0">
          <IconComponent size={14} className="text-purple-400" />
        </div>
        <span className="text-sm font-medium text-gray-200 flex-1 truncate group-hover:text-white transition-colors">
          {item.title || item.url}
        </span>
      </a>
    );
  }
  
  // Multiple links - collapsible
  return (
    <div ref={blockRef} className="space-y-2">
      {/* Collapsible header */}
      <button
        onClick={handleToggleCollapse}
        className="w-full flex items-center gap-2.5 py-2 group touch-manipulation"
      >
        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
          <ChevronDown 
            size={16} 
            className={`text-gray-400 group-hover:text-white transition-all ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
          />
        </div>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Link size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
            {title}
          </span>
        </div>
      </button>
      
      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="bg-white/[0.03] rounded-xl overflow-hidden divide-y divide-white/5">
          {items.map((item, i) => {
            const IconComponent = getIconComponent(item.icon || 'Link');
            return (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-4 py-3 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <IconComponent size={14} className="text-purple-400" />
                </div>
                <span className="text-sm text-gray-200 flex-1 truncate group-hover:text-white transition-colors">
                  {item.title || item.url}
                </span>
                <ExternalLink size={14} className="text-gray-500 group-hover:text-purple-400 transition-colors flex-shrink-0" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
