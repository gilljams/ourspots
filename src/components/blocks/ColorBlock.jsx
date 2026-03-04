import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Palette, Copy } from 'lucide-react';

/**
 * ColorBlock – displays a list of room/surface colors with swatches.
 * Data model: { entries: [{ id, room, colorName, colorCode, hex, brand, product }] }
 */
export const ColorBlock = ({ data, onExpand }) => {
  const entries = data.entries || [];
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const blockRef = useRef(null);
  const title = data.title || 'Kolör';
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    setIsCollapsed(data.defaultCollapsed ?? true);
  }, [data.defaultCollapsed]);

  if (entries.length === 0) {
    return <div className="text-sm text-gray-500 italic">Inga färger tillagda</div>;
  }

  const handleToggleCollapse = () => {
    const wasCollapsed = isCollapsed;
    setIsCollapsed(!isCollapsed);
    if (wasCollapsed && onExpand) {
      setTimeout(() => onExpand(blockRef.current), 100);
    }
  };

  const handleCopy = (entry) => {
    const parts = [entry.room];
    if (entry.colorName) parts.push(entry.colorName);
    if (entry.colorCode) parts.push(entry.colorCode);
    if (entry.brand) parts.push(entry.brand);
    if (entry.product) parts.push(entry.product);
    navigator.clipboard?.writeText(parts.join(' – ')).then(() => {
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div ref={blockRef}>
      {/* Collapsible header */}
      <button
        onClick={handleToggleCollapse}
        className="w-full flex items-center gap-2.5 py-2 group touch-manipulation"
      >
        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
          />
        </div>
        <Palette size={16} className="text-amber-400 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
          {title}
        </span>
        <span className="text-xs text-gray-500 ml-1">({entries.length})</span>
      </button>

      {/* Entries */}
      {!isCollapsed && (
        <div className="space-y-1 mt-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group/row"
            >
              {/* Color swatch */}
              <div
                className="w-8 h-8 rounded-lg border border-white/10 flex-shrink-0 shadow-inner"
                style={{ backgroundColor: entry.hex || '#888' }}
                title={entry.hex || ''}
              />
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200 truncate">
                    {entry.room || 'Namnlös'}
                  </span>
                  {entry.colorCode && (
                    <span className="text-xs text-gray-500 font-mono truncate">
                      {entry.colorCode}
                    </span>
                  )}
                </div>
                {(entry.colorName || entry.brand || entry.product) && (
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {[entry.colorName, entry.brand, entry.product].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              {/* Copy button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy(entry); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 hover:bg-white/5 opacity-0 group-hover/row:opacity-100 transition-all flex-shrink-0"
                title="Kopiera färginfo"
              >
                {copiedId === entry.id ? (
                  <span className="text-xs text-green-400">✓</span>
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColorBlock;
