import React from 'react';
import { MapPin, Map as MapIcon, X, Check, RotateCcw, ExternalLink, Calendar } from 'lucide-react';
import { getTransformedImageUrl, getFocalPointStyles } from '../../utils/imageUtils';
import { getIconComponent } from '../../utils/iconHelpers';

export const TitleBlock = ({ data }) => (
  <h2 className="text-2xl font-bold text-white mb-2">{data.text}</h2>
);

export const LocationBlock = ({ data, inherited, onDelete, canDelete, positionNumber, onShowOnMap }) => {
  const openGoogleMaps = () => {
    if (data.lat && data.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}`, '_blank');
    }
  };

  const openWaze = () => {
    if (data.lat && data.lng) {
      window.open(`https://waze.com/ul?ll=${data.lat},${data.lng}&navigate=yes`, '_blank');
    }
  };

  const handleShowOnMap = () => {
    if (onShowOnMap && data.lat && data.lng) {
      onShowOnMap({ lat: data.lat, lng: data.lng });
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MapPin size={16} className="text-gray-400 flex-shrink-0" />
        {positionNumber && (
          <span className="text-xs font-medium text-orange-400">
            #{positionNumber}
          </span>
        )}
        <span className="text-sm text-gray-300 truncate">
          {data.address || (data.lat && data.lng ? `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}` : 'Ingen plats')}
        </span>
        {inherited && <span className="text-xs text-gray-500">(från parent)</span>}
      </div>
      {data.lat && data.lng && (
        <div className="flex items-center gap-1">
          {onShowOnMap && (
            <button
              onClick={handleShowOnMap}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
              title="Visa på karta"
            >
              <MapIcon size={16} />
            </button>
          )}
          <button
            onClick={openGoogleMaps}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
            title="Google Maps"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </button>
          <button
            onClick={openWaze}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
            title="Waze"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-1.8-3.2c-.3-.5-.8-.8-1.4-.8H9.2c-.6 0-1.1.3-1.4.8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          </button>
        </div>
      )}
      {canDelete && onDelete && (
        <button
          onClick={onDelete}
          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
          title="Ta bort position"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export const ImageBlock = ({ data }) => {
  const focalStyles = getFocalPointStyles(data.focalPoint);
  return (
    <div className="w-full h-48 rounded-xl overflow-hidden mb-4 border border-white/10 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)]">
      <img 
        src={getTransformedImageUrl(data.url, data.focalPoint ? 'custom' : data.cropMode, 800, 480, data.focalPoint)} 
        alt="" 
        className="w-full h-full object-cover"
        style={focalStyles}
      />
    </div>
  );
};

// Lightweight markdown renderer - supports **bold**, *italic*, - bullets, numbered lists
export const renderMarkdown = (text) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null; // 'ul' or 'ol'
  
  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1 my-2">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
            {listItems}
          </ul>
        );
      }
      listItems = [];
      listType = null;
    }
  };
  
  const formatInline = (line) => {
    // Process bold and italic
    const parts = [];
    let remaining = line;
    let keyIndex = 0;
    
    while (remaining.length > 0) {
      // Check for **bold**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Check for *italic* (but not **)
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      
      let firstMatch = null;
      let matchType = null;
      
      if (boldMatch && (!italicMatch || boldMatch.index <= italicMatch.index)) {
        firstMatch = boldMatch;
        matchType = 'bold';
      } else if (italicMatch) {
        firstMatch = italicMatch;
        matchType = 'italic';
      }
      
      if (firstMatch) {
        // Add text before match
        if (firstMatch.index > 0) {
          parts.push(remaining.substring(0, firstMatch.index));
        }
        // Add formatted text
        if (matchType === 'bold') {
          parts.push(<strong key={keyIndex++} className="font-semibold text-white">{firstMatch[1]}</strong>);
        } else {
          parts.push(<em key={keyIndex++} className="italic text-gray-300">{firstMatch[1]}</em>);
        }
        remaining = remaining.substring(firstMatch.index + firstMatch[0].length);
      } else {
        parts.push(remaining);
        break;
      }
    }
    
    return parts.length > 0 ? parts : line;
  };
  
  lines.forEach((line, index) => {
    // Check for H1 heading (# )
    const h1Match = line.match(/^#\s+(.+)/);
    // Check for H2 heading (## )
    const h2Match = line.match(/^##\s+(.+)/);
    // Check for bullet list (- or *)
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
    // Check for numbered list (1. 2. etc)
    const numberedMatch = line.match(/^\s*\d+\.\s+(.+)/);
    
    if (h2Match) {
      flushList();
      elements.push(<h3 key={`h2-${index}`} className="text-base font-semibold text-white mt-3 mb-1">{formatInline(h2Match[1])}</h3>);
    } else if (h1Match) {
      flushList();
      elements.push(<h2 key={`h1-${index}`} className="text-lg font-bold text-white mt-4 mb-2">{formatInline(h1Match[1])}</h2>);
    } else if (bulletMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(<li key={`li-${index}`} className="text-gray-200">{formatInline(bulletMatch[1])}</li>);
    } else if (numberedMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(<li key={`li-${index}`} className="text-gray-200">{formatInline(numberedMatch[1])}</li>);
    } else {
      flushList();
      if (line.trim() === '') {
        elements.push(<div key={`br-${index}`} className="h-2" />);
      } else {
        elements.push(<p key={`p-${index}`} className="text-gray-200">{formatInline(line)}</p>);
      }
    }
  });
  
  flushList();
  return elements;
};

export const TextBlock = ({ data }) => (
  <div className="bg-white/[0.03] rounded-xl p-4">
    <div className="text-sm leading-relaxed space-y-1">
      {renderMarkdown(data.content)}
    </div>
  </div>
);

export const ChecklistBlock = ({ data, objectId, blockIndex, onUpdate }) => {
  const handleToggle = async (itemIndex) => {
    if (!onUpdate) return;
    const newItems = data.items.map((item, i) => 
      i === itemIndex ? { ...item, checked: !item.checked } : item
    );
    await onUpdate(objectId, blockIndex, { ...data, items: newItems });
  };

  const handleReset = async () => {
    if (!onUpdate) return;
    if (!confirm('Vill du nollställa alla markeringar?')) return;
    const newItems = data.items.map(item => ({ ...item, checked: false }));
    await onUpdate(objectId, blockIndex, { ...data, items: newItems });
  };

  const checkedCount = data.items.filter(item => item.checked).length;
  const totalCount = data.items.length;

  return (
    <div className="bg-white/[0.03] rounded-xl overflow-hidden">
      {/* Header with progress */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-20 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{checkedCount}/{totalCount}</span>
        </div>
        {checkedCount > 0 && onUpdate && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-blue-400 transition-all"
            title="Nollställ alla markeringar"
          >
            <RotateCcw size={12} />
            <span>Nollställ</span>
          </button>
        )}
      </div>
      {/* Items */}
      <div className="divide-y divide-white/5">
        {data.items.map((item, i) => (
          <div 
            key={i}
            onClick={() => handleToggle(i)}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors group"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              item.checked ? 'bg-blue-500 border-blue-500' : 'border-gray-600 group-hover:border-blue-400'
            }`}>
              {item.checked && <Check size={14} className="text-white" />}
            </div>
            <span className={`text-sm transition-all ${
              item.checked ? 'text-gray-500 line-through' : 'text-gray-200'
            }`}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TodoBlock = ({ data, objectId, blockIndex, onUpdate }) => {
  const handleToggle = async (itemIndex) => {
    if (!onUpdate) return;
    const newItems = data.items.map((item, i) => 
      i === itemIndex ? { ...item, done: !item.done } : item
    );
    await onUpdate(objectId, blockIndex, { ...data, items: newItems });
  };

  const handleReset = async () => {
    if (!onUpdate) return;
    if (!confirm('Vill du nollställa alla markeringar?')) return;
    const newItems = data.items.map(item => ({ ...item, done: false }));
    await onUpdate(objectId, blockIndex, { ...data, items: newItems });
  };

  const totalItems = data.items.length;
  const doneItems = data.items.filter(item => item.done).length;
  const progress = totalItems > 0 ? (doneItems / totalItems) * 100 : 0;

  return (
    <div className="bg-white/[0.03] rounded-xl overflow-hidden">
      {/* Header with progress */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-20 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{doneItems}/{totalItems}</span>
        </div>
        {doneItems > 0 && onUpdate && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-green-400 transition-all"
            title="Nollställ alla markeringar"
          >
            <RotateCcw size={12} />
            <span>Nollställ</span>
          </button>
        )}
      </div>
      {/* Items */}
      <div className="divide-y divide-white/5">
        {data.items.map((item, i) => (
          <div 
            key={i}
            onClick={() => handleToggle(i)}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors group"
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              item.done ? 'bg-green-500 border-green-500' : 'border-gray-600 group-hover:border-green-400'
            }`}>
              {item.done && <Check size={14} className="text-white" />}
            </div>
            <span className={`text-sm transition-all ${
              item.done ? 'text-gray-500 line-through' : 'text-gray-200'
            }`}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LinksBlock = ({ data }) => {
  const items = data.items || [];
  const isSingleLink = items.length === 1;
  
  return (
    <div className={`${isSingleLink ? '' : 'bg-white/[0.03] rounded-xl overflow-hidden divide-y divide-white/5'}`}>
      {items.length === 0 ? (
        <div className="px-4 py-3 text-sm text-gray-500">Inga länkar</div>
      ) : (
        items.map((item, i) => {
          const IconComponent = getIconComponent(item.icon || 'Link');
          return (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2.5 hover:bg-white/[0.02] transition-colors group ${
                isSingleLink ? 'py-1' : 'px-4 py-3'
              }`}
            >
              <div className={`rounded-lg flex items-center justify-center flex-shrink-0 ${
                isSingleLink 
                  ? 'w-6 h-6 bg-white/5 group-hover:bg-white/10' 
                  : 'w-8 h-8 bg-purple-500/20'
              }`}>
                <IconComponent size={14} className="text-purple-400" />
              </div>
              <span className={`text-gray-200 flex-1 truncate group-hover:text-white transition-colors ${
                isSingleLink ? 'text-sm font-medium' : 'text-sm'
              }`}>
                {item.title || item.url}
              </span>
              <ExternalLink size={14} className="text-gray-500 group-hover:text-purple-400 transition-colors flex-shrink-0" />
            </a>
          );
        })
      )}
    </div>
  );
};

// Table templates definition
export const TABLE_TEMPLATES = {
  wishlist: {
    id: 'wishlist',
    name: 'Önskelista',
    icon: 'Gift',
    showSum: false,
    columns: [
      { id: 'who', label: 'Vem', type: 'text', width: 'w-20' },
      { id: 'item', label: 'Vad', type: 'text', width: 'flex-1' },
      { id: 'from', label: 'Från', type: 'text', width: 'w-20' },
      { id: 'done', label: '✓', type: 'checkbox', width: 'w-10' }
    ]
  },
  potluck: {
    id: 'potluck',
    name: 'Knytkalas',
    icon: 'UtensilsCrossed',
    showSum: false,
    columns: [
      { id: 'dish', label: 'Rätt', type: 'text', width: 'flex-1' },
      { id: 'who', label: 'Vem', type: 'text', width: 'w-24' },
      { id: 'portions', label: 'Port.', type: 'number', width: 'w-16' },
      { id: 'done', label: '✓', type: 'checkbox', width: 'w-10' }
    ]
  },
  tasks: {
    id: 'tasks',
    name: 'Uppgifter',
    icon: 'ClipboardList',
    showSum: false,
    columns: [
      { id: 'task', label: 'Uppgift', type: 'text', width: 'flex-1' },
      { id: 'who', label: 'Ansvarig', type: 'text', width: 'w-24' },
      { id: 'done', label: '✓', type: 'checkbox', width: 'w-10' }
    ]
  },
  shopping: {
    id: 'shopping',
    name: 'Inköpslista',
    icon: 'ShoppingCart',
    showSum: false,
    columns: [
      { id: 'item', label: 'Vara', type: 'text', width: 'flex-1' },
      { id: 'qty', label: 'Antal', type: 'number', width: 'w-16' },
      { id: 'done', label: '✓', type: 'checkbox', width: 'w-10' }
    ]
  },
  guests: {
    id: 'guests',
    name: 'Gästlista',
    icon: 'Users',
    showSum: false,
    columns: [
      { id: 'name', label: 'Namn', type: 'text', width: 'flex-1' },
      { id: 'note', label: 'Anteckning', type: 'text', width: 'w-32' },
      { id: 'confirmed', label: '✓', type: 'checkbox', width: 'w-10' }
    ]
  },
  contacts: {
    id: 'contacts',
    name: 'Kontakter',
    icon: 'UserCircle',
    showSum: false,
    columns: [
      { id: 'name', label: 'Namn', type: 'text', width: 'w-32' },
      { id: 'phone', label: 'Telefon', type: 'text', width: 'flex-1' }
    ]
  }
};

export const TableBlock = ({ data, objectId, blockIndex, onUpdate }) => {
  const template = TABLE_TEMPLATES[data.template] || TABLE_TEMPLATES.tasks;
  const columns = data.columns || template.columns;
  const rows = data.rows || [];

  const handleCheckboxToggle = async (rowIndex, colId) => {
    if (!onUpdate) return;
    const newRows = rows.map((row, i) => 
      i === rowIndex ? { ...row, [colId]: !row[colId] } : row
    );
    await onUpdate(objectId, blockIndex, { ...data, rows: newRows });
  };

  // Calculate sums for number columns (only if template allows it)
  const sums = {};
  const shouldShowSum = template.showSum !== false;
  if (shouldShowSum) {
    columns.forEach(col => {
      if (col.type === 'number') {
        sums[col.id] = rows.reduce((sum, row) => sum + (Number(row[col.id]) || 0), 0);
      }
    });
  }
  const hasNumberColumns = Object.keys(sums).length > 0;
  const hasSums = Object.values(sums).some(s => s > 0);

  // Count completed checkboxes
  const checkboxCol = columns.find(c => c.type === 'checkbox');
  const checkedCount = checkboxCol ? rows.filter(r => r[checkboxCol.id]).length : 0;
  const totalCount = rows.length;

  return (
    <div className="bg-white/[0.03] rounded-xl overflow-hidden">
      {/* Progress bar if has checkboxes */}
      {checkboxCol && totalCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
          <div className="h-1.5 w-20 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-300"
              style={{ width: `${(checkedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{checkedCount}/{totalCount}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[300px]">
          {/* Header */}
          <thead>
            <tr className="border-b border-white/10">
              {columns.map(col => (
                <th 
                  key={col.id} 
                  className={`px-3 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${col.width} ${col.type === 'checkbox' ? 'text-center' : ''} ${col.type === 'number' ? 'text-right' : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-sm text-gray-500">
                  Inga rader ännu
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={row.id || rowIndex} className="hover:bg-white/[0.02] transition-colors">
                  {columns.map(col => (
                    <td 
                      key={col.id} 
                      className={`px-3 py-2.5 ${col.width} ${col.type === 'number' ? 'text-right' : ''}`}
                    >
                      {col.type === 'checkbox' ? (
                        <button
                          onClick={() => handleCheckboxToggle(rowIndex, col.id)}
                          className="w-full flex justify-center"
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            row[col.id] ? 'bg-amber-500 border-amber-500' : 'border-gray-600 hover:border-amber-400'
                          }`}>
                            {row[col.id] && <Check size={14} className="text-white" />}
                          </div>
                        </button>
                      ) : col.type === 'number' ? (
                        <span className={`text-sm tabular-nums ${row[col.id] ? 'text-gray-200' : 'text-gray-500'}`}>
                          {row[col.id] || '–'}
                        </span>
                      ) : col.id === 'phone' && row[col.id] ? (
                        <a 
                          href={`tel:${row[col.id].replace(/\s/g, '')}`}
                          className="text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                          {row[col.id]}
                        </a>
                      ) : (
                        <span className={`text-sm ${row[col.id] ? 'text-gray-200' : 'text-gray-500'}`}>
                          {row[col.id] || '–'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {/* Footer with sums */}
          {hasNumberColumns && hasSums && (
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                {columns.map((col, i) => (
                  <td 
                    key={col.id} 
                    className={`px-3 py-2.5 ${col.width} ${col.type === 'number' ? 'text-right' : ''}`}
                  >
                    {i === 0 ? (
                      <span className="text-xs font-medium text-gray-400 uppercase">Summa</span>
                    ) : col.type === 'number' ? (
                      <span className="text-sm font-semibold text-amber-400 tabular-nums">
                        {sums[col.id]}
                      </span>
                    ) : null}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// DateTag Block - for marking years or date ranges
export const DateTagBlock = ({ data }) => {
  const tags = data.tags || [];
  
  const formatTag = (tag) => {
    if (tag.type === 'year') {
      return tag.value;
    } else if (tag.type === 'range') {
      const start = new Date(tag.start);
      const end = new Date(tag.end);
      const formatDate = (d) => d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      if (startYear === endYear) {
        return `${formatDate(start)} – ${formatDate(end)} ${startYear}`;
      }
      return `${formatDate(start)} ${startYear} – ${formatDate(end)} ${endYear}`;
    }
    return '';
  };

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, i) => (
        <div 
          key={i}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
            tag.type === 'year' 
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
          }`}
        >
          <Calendar size={14} />
          <span>{formatTag(tag)}</span>
        </div>
      ))}
    </div>
  );
};

export const blockComponents = {
  title: TitleBlock,
  location: LocationBlock,
  image: ImageBlock,
  text: TextBlock,
  checklist: ChecklistBlock,
  todo: TodoBlock,
  links: LinksBlock,
  table: TableBlock,
  datetag: DateTagBlock
};
