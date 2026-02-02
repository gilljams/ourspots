import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Map as MapIcon, X, Check, RotateCcw, ExternalLink, Calendar, Maximize2, Timer, Play, Pause, RotateCw, Vote, HelpCircle, Trophy, ChevronDown, Lock, Link, Plus, Wallet } from 'lucide-react';
import { getTransformedImageUrl, getFocalPointStyles } from '../../utils/imageUtils';
import { getIconComponent } from '../../utils/iconHelpers';

export const TitleBlock = ({ data }) => (
  <h2 className="text-2xl font-bold text-white mb-2">{data.text}</h2>
);

export const LocationBlock = ({ data, inherited, onDelete, canDelete, positionNumber, onShowOnMap, audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (audioUrl && !audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.preload = 'metadata';
      
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
      audioRef.current.addEventListener('error', () => {
        setAudioError(true);
        setIsPlaying(false);
      });
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  const toggleAudio = () => {
    if (!audioRef.current || audioError) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error('Audio play error:', err);
        setAudioError(true);
      });
      setIsPlaying(true);
    }
  };

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
      </div>
      {data.lat && data.lng && (
        <div className="flex items-center gap-1">
          {/* Audio play button - shown if audio URL exists */}
          {audioUrl && !audioError && (
            <button
              onClick={toggleAudio}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                isPlaying 
                  ? 'bg-purple-500/30 text-purple-300 ring-2 ring-purple-500/50 ring-offset-1 ring-offset-transparent' 
                  : 'bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400'
              }`}
              style={isPlaying ? { animation: 'pulse-glow 1s ease-in-out infinite' } : {}}
              title={isPlaying ? 'Pausa' : 'Spela'}
            >
              {isPlaying ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}
            </button>
          )}
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
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const focalStyles = getFocalPointStyles(data.focalPoint);
  
  // Get optimized full image URL - max 1600px wide for good mobile quality without being huge
  const getFullImageUrl = (url) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', '/upload/c_limit,w_1600,q_auto:good/');
  };
  
  // Reset loading state when opening fullscreen
  const openFullscreen = () => {
    setImageLoaded(false);
    setShowFullscreen(true);
  };
  
  return (
    <>
      <div className="relative w-full h-48 rounded-xl overflow-hidden mb-4 border border-white/10 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)]">
        <img 
          src={getTransformedImageUrl(data.url, data.focalPoint ? 'custom' : data.cropMode, 800, 480, data.focalPoint)} 
          alt="" 
          className="w-full h-full object-cover"
          style={focalStyles}
        />
        <button
          onClick={openFullscreen}
          className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/30 text-white/70 hover:text-white hover:bg-black/50 transition-all"
          title="Visa hela bilden"
        >
          <Maximize2 size={14} />
        </button>
      </div>
      
      {/* Fullscreen image modal */}
      {showFullscreen && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
          >
            <X size={24} />
          </button>
          {/* Loading spinner */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <img 
            src={getFullImageUrl(data.url)} 
            alt="" 
            className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onClick={(e) => e.stopPropagation()}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      )}
    </>
  );
};

// Lightweight markdown renderer - supports **bold**, *italic*, [links](url), > quotes, # headings, - bullets, numbered lists
export const renderMarkdown = (text) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null; // 'ul' or 'ol'
  let quoteLines = []; // For multi-line quotes
  
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
  
  const flushQuote = () => {
    if (quoteLines.length > 0) {
      elements.push(
        <blockquote key={`quote-${elements.length}`} className="border-l-2 border-blue-500/50 pl-3 my-2 text-gray-400 italic">
          {quoteLines.map((line, i) => <p key={i}>{formatInline(line)}</p>)}
        </blockquote>
      );
      quoteLines = [];
    }
  };
  
  const formatInline = (line) => {
    // Process links, bold and italic
    const parts = [];
    let remaining = line;
    let keyIndex = 0;
    
    while (remaining.length > 0) {
      // Check for [link](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      // Check for **bold**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Check for *italic* (but not **)
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      
      // Find the first match
      let firstMatch = null;
      let matchType = null;
      let matchIndex = Infinity;
      
      if (linkMatch && linkMatch.index < matchIndex) {
        firstMatch = linkMatch;
        matchType = 'link';
        matchIndex = linkMatch.index;
      }
      if (boldMatch && boldMatch.index < matchIndex) {
        firstMatch = boldMatch;
        matchType = 'bold';
        matchIndex = boldMatch.index;
      }
      if (italicMatch && italicMatch.index < matchIndex) {
        firstMatch = italicMatch;
        matchType = 'italic';
        matchIndex = italicMatch.index;
      }
      
      if (firstMatch) {
        // Add text before match
        if (firstMatch.index > 0) {
          parts.push(remaining.substring(0, firstMatch.index));
        }
        // Add formatted text
        if (matchType === 'link') {
          // Ensure URL is absolute
          let url = firstMatch[2];
          if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
          }
          parts.push(
            <a 
              key={keyIndex++} 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {firstMatch[1]}
            </a>
          );
        } else if (matchType === 'bold') {
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
    // Check for quote (> )
    const quoteMatch = line.match(/^>\s*(.*)/);
    // Check for H1 heading (# )
    const h1Match = line.match(/^#\s+(.+)/);
    // Check for H2 heading (## )
    const h2Match = line.match(/^##\s+(.+)/);
    // Check for bullet list (- or *)
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
    // Check for numbered list (1. 2. etc)
    const numberedMatch = line.match(/^\s*\d+\.\s+(.+)/);
    
    if (quoteMatch) {
      flushList();
      quoteLines.push(quoteMatch[1]);
    } else if (h2Match) {
      flushList();
      flushQuote();
      const isFirst = elements.length === 0;
      elements.push(<h3 key={`h2-${index}`} className={`text-base font-semibold text-white ${isFirst ? '' : 'mt-3'} mb-1`}>{formatInline(h2Match[1])}</h3>);
    } else if (h1Match) {
      flushList();
      flushQuote();
      const isFirst = elements.length === 0;
      elements.push(<h2 key={`h1-${index}`} className={`text-lg font-bold text-white ${isFirst ? '' : 'mt-4'} mb-2`}>{formatInline(h1Match[1])}</h2>);
    } else if (bulletMatch) {
      flushQuote();
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(<li key={`li-${index}`} className="text-gray-200">{formatInline(bulletMatch[1])}</li>);
    } else if (numberedMatch) {
      flushQuote();
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(<li key={`li-${index}`} className="text-gray-200">{formatInline(numberedMatch[1])}</li>);
    } else {
      flushList();
      flushQuote();
      if (line.trim() === '') {
        elements.push(<div key={`br-${index}`} className="h-2" />);
      } else {
        elements.push(<p key={`p-${index}`} className="text-gray-200">{formatInline(line)}</p>);
      }
    }
  });
  
  flushList();
  flushQuote();
  return elements;
};

export const TextBlock = ({ data }) => (
  <div className="bg-white/[0.03] rounded-xl p-4">
    <div className="text-sm leading-relaxed space-y-1">
      {renderMarkdown(data.content)}
    </div>
  </div>
);

// Contact block - compact display of phone, email, website
export const ContactBlock = ({ data }) => {
  const { phone, email, website } = data || {};
  const hasAny = phone || email || website;
  
  if (!hasAny) {
    return <div className="text-sm text-gray-500">Ingen kontaktinfo</div>;
  }
  
  // Ensure website has protocol
  const websiteUrl = website && !/^https?:\/\//i.test(website) ? 'https://' + website : website;
  // Clean phone for tel: link
  const phoneClean = phone ? phone.replace(/\s/g, '') : '';
  
  return (
    <div className="flex flex-wrap items-center gap-3">
      {phone && (
        <a
          href={`tel:${phoneClean}`}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-300 hover:text-blue-400 transition-all group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          <span className="text-sm">{phone}</span>
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-300 hover:text-blue-400 transition-all group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
            <rect width="20" height="16" x="2" y="4" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          <span className="text-sm truncate max-w-[180px]">{email}</span>
        </a>
      )}
      {website && (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-all"
          title={website.replace(/^https?:\/\//, '')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </a>
      )}
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
              {!isSingleLink && (
                <ExternalLink size={14} className="text-gray-500 group-hover:text-purple-400 transition-colors flex-shrink-0" />
              )}
            </a>
          );
        })
      )}
    </div>
  );
};

// Table templates definition
export const TABLE_TEMPLATES = {
  list: {
    id: 'list',
    name: 'Lista',
    icon: 'CheckSquare',
    showSum: false,
    hideHeader: true,
    useCollapse: true,
    columns: [
      { id: 'done', label: '✓', type: 'checkbox', width: 'w-8', hideInEditor: true },
      { id: 'item', label: 'Punkt', type: 'text', width: 'flex-1' }
    ]
  },
  wishlist: {
    id: 'wishlist',
    name: 'Önskelista',
    icon: 'Gift',
    showSum: false,
    useCollapse: true,
    columns: [
      { id: 'done', label: '✓', type: 'checkbox', width: 'w-8' },
      { id: 'who', label: 'Vem', type: 'text', width: 'w-20' },
      { id: 'item', label: 'Vad', type: 'text', width: 'flex-1' },
      { id: 'from', label: 'Från', type: 'text', width: 'w-20' }
    ]
  },
  tasks: {
    id: 'tasks',
    name: 'Uppgifter',
    icon: 'ClipboardList',
    showSum: false,
    useCollapse: true,
    columns: [
      { id: 'done', label: '✓', type: 'checkbox', width: 'w-8' },
      { id: 'task', label: 'Uppgift', type: 'text', width: 'flex-1' },
      { id: 'who', label: 'Ansvarig', type: 'text', width: 'w-24' }
    ]
  },
  shopping: {
    id: 'shopping',
    name: 'Inköpslista',
    icon: 'ShoppingCart',
    showSum: false,
    useCollapse: true,
    columns: [
      { id: 'done', label: '✓', type: 'checkbox', width: 'w-8' },
      { id: 'item', label: 'Vara', type: 'text', width: 'flex-1' },
      { id: 'qty', label: 'Antal', type: 'number', width: 'w-16' }
    ]
  },
  guests: {
    id: 'guests',
    name: 'Gästlista',
    icon: 'Users',
    showSum: false,
    useCollapse: true,
    columns: [
      { id: 'confirmed', label: '✓', type: 'checkbox', width: 'w-8' },
      { id: 'name', label: 'Namn', type: 'text', width: 'flex-1' },
      { id: 'note', label: 'Anteckning', type: 'text', width: 'w-32' }
    ]
  },
  contacts: {
    id: 'contacts',
    name: 'Kontakter',
    icon: 'UserCircle',
    showSum: false,
    useCollapse: true,
    columns: [
      { id: 'name', label: 'Namn', type: 'text', width: 'w-32' },
      { id: 'phone', label: 'Telefon', type: 'text', width: 'flex-1' }
    ]
  }
};

export const TableBlock = ({ data, objectId, blockIndex, onUpdate }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? false);
  const template = TABLE_TEMPLATES[data.template] || TABLE_TEMPLATES.tasks;
  const columns = data.columns || template.columns;
  const rows = data.rows || [];
  const title = data.title || '';

  // Sync collapsed state when defaultCollapsed changes (e.g., after editing)
  React.useEffect(() => {
    setIsCollapsed(data.defaultCollapsed ?? false);
  }, [data.defaultCollapsed]);

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

  // Count completed checkboxes (excluding header rows)
  const checkboxCol = columns.find(c => c.type === 'checkbox');
  const regularRows = rows.filter(r => !r.isHeader);
  const checkedCount = checkboxCol ? regularRows.filter(r => r[checkboxCol.id]).length : 0;
  const totalCount = regularRows.length;
  
  // Get non-checkbox columns for display
  const displayColumns = columns.filter(c => c.type !== 'checkbox');
  // Get the main text column (first text column)
  const mainTextCol = displayColumns.find(c => c.type === 'text');

  // For templates with collapse (all modern table types)
  if (template.useCollapse) {
    const Icon = getIconComponent(template.icon);
    
    // Determine icon color based on template
    const iconColorClass = {
      list: 'text-blue-400',
      wishlist: 'text-pink-400',
      tasks: 'text-amber-400',
      shopping: 'text-green-400',
      guests: 'text-purple-400',
      contacts: 'text-cyan-400'
    }[template.id] || 'text-blue-400';
    
    const progressColorClass = {
      list: 'from-blue-500 to-blue-400',
      wishlist: 'from-pink-500 to-pink-400',
      tasks: 'from-amber-500 to-amber-400',
      shopping: 'from-green-500 to-green-400',
      guests: 'from-purple-500 to-purple-400',
      contacts: 'from-cyan-500 to-cyan-400'
    }[template.id] || 'from-blue-500 to-blue-400';
    
    const checkboxColorClass = {
      list: 'bg-blue-500 border-blue-500',
      wishlist: 'bg-pink-500 border-pink-500',
      tasks: 'bg-amber-500 border-amber-500',
      shopping: 'bg-green-500 border-green-500',
      guests: 'bg-purple-500 border-purple-500',
      contacts: 'bg-cyan-500 border-cyan-500'
    }[template.id] || 'bg-blue-500 border-blue-500';
    
    const checkboxHoverClass = {
      list: 'hover:border-blue-400',
      wishlist: 'hover:border-pink-400',
      tasks: 'hover:border-amber-400',
      shopping: 'hover:border-green-400',
      guests: 'hover:border-purple-400',
      contacts: 'hover:border-cyan-400'
    }[template.id] || 'hover:border-blue-400';
    
    const headerColorClass = {
      list: 'text-blue-400',
      wishlist: 'text-pink-400',
      tasks: 'text-amber-400',
      shopping: 'text-green-400',
      guests: 'text-purple-400',
      contacts: 'text-cyan-400'
    }[template.id] || 'text-blue-400';

    return (
      <div className="space-y-2">
        {/* Collapsible header - matches other block headers */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center gap-2.5 py-2 group touch-manipulation"
        >
          <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <ChevronDown 
              size={14} 
              className={`text-gray-400 group-hover:text-white transition-all ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
            />
          </div>
          <div className="flex items-center gap-2">
            <Icon size={14} className={iconColorClass} />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
              {title || template.name}
            </span>
          </div>
          {checkboxCol && totalCount > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="h-1.5 w-14 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${progressColorClass} transition-all duration-300`}
                  style={{ width: `${(checkedCount / totalCount) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{checkedCount}/{totalCount}</span>
            </div>
          )}
        </button>
        
        {/* Collapsible content */}
        {!isCollapsed && (
          <div className="bg-white/[0.03] rounded-xl overflow-hidden">
            {regularRows.length === 0 && rows.filter(r => r.isHeader).length === 0 ? (
              <div className="px-3 py-3 text-center text-sm text-gray-500">
                Inga rader ännu
              </div>
            ) : (
              <div className="py-1">
                {rows.map((row, rowIndex) => (
                  row.isHeader ? (
                    // Header row - only shows text, no checkbox
                    <div 
                      key={row.id || rowIndex} 
                      className="px-3 py-1.5 mt-2 first:mt-0"
                    >
                      <span className={`text-xs font-semibold ${headerColorClass} uppercase tracking-wider`}>
                        {row.item || row.task || row.name || row.label || 'Rubrik'}
                      </span>
                    </div>
                  ) : (
                    // Regular row
                    <div 
                      key={row.id || rowIndex} 
                      className="flex items-start gap-3 px-3 py-2 hover:bg-white/[0.03] transition-colors"
                    >
                      {/* Checkbox first (if exists) */}
                      {checkboxCol && (
                        <button
                          onClick={() => handleCheckboxToggle(rowIndex, checkboxCol.id)}
                          className="flex-shrink-0 touch-manipulation mt-0.5"
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            row[checkboxCol.id] ? checkboxColorClass : `border-gray-600 ${checkboxHoverClass}`
                          }`}>
                            {row[checkboxCol.id] && <Check size={12} className="text-white" />}
                          </div>
                        </button>
                      )}
                      
                      {/* Display columns */}
                      {displayColumns.map((col, colIndex) => (
                        <span 
                          key={col.id}
                          className={`text-sm ${col.width === 'flex-1' ? 'flex-1' : 'flex-shrink-0'} ${
                            col.type === 'number' ? 'text-right tabular-nums w-12' : ''
                          } ${
                            checkboxCol && row[checkboxCol.id] ? 'text-gray-500 line-through' : 
                            (colIndex === 0 ? 'text-gray-200' : 'text-gray-400')
                          }`}
                        >
                          {col.id === 'phone' && row[col.id] ? (
                            <a 
                              href={`tel:${row[col.id].replace(/\s/g, '')}`}
                              className="text-blue-400 hover:text-blue-300 underline"
                              onClick={e => e.stopPropagation()}
                            >
                              {row[col.id]}
                            </a>
                          ) : (
                            row[col.id] || '–'
                          )}
                        </span>
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

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
          {!template.hideHeader && (
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
          )}

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
                          className="w-full flex justify-center py-1 touch-manipulation active:bg-white/[0.03]"
                        >
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            row[col.id] ? 'bg-amber-500 border-amber-500' : 'border-gray-600 hover:border-amber-400'
                          }`}>
                            {row[col.id] && <Check size={16} className="text-white" />}
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
      
      // Check if same day
      const sameDay = start.toDateString() === end.toDateString();
      if (sameDay) {
        return `${formatDate(start)} ${startYear}`;
      }
      
      if (startYear === endYear) {
        return `${formatDate(start)} – ${formatDate(end)} ${startYear}`;
      }
      return `${formatDate(start)} ${startYear} – ${formatDate(end)} ${endYear}`;
    }
    return '';
  };
  
  // Calculate countdown for range dates
  const getCountdown = (tag) => {
    if (tag.type !== 'range' || !tag.start) return null;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(tag.start);
    start.setHours(0, 0, 0, 0);
    
    const diffTime = start - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return null; // Past
    if (diffDays === 0) return { text: 'Idag!', highlight: true };
    if (diffDays === 1) return { text: 'Imorgon', highlight: true };
    if (diffDays <= 7) return { text: `om ${diffDays} dagar`, highlight: false };
    const weeks = Math.ceil(diffDays / 7);
    if (diffDays <= 60) return { text: `om ${weeks} ${weeks === 1 ? 'vecka' : 'veckor'}`, highlight: false };
    return null;
  };

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, i) => {
        const countdown = getCountdown(tag);
        return (
          <div 
            key={i}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              tag.type === 'year' 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                : countdown?.highlight
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            }`}
          >
            <Calendar size={14} />
            <span>{formatTag(tag)}</span>
            {countdown && (
              <span className={`text-xs ${countdown.highlight ? 'text-amber-300' : 'text-purple-400'}`}>
                · {countdown.text}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Timer Block - multiple countdown timers for recipes etc.
export const TimerBlock = ({ data }) => {
  const timers = data.timers || [];
  const [timerStates, setTimerStates] = useState(() => 
    timers.map(t => ({ 
      remaining: t.duration * 60, // Convert minutes to seconds
      isRunning: false,
      isFinished: false
    }))
  );
  const [expandedIndex, setExpandedIndex] = useState(null);
  const intervalRefs = useRef([]);
  const audioContextRef = useRef(null);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      intervalRefs.current.forEach(id => clearInterval(id));
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Initialize audio context on first user interaction (required for iOS)
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (iOS requirement)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Play alarm sound - iOS compatible
  const playAlarm = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      // Resume if needed
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const playBeep = (delay = 0) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = 880; // Higher pitch, more audible
        oscillator.type = 'sine';
        
        const startTime = ctx.currentTime + delay;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.25);
      };
      
      // Play 3 distinct beeps
      playBeep(0);
      playBeep(0.35);
      playBeep(0.7);
    } catch (e) {
      console.log('Audio not supported:', e);
    }
  };

  const startTimer = (index) => {
    // Initialize audio on user interaction
    initAudio();
    
    if (timerStates[index].isRunning || timerStates[index].remaining <= 0) return;
    
    // Auto-expand when starting
    setExpandedIndex(index);
    
    setTimerStates(prev => prev.map((s, i) => 
      i === index ? { ...s, isRunning: true, isFinished: false } : s
    ));

    intervalRefs.current[index] = setInterval(() => {
      setTimerStates(prev => {
        const newStates = [...prev];
        if (newStates[index].remaining <= 1) {
          clearInterval(intervalRefs.current[index]);
          newStates[index] = { ...newStates[index], remaining: 0, isRunning: false, isFinished: true };
          playAlarm();
          // Vibrate if supported
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        } else {
          newStates[index] = { ...newStates[index], remaining: newStates[index].remaining - 1 };
        }
        return newStates;
      });
    }, 1000);
  };

  const pauseTimer = (index) => {
    clearInterval(intervalRefs.current[index]);
    setTimerStates(prev => prev.map((s, i) => 
      i === index ? { ...s, isRunning: false } : s
    ));
  };

  const resetTimer = (index) => {
    clearInterval(intervalRefs.current[index]);
    setTimerStates(prev => prev.map((s, i) => 
      i === index ? { remaining: timers[i].duration * 60, isRunning: false, isFinished: false } : s
    ));
  };

  const dismissFinished = (index) => {
    resetTimer(index);
    setExpandedIndex(null);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes) => {
    if (minutes % 1 === 0) return `${minutes} min`;
    return `${minutes.toFixed(1)} min`;
  };

  if (timers.length === 0) {
    return <div className="text-sm text-gray-500">Inga timers</div>;
  }

  return (
    <div className="space-y-2">
      {timers.map((timer, index) => {
        const state = timerStates[index] || { remaining: timer.duration * 60, isRunning: false, isFinished: false };
        const progress = state.remaining / (timer.duration * 60);
        const isActive = state.isRunning || state.isFinished;
        const isExpanded = expandedIndex === index || isActive;
        
        // Compact view for inactive timers
        if (!isExpanded) {
          return (
            <button
              key={index}
              onClick={() => setExpandedIndex(index)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-all text-left group"
            >
              <Timer size={16} className="text-gray-400 group-hover:text-orange-400 transition-colors flex-shrink-0" />
              <span className="text-sm font-medium text-gray-200 truncate flex-1">{timer.label || 'Timer'}</span>
              <span className="text-sm text-gray-500 tabular-nums">({formatTime(state.remaining)})</span>
            </button>
          );
        }
        
        // Expanded view for active or selected timers - compact single row
        return (
          <div 
            key={index}
            onClick={(e) => {
              // Close if clicking outside buttons and not active
              if (!isActive && !e.target.closest('button')) {
                setExpandedIndex(null);
              }
            }}
            className={`px-3 py-2.5 rounded-xl border transition-all ${
              state.isFinished 
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                : state.isRunning 
                  ? 'bg-amber-500/10 border-amber-500/30' 
                  : 'bg-white/5 border-white/10'
            }`}
          >
            {/* Header row with name */}
            <div className="flex items-center gap-2 mb-2">
              <Timer size={14} className={state.isFinished ? 'text-green-400' : state.isRunning ? 'text-amber-400' : 'text-gray-400'} />
              <span className="text-sm font-medium text-white truncate flex-1">{timer.label || 'Timer'}</span>
              <span className="text-xs text-gray-500">({formatDuration(timer.duration)})</span>
            </div>
            
            {/* Compact control row: progress bar, time, buttons */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${state.isFinished ? 'bg-gradient-to-r from-green-500 to-emerald-400' : state.isRunning ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-blue-500'}`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              
              <span className={`text-base font-mono font-bold tabular-nums min-w-[3.5rem] text-right ${
                state.isFinished ? 'text-green-400' : state.isRunning ? 'text-amber-400' : 'text-white'
              }`}>
                {state.isFinished ? 'Klar!' : formatTime(state.remaining)}
              </span>
              
              {/* Control buttons inline */}
              {state.isFinished ? (
                <button
                  onClick={() => dismissFinished(index)}
                  className="w-9 h-9 rounded-lg bg-green-500/30 text-green-300 hover:bg-green-500/40 transition-colors flex items-center justify-center"
                  title="Stäng"
                >
                  <Check size={18} />
                </button>
              ) : (
                <>
                  {!state.isRunning ? (
                    <button
                      onClick={() => startTimer(index)}
                      className="w-9 h-9 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors flex items-center justify-center"
                      title="Starta"
                    >
                      <Play size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => pauseTimer(index)}
                      className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors flex items-center justify-center"
                      title="Pausa"
                    >
                      <Pause size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => resetTimer(index)}
                    className="w-9 h-9 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center"
                    title="Återställ"
                  >
                    <RotateCw size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Poll block - allows viewers to vote
export const PollBlock = ({ data, currentUser, onVote, shares = {}, userDisplayName = '', onClosePoll, canEdit = false, onAddOption, onRemoveOption }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [newSuggestionUrl, setNewSuggestionUrl] = useState('');
  const [showSuggestionInput, setShowSuggestionInput] = useState(false);
  const options = data.options || [];
  const votes = data.votes || {};
  const title = data.title || 'Omröstning';
  const pollType = data.pollType || 'date'; // 'date' or 'ranked'
  const isClosed = data.closed || false;
  const allowSuggestions = data.allowSuggestions || false;
  
  // Get current user's email key
  const getUserEmailKey = (email) => {
    if (!email) return null;
    return email.replace(/\./g, '_DOT_');
  };
  
  const currentUserKey = currentUser?.email ? getUserEmailKey(currentUser.email) : null;
  
  // Check if user has pending share (not accepted yet)
  // Note: 'inherited' status is auto-accepted, so only 'pending' should show the message
  const isPendingShare = currentUserKey && shares[currentUserKey]?.status === 'pending';
  
  // votes[emailKey] can be { displayName: string, votes: { optionId: voteType } } or legacy { optionId: voteType }
  const currentUserData = currentUserKey ? (votes[currentUserKey] || {}) : {};
  // Support both new format (votes nested) and legacy format (votes at root)
  const currentUserVotes = currentUserData.votes || (typeof currentUserData === 'object' && !currentUserData.displayName ? currentUserData : {});
  
  // Get all participants (owner + shared users)
  const getParticipants = () => {
    const participants = [];
    
    // Add all users who have voted
    Object.entries(votes).forEach(([emailKey, userData]) => {
      const email = emailKey.replace(/_DOT_/g, '.');
      // Support both new format and legacy format
      const userVotes = userData.votes || (typeof userData === 'object' && !userData.displayName ? userData : {});
      const displayName = userData.displayName || email.split('@')[0];
      
      // Only add if they have actual votes
      if (Object.keys(userVotes).length > 0) {
        participants.push({
          emailKey,
          email,
          displayName,
          votes: userVotes
        });
      }
    });
    
    return participants;
  };
  
  // Calculate results for each option
  const getOptionResults = (optionId) => {
    const participants = getParticipants();
    let yes = 0, no = 0, maybe = 0;
    const voterDetails = { yes: [], no: [], maybe: [] };
    
    participants.forEach(p => {
      const vote = p.votes[optionId];
      if (vote === 'yes') {
        yes++;
        voterDetails.yes.push(p.displayName);
      } else if (vote === 'no') {
        no++;
        voterDetails.no.push(p.displayName);
      } else if (vote === 'maybe') {
        maybe++;
        voterDetails.maybe.push(p.displayName);
      }
    });
    
    return { yes, no, maybe, total: participants.length, voterDetails };
  };
  
  // Find best option (most "yes" votes, least "no" votes as tiebreaker)
  const getBestOptions = () => {
    if (options.length === 0) return [];
    
    // Calculate scores for all options
    const optionScores = options.map(opt => {
      const results = getOptionResults(opt.id);
      const score = results.yes * 10 - results.no * 5 + results.maybe;
      return { option: opt, results, score };
    });
    
    // Find the best score
    const bestScore = Math.max(...optionScores.map(o => o.score));
    
    // Return all options with the best score
    return optionScores.filter(o => o.score === bestScore);
  };
  
  const handleVote = (optionId, voteType) => {
    if (!currentUserKey || !onVote || isClosed) return;
    
    // Toggle: if same vote, remove it
    const currentVote = currentUserVotes[optionId];
    const newVote = currentVote === voteType ? null : voteType;
    
    const newUserVotes = { ...currentUserVotes };
    if (newVote === null) {
      delete newUserVotes[optionId];
    } else {
      newUserVotes[optionId] = newVote;
    }
    
    // Save with displayName in new format
    const effectiveDisplayName = userDisplayName || currentUser?.email?.split('@')[0] || '';
    const newVotes = { 
      ...votes, 
      [currentUserKey]: {
        displayName: effectiveDisplayName,
        votes: newUserVotes
      }
    };
    onVote(newVotes);
  };
  
  // Handle ranked voting (1st, 2nd, 3rd place)
  const handleRankVote = (optionId, rank) => {
    if (!currentUserKey || !onVote || isClosed) return;
    
    const newUserVotes = { ...currentUserVotes };
    
    // Check if this option already has this rank
    if (newUserVotes[optionId] === rank) {
      // Toggle off
      delete newUserVotes[optionId];
    } else {
      // Remove this rank from any other option first
      Object.keys(newUserVotes).forEach(key => {
        if (newUserVotes[key] === rank) {
          delete newUserVotes[key];
        }
      });
      // Assign rank to this option
      newUserVotes[optionId] = rank;
    }
    
    const effectiveDisplayName = userDisplayName || currentUser?.email?.split('@')[0] || '';
    const newVotes = {
      ...votes,
      [currentUserKey]: {
        displayName: effectiveDisplayName,
        votes: newUserVotes
      }
    };
    onVote(newVotes);
  };
  
  // Calculate ranked scores (1st=3p, 2nd=2p, 3rd=1p)
  const getRankedScores = () => {
    const scores = {};
    options.forEach(opt => {
      scores[opt.id] = { first: 0, second: 0, third: 0, total: 0, voters: { first: [], second: [], third: [] } };
    });
    
    Object.entries(votes).forEach(([emailKey, userData]) => {
      const userVotes = userData.votes || (typeof userData === 'object' && !userData.displayName ? userData : {});
      const displayName = userData.displayName || emailKey.replace(/_DOT_/g, '.').split('@')[0];
      
      Object.entries(userVotes).forEach(([optionId, rank]) => {
        if (scores[optionId]) {
          if (rank === 1) {
            scores[optionId].first++;
            scores[optionId].total += 3;
            scores[optionId].voters.first.push(displayName);
          } else if (rank === 2) {
            scores[optionId].second++;
            scores[optionId].total += 2;
            scores[optionId].voters.second.push(displayName);
          } else if (rank === 3) {
            scores[optionId].third++;
            scores[optionId].total += 1;
            scores[optionId].voters.third.push(displayName);
          }
        }
      });
    });
    
    return scores;
  };
  
  const bestOptions = getBestOptions();
  const bestOptionIds = new Set(bestOptions.map(b => b.option.id));
  const rankedScores = pollType === 'ranked' ? getRankedScores() : null;
  
  // Sort options by score if closed (for ranked polls)
  // Tiebreaker: total points > gold count > silver count > bronze count
  const compareRankedOptions = (a, b) => {
    const scoreA = rankedScores[a.id] || { total: 0, first: 0, second: 0, third: 0 };
    const scoreB = rankedScores[b.id] || { total: 0, first: 0, second: 0, third: 0 };
    // First by total points
    if (scoreB.total !== scoreA.total) return scoreB.total - scoreA.total;
    // Then by gold medals
    if (scoreB.first !== scoreA.first) return scoreB.first - scoreA.first;
    // Then by silver medals
    if (scoreB.second !== scoreA.second) return scoreB.second - scoreA.second;
    // Then by bronze medals
    return scoreB.third - scoreA.third;
  };
  
  const sortedOptions = pollType === 'ranked' && isClosed && rankedScores
    ? [...options].sort(compareRankedOptions)
    : options;
  
  // Get winner(s) for ranked poll (considering tiebreaker)
  const getWinners = () => {
    if (!rankedScores || options.length === 0) return new Set();
    const sorted = [...options].sort(compareRankedOptions);
    const topScore = rankedScores[sorted[0]?.id];
    if (!topScore || topScore.total === 0) return new Set();
    // Find all with same score AND same medal counts
    return new Set(sorted.filter(opt => {
      const s = rankedScores[opt.id];
      return s && s.total === topScore.total && s.first === topScore.first && 
             s.second === topScore.second && s.third === topScore.third;
    }).map(opt => opt.id));
  };
  const rankedWinners = pollType === 'ranked' ? getWinners() : new Set();
  
  // Compact vote button component (for date poll)
  const VoteButton = ({ optionId, voteType, icon, activeClass }) => {
    const isActive = currentUserVotes[optionId] === voteType;
    const isDisabled = !currentUserKey || !onVote || isClosed;
    return (
      <button
        onClick={() => handleVote(optionId, voteType)}
        disabled={isDisabled}
        className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
          isActive 
            ? activeClass
            : `bg-white/5 text-gray-500 hover:bg-white/10 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`
        }`}
        title={voteType === 'yes' ? 'Kan' : voteType === 'no' ? 'Kan inte' : 'Kanske'}
      >
        {icon}
      </button>
    );
  };
  
  // Rank button component (for ranked poll)
  const RankButton = ({ optionId, rank }) => {
    const isActive = currentUserVotes[optionId] === rank;
    const isDisabled = !currentUserKey || !onVote || isClosed;
    const colors = {
      1: { active: 'bg-amber-500/30 text-amber-400 ring-1 ring-amber-500/50', label: '🥇' },
      2: { active: 'bg-gray-400/30 text-gray-300 ring-1 ring-gray-400/50', label: '🥈' },
      3: { active: 'bg-orange-700/30 text-orange-400 ring-1 ring-orange-600/50', label: '🥉' }
    };
    return (
      <button
        onClick={() => handleRankVote(optionId, rank)}
        disabled={isDisabled}
        className={`w-8 h-8 rounded-md flex items-center justify-center transition-all text-sm ${
          isActive 
            ? colors[rank].active
            : `bg-white/5 text-gray-500 hover:bg-white/10 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`
        }`}
        title={rank === 1 ? '1:a (3p)' : rank === 2 ? '2:a (2p)' : '3:a (1p)'}
      >
        {colors[rank].label}
      </button>
    );
  };
  
  if (options.length === 0) {
    return (
      <div className="text-gray-500 text-sm py-2">
        Inga alternativ har lagts till än.
      </div>
    );
  }
  
  const participants = getParticipants();
  
  return (
    <div className="space-y-2">
      {/* Closed badge if poll is closed */}
      {isClosed && (
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-gray-600/50 text-gray-400 flex items-center gap-1">
            <Lock size={10} />
            Avslutad
          </span>
        </div>
      )}
          {/* Options with voting */}
          {pollType === 'ranked' ? (
            // Ranked poll view
            <div className="space-y-2">
              {sortedOptions.map((option, idx) => {
                const score = rankedScores?.[option.id] || { first: 0, second: 0, third: 0, total: 0, voters: { first: [], second: [], third: [] } };
                const isWinner = isClosed && rankedWinners.has(option.id) && score.total > 0;
                
                return (
                  <div 
                    key={option.id} 
                    className={`flex items-center gap-3 p-2 rounded-lg ${isWinner ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : 'bg-white/5'}`}
                  >
                    {/* Winner/position indicator */}
                    <div className="w-5 flex-shrink-0 flex items-center justify-center">
                      {isWinner ? (
                        <Trophy size={14} className="text-amber-400" />
                      ) : isClosed ? (
                        <span className="text-xs text-gray-500">{idx + 1}.</span>
                      ) : null}
                    </div>
                    
                    {/* Option label with optional URL */}
                    <div className="flex-1 min-w-0">
                      {option.url ? (
                        <a 
                          href={option.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`text-sm truncate flex items-center gap-1.5 hover:underline ${isWinner ? 'text-amber-100 font-medium' : 'text-blue-400'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link size={12} className="flex-shrink-0" />
                          <span className="truncate">{option.label}</span>
                        </a>
                      ) : (
                        <span className={`text-sm truncate block ${isWinner ? 'text-white font-medium' : 'text-gray-300'}`}>
                          {option.label}
                        </span>
                      )}
                      {/* Score display */}
                      {(score.total > 0 || isClosed) && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="font-medium">{score.total}p</span>
                          {showDetails && score.total > 0 && (
                            <span className="truncate">
                              {score.first > 0 && `🥇${score.voters.first.join(', ')}`}
                              {score.second > 0 && ` 🥈${score.voters.second.join(', ')}`}
                              {score.third > 0 && ` 🥉${score.voters.third.join(', ')}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Rank buttons (only if not closed) */}
                    {!isClosed && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <RankButton optionId={option.id} rank={1} />
                        <RankButton optionId={option.id} rank={2} />
                        <RankButton optionId={option.id} rank={3} />
                      </div>
                    )}
                    
                    {/* Remove button space - always reserve space for alignment */}
                    {!isClosed && allowSuggestions && onRemoveOption && (
                      <div className="w-6 flex-shrink-0 flex justify-center">
                        {option.addedBy === currentUserKey && (
                          <button
                            onClick={() => onRemoveOption(option.id)}
                            className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Ta bort ditt förslag"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Date poll view (original)
            <div className="space-y-2">
              {sortedOptions.map((option) => {
                const results = getOptionResults(option.id);
                const isBest = bestOptionIds.has(option.id) && participants.length > 0 && results.yes > 0;
                const isTied = bestOptions.length > 1 && isBest;
                
                return (
                  <div 
                    key={option.id} 
                    className={`flex items-center gap-3 p-2 rounded-lg ${isBest ? 'bg-white/10' : 'bg-white/5'}`}
                  >
                    {/* Best indicator - always reserve space for consistent alignment */}
                    <div className="w-3.5 flex-shrink-0 flex items-center justify-center">
                      {isBest && (
                        <Trophy size={14} className={isTied ? 'text-amber-400/60' : 'text-amber-400'} />
                      )}
                    </div>
                    
                    {/* Option label and results */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm truncate block ${isBest ? 'text-white font-medium' : 'text-gray-300'}`}>
                        {option.label}
                      </span>
                      {/* Compact results */}
                      {participants.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{results.yes}/{participants.length}</span>
                          {showDetails && results.yes > 0 && (
                            <span className="truncate">({results.voterDetails.yes.join(', ')})</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Vote buttons (only if not closed) */}
                    {!isClosed && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <VoteButton 
                          optionId={option.id} 
                          voteType="yes" 
                          icon={<Check size={14} />} 
                          activeClass="bg-green-500/20 text-green-400"
                        />
                        <VoteButton 
                          optionId={option.id} 
                          voteType="maybe" 
                          icon={<HelpCircle size={14} />} 
                          activeClass="bg-amber-500/20 text-amber-400"
                        />
                        <VoteButton 
                          optionId={option.id} 
                          voteType="no" 
                          icon={<X size={14} />} 
                          activeClass="bg-red-500/20 text-red-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Footer with toggle, add suggestion, close button - all on one row */}
          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {/* Show names toggle */}
              {participants.length > 0 || (pollType === 'ranked' && Object.keys(votes).length > 0) ? (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
                >
                  <ChevronDown size={12} className={`transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                  {showDetails ? 'Kompakt' : 'Visa namn'}
                </button>
              ) : (
                <span className="text-xs text-gray-500">Ingen har röstat än</span>
              )}
              
              {/* Add suggestion - inline in footer */}
              {allowSuggestions && !isClosed && currentUserKey && onAddOption && (
                showSuggestionInput ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    <input
                      type="text"
                      value={newSuggestion}
                      onChange={(e) => setNewSuggestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSuggestion.trim()) {
                          onAddOption(newSuggestion.trim(), currentUserKey, pollType === 'ranked' ? newSuggestionUrl.trim() : null);
                          setNewSuggestion('');
                          setNewSuggestionUrl('');
                          setShowSuggestionInput(false);
                        } else if (e.key === 'Escape') {
                          setNewSuggestion('');
                          setNewSuggestionUrl('');
                          setShowSuggestionInput(false);
                        }
                      }}
                      placeholder="Förslag..."
                      className="w-24 px-2 py-0.5 text-xs bg-white/10 border border-white/20 rounded focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                      autoFocus
                    />
                    {pollType === 'ranked' && (
                      <input
                        type="url"
                        value={newSuggestionUrl}
                        onChange={(e) => setNewSuggestionUrl(e.target.value)}
                        placeholder="URL (valfritt)"
                        className="w-28 px-2 py-0.5 text-xs bg-white/10 border border-white/20 rounded focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                      />
                    )}
                    <button
                      onClick={() => {
                        if (newSuggestion.trim()) {
                          onAddOption(newSuggestion.trim(), currentUserKey, pollType === 'ranked' ? newSuggestionUrl.trim() : null);
                          setNewSuggestion('');
                          setNewSuggestionUrl('');
                          setShowSuggestionInput(false);
                        }
                      }}
                      disabled={!newSuggestion.trim()}
                      className="p-0.5 text-green-400 hover:bg-green-500/20 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Lägg till"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setNewSuggestion('');
                        setNewSuggestionUrl('');
                        setShowSuggestionInput(false);
                      }}
                      className="p-0.5 text-gray-400 hover:bg-white/10 rounded"
                      title="Avbryt"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSuggestionInput(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Föreslå
                  </button>
                )
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!currentUserKey && !isClosed && (
                <span className="text-xs text-gray-500 italic">Logga in för att rösta</span>
              )}
              {currentUserKey && isPendingShare && !isClosed && (
                <span className="text-xs text-amber-500 italic">Acceptera delningen för att rösta</span>
              )}
              {canEdit && !isClosed && onClosePoll && (
                <button
                  onClick={() => {
                    if (window.confirm('Vill du avsluta omröstningen? Ingen kan rösta efteråt.')) {
                      onClosePoll();
                    }
                  }}
                  className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"
                >
                  <Lock size={10} />
                  Avsluta
                </button>
              )}
            </div>
          </div>
    </div>
  );
};

// Audio Block - play audio files (admin-only creation)
export const AudioBlock = ({ data }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  const title = data.title || 'Ljudfil';
  const url = data.url || '';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError('Kunde inte ladda ljudfilen');
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => {
        console.error('Play error:', err);
        setError('Kunde inte spela upp');
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!url) {
    return (
      <div className="p-3 bg-white/5 rounded-lg text-gray-500 text-sm">
        Ingen ljudfil angiven
      </div>
    );
  }

  return (
    <div className="p-3 bg-white/5 rounded-lg">
      <audio ref={audioRef} src={url} preload="metadata" />
      
      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          disabled={isLoading || error}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
            error 
              ? 'bg-red-500/20 text-red-400 cursor-not-allowed'
              : isLoading
                ? 'bg-white/10 text-gray-500'
                : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
          }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={18} />
          ) : (
            <Play size={18} className="ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="text-sm text-white font-medium truncate mb-1">
            {title}
          </div>

          {/* Progress bar */}
          <div 
            className="h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Time display */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-400">{error}</div>
      )}
    </div>
  );
};

// Split Block - expense sharing for trips etc.
export const SplitBlock = ({ data, currentUser, shares = {}, canEdit = false, onUpdateAmount, onCloseSplit }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const [myAmount, setMyAmount] = useState('');
  const [hasEdited, setHasEdited] = useState(false);
  
  const title = data.title || 'Splitt';
  const model = data.model || 'individual'; // 'individual' or 'family'
  const participants = data.participants || [];
  const isClosed = data.closed || false;
  const currency = data.currency || 'kr';
  
  const currentUserEmail = currentUser?.email?.toLowerCase();
  
  // Find current user's participant data
  const myParticipant = participants.find(p => p.email?.toLowerCase() === currentUserEmail);
  const otherParticipants = participants.filter(p => p.email?.toLowerCase() !== currentUserEmail);
  
  // Calculate totals - each participant has their own "paid" amount
  const totalPaid = participants.reduce((sum, p) => sum + (parseFloat(p.paid) || 0), 0);
  const totalWeight = participants.reduce((sum, p) => sum + (p.weight || 1), 0);
  
  // Sync collapsed state when defaultCollapsed changes
  React.useEffect(() => {
    setIsCollapsed(data.defaultCollapsed ?? true);
  }, [data.defaultCollapsed]);
  
  // Sync myAmount with saved value (but only if user hasn't edited)
  React.useEffect(() => {
    if (!hasEdited && myParticipant) {
      const savedPaid = parseFloat(myParticipant.paid) || 0;
      setMyAmount(savedPaid > 0 ? savedPaid.toString() : '');
    }
  }, [myParticipant?.paid, hasEdited]);
  
  // Calculate per-participant data
  const getParticipantData = (participant) => {
    const paid = parseFloat(participant.paid) || 0;
    const share = totalWeight > 0 ? (totalPaid * (participant.weight || 1)) / totalWeight : 0;
    const balance = paid - share;
    return { paid, share, balance };
  };
  
  // Generate settlement suggestions (minimize transactions)
  const getSettlements = () => {
    if (participants.length < 2) return [];
    
    // Calculate balances
    const balances = participants.map(p => ({
      ...p,
      ...getParticipantData(p)
    })).filter(p => Math.abs(p.balance) >= 0.5); // Ignore tiny differences
    
    const debtors = balances.filter(p => p.balance < -0.5).map(p => ({ ...p, balance: Math.abs(p.balance) }));
    const creditors = balances.filter(p => p.balance > 0.5);
    
    const settlements = [];
    
    // Sort for optimal matching
    debtors.sort((a, b) => b.balance - a.balance);
    creditors.sort((a, b) => b.balance - a.balance);
    
    // Match debtors to creditors
    for (const debtor of debtors) {
      let remaining = debtor.balance;
      for (const creditor of creditors) {
        if (remaining < 0.5 || creditor.balance < 0.5) continue;
        
        const amount = Math.min(remaining, creditor.balance);
        if (amount >= 0.5) {
          settlements.push({
            from: debtor.name || debtor.email,
            to: creditor.name || creditor.email,
            amount: Math.round(amount)
          });
          remaining -= amount;
          creditor.balance -= amount;
        }
      }
    }
    
    return settlements;
  };
  
  const handleSaveMyAmount = () => {
    if (onUpdateAmount && myParticipant) {
      onUpdateAmount(myParticipant.email, parseFloat(myAmount) || 0);
      setHasEdited(false);
    }
  };
  
  const formatAmount = (amount) => {
    return Math.round(amount).toLocaleString('sv-SE');
  };
  
  // Check if my amount has changed from saved
  const myPaid = myParticipant ? (parseFloat(myParticipant.paid) || 0) : 0;
  const myAmountNum = parseFloat(myAmount) || 0;
  const hasUnsavedChanges = myParticipant && myAmountNum !== myPaid;
  
  if (participants.length === 0) {
    return (
      <div className="bg-white/[0.03] rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Wallet size={18} className="text-green-400" />
          <span className="text-sm">{title} – inga deltagare tillagda än</span>
        </div>
      </div>
    );
  }
  
  // Count how many have paid
  const paidCount = participants.filter(p => (parseFloat(p.paid) || 0) > 0).length;
  
  return (
    <div className="space-y-2">
      {/* Collapsible header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-2.5 py-2 group touch-manipulation"
      >
        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
          <ChevronDown 
            size={14} 
            className={`text-gray-400 group-hover:text-white transition-all ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
          />
        </div>
        <div className="flex items-center gap-2">
          <Wallet size={14} className="text-green-400" />
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
            {title}
          </span>
          {isClosed && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-600/50 text-gray-400 flex items-center gap-1">
              <Lock size={10} />
              Avslutad
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {totalPaid > 0 && (
            <span className="text-xs text-gray-400">{formatAmount(totalPaid)} {currency}</span>
          )}
          <span className="text-xs text-gray-500">{paidCount}/{participants.length}</span>
        </div>
      </button>
      
      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="bg-white/[0.03] rounded-xl p-4 space-y-3">
          {/* My input section - only if I'm a participant and not closed */}
          {myParticipant && !isClosed && onUpdateAmount && (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-400">Jag har lagt ut:</div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={myAmount}
                    onChange={(e) => { setMyAmount(e.target.value); setHasEdited(true); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMyAmount(); }}
                    placeholder="0"
                    className="w-full px-2 py-1.5 pr-8 text-sm bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-green-500 text-white placeholder-gray-600 text-right"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{currency}</span>
                </div>
                <button
                  onClick={handleSaveMyAmount}
                  disabled={!hasUnsavedChanges}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    hasUnsavedChanges 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Spara
                </button>
              </div>
              {/* My balance */}
              {totalPaid > 0 && (() => {
                const { balance } = getParticipantData(myParticipant);
                return (
                  <div className={`text-xs ${balance > 0.5 ? 'text-green-400' : balance < -0.5 ? 'text-red-400' : 'text-gray-500'}`}>
                    {balance > 0.5 ? `Du får tillbaka ${formatAmount(balance)} ${currency}` : 
                     balance < -0.5 ? `Du är skyldig ${formatAmount(Math.abs(balance))} ${currency}` : 
                     'Du är kvitt'}
                  </div>
                );
              })()}
            </div>
          )}
          
          {/* My amount display - if I'm a participant but can't edit (closed) */}
          {myParticipant && (isClosed || !onUpdateAmount) && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <span className="text-sm text-green-300 font-medium">
                {myParticipant.name || 'Jag'}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-white">{formatAmount(myPaid)} {currency}</span>
                {totalPaid > 0 && (() => {
                  const { balance } = getParticipantData(myParticipant);
                  return (
                    <span className={`text-sm font-medium ${balance > 0.5 ? 'text-green-400' : balance < -0.5 ? 'text-red-400' : 'text-gray-500'}`}>
                      {balance > 0.5 ? '+' : ''}{formatAmount(balance)}
                    </span>
                  );
                })()}
              </div>
            </div>
          )}
          
          {/* Other participants - compact list */}
          {otherParticipants.length > 0 && (
            <div className="space-y-1">
              {otherParticipants.map((participant, idx) => {
                const { paid, balance } = getParticipantData(participant);
                return (
                  <div 
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-2 text-sm"
                  >
                    <span className="text-gray-400 truncate">
                      {participant.name || participant.email?.split('@')[0]}
                      {model === 'family' && <span className="text-gray-600 ml-1">×{participant.weight}</span>}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={paid > 0 ? 'text-gray-300' : 'text-gray-600'}>
                        {paid > 0 ? `${formatAmount(paid)} ${currency}` : '–'}
                      </span>
                      {totalPaid > 0 && (
                        <span className={`min-w-[60px] text-right ${balance > 0.5 ? 'text-green-400' : balance < -0.5 ? 'text-red-400' : 'text-gray-600'}`}>
                          {balance > 0.5 ? '+' : ''}{formatAmount(balance)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      
      {/* Total */}
      {totalPaid > 0 && (
        <div className="flex items-center justify-between text-sm pt-2 border-t border-white/10">
          <span className="text-gray-400">Totalt</span>
          <span className="text-white font-medium">{formatAmount(totalPaid)} {currency}</span>
        </div>
      )}
      
      {/* Settlement suggestions (when closed or has amounts) */}
      {isClosed && totalPaid > 0 && (
        <div className="pt-2 border-t border-white/10">
          <div className="text-xs text-gray-400 mb-2">Swisha:</div>
          {getSettlements().length > 0 ? (
            <div className="space-y-1">
              {getSettlements().map((s, idx) => (
                <div key={idx} className="text-sm text-gray-300 bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-red-400">{s.from}</span>
                  {' → '}
                  <span className="font-medium text-white">{formatAmount(s.amount)} {currency}</span>
                  {' → '}
                  <span className="text-green-400">{s.to}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Alla är kvitt! 🎉</div>
          )}
        </div>
      )}
      
      {/* Close button for editor */}
      {canEdit && !isClosed && onCloseSplit && totalPaid > 0 && (
        <div className="pt-2 border-t border-white/10">
          <button
            onClick={() => {
              if (window.confirm('Vill du avsluta splitten? Inga ändringar kan göras efteråt.')) {
                onCloseSplit();
              }
            }}
            className="w-full py-2 text-sm text-amber-500 hover:bg-amber-500/10 rounded-lg flex items-center justify-center gap-1"
          >
            <Lock size={12} />
            Avsluta & visa swish
          </button>
        </div>
      )}
        </div>
      )}
    </div>
  );
};

export const blockComponents = {
  title: TitleBlock,
  location: LocationBlock,
  image: ImageBlock,
  text: TextBlock,
  contact: ContactBlock,
  links: LinksBlock,
  table: TableBlock,
  datetag: DateTagBlock,
  timer: TimerBlock,
  poll: PollBlock,
  audio: AudioBlock,
  split: SplitBlock
};
