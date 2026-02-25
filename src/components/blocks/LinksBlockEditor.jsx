import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Link2, Plus } from 'lucide-react';
import { getIconComponent, LINK_ICONS, detectIconFromUrl } from '../../utils/iconHelpers';

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
    const newLinks = links.map((link, i) => {
      if (i !== linkIndex) return link;
      
      const updatedLink = { ...link, [field]: value };
      
      // Auto-detect icon when URL changes and icon hasn't been manually set (still default 'Link')
      if (field === 'url' && link.icon === 'Link') {
        const detectedIcon = detectIconFromUrl(value);
        if (detectedIcon) {
          updatedLink.icon = detectedIcon;
        }
      }
      
      return updatedLink;
    });
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
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Titel</label>
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
          </div>

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
                          className="absolute top-12 left-0 z-[101] bg-gray-800 border border-white/10 rounded-xl p-2 shadow-xl grid grid-cols-6 gap-1 w-64 max-h-48 overflow-y-auto"
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
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-gray-400">Ihopfälld som standard</span>
              <button
                type="button"
                onClick={() => handleDefaultCollapsedChange(!defaultCollapsed)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  defaultCollapsed ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
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

export { LinksBlockEditor };
export default LinksBlockEditor;
