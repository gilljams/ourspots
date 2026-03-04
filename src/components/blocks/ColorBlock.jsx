import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Palette, Copy, Edit2 } from 'lucide-react';

/**
 * ColorBlock – displays a list of room/surface colors with swatches.
 * Data model: { entries: [{ id, room, colorName, colorCode, hex, note, years }] }
 * Legacy fields brand/product are supported for backwards compat.
 */
export const ColorBlock = ({ data, onExpand, onEditColor }) => {
  const entries = data.entries || [];
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const blockRef = useRef(null);
  const title = data.title || 'Kolör';
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    setIsCollapsed(data.defaultCollapsed ?? true);
  }, [data.defaultCollapsed]);

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
    if (entry.note) parts.push(entry.note);
    // Legacy fields
    if (entry.brand && !entry.note) parts.push(entry.brand);
    if (entry.product && !entry.note) parts.push(entry.product);
    if (entry.years && entry.years.length) parts.push(entry.years.join(', '));
    navigator.clipboard?.writeText(parts.join(' – ')).then(() => {
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div ref={blockRef}>
      {/* Collapsible header */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleCollapse}
          className="flex-1 flex items-center gap-2.5 py-2 group touch-manipulation"
        >
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
            />
          </div>
          <Palette size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
            {title}
          </span>
        </button>
        {onEditColor && !isCollapsed && (
          <button
            onClick={onEditColor}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            title="Redigera färger"
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>

      {/* Entries */}
      {!isCollapsed && (
        <div className="space-y-1 mt-1">
          {entries.length === 0 ? (
            <div className="px-2 py-3 text-center text-sm text-gray-500">
              Inga färger ännu
            </div>
          ) : (
            entries.map((entry) => (
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
                  {(entry.colorName || entry.brand || entry.product || entry.note) && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {entry.note
                        ? entry.note
                        : [entry.colorName, entry.brand, entry.product].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                {/* Year badges */}
                {entry.years && entry.years.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 flex-shrink-0 justify-end max-w-[5.5rem]">
                    {entry.years.sort((a, b) => b - a).map(y => (
                      <span key={y} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-gray-500 font-medium leading-none">
                        {y}
                      </span>
                    ))}
                  </div>
                )}
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
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ColorBlock;
