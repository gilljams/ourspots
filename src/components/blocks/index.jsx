import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Map as MapIcon, X, Check, RotateCcw, ExternalLink, Calendar, Maximize2, Timer, Play, Pause, RotateCw, Vote, HelpCircle, Trophy, ChevronDown, Lock, Link, Plus, Wallet, ChevronRight, User, TriangleIcon, Edit2, Car, ClipboardList, Users, Minus, Copy, MessageCircle } from 'lucide-react';
import { getTransformedImageUrl, getFocalPointStyles } from '../../utils/imageUtils';
import { getIconComponent } from '../../utils/iconHelpers';

export const TitleBlock = ({ data }) => (
  <h2 className="text-2xl font-bold text-white mb-2">{data.text}</h2>
);

export const LocationBlock = ({ data, inherited, onDelete, canDelete, positionNumber, isPrimaryLocation, onShowOnMap, onEditNote, hasAudio, isAudioPlaying, onToggleAudio, isCollection, collectionPlacesCount, onShowCollectionMap, whatsappGroupUrl, isExtraLocation }) => {

  const handleShowOnMap = () => {
    if (onShowOnMap && data.lat && data.lng) {
      onShowOnMap({ lat: data.lat, lng: data.lng });
    }
  };
  
  const handleDelete = () => {
    if (window.confirm('Ta bort denna position?')) {
      onDelete();
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

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin size={16} className="text-gray-400 flex-shrink-0" />
          {isPrimaryLocation && (
            <span className="text-xs font-medium text-blue-400">
              primär
            </span>
          )}
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
          {/* Collection: WhatsApp button */}
          {isCollection && whatsappGroupUrl && (
            <button
              onClick={() => window.open(whatsappGroupUrl, '_blank')}
              className="w-9 h-9 rounded-lg bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center text-green-400 hover:text-green-300 transition-all flex-shrink-0"
              title="WhatsApp-grupp"
            >
              <MessageCircle size={16} />
            </button>
          )}
          {/* Audio play button - shown if audio exists (centralized playback) */}
          {hasAudio && (
            <button
              onClick={onToggleAudio}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                isAudioPlaying 
                  ? 'bg-blue-500/30 text-blue-300 ring-2 ring-blue-500/50 ring-offset-1 ring-offset-transparent' 
                  : 'bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400'
              }`}
              style={isAudioPlaying ? { animation: 'pulse-glow 1s ease-in-out infinite' } : {}}
              title={isAudioPlaying ? 'Pausa' : 'Spela'}
            >
              {isAudioPlaying ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}
            </button>
          )}
          {/* Collection: Show all places on map button */}
          {isCollection && collectionPlacesCount > 0 && onShowCollectionMap && (
            <button
              onClick={onShowCollectionMap}
              className="h-9 px-3 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-all"
              title="Visa alla platser på karta"
            >
              <MapIcon size={16} />
              <span className="text-sm font-medium">{collectionPlacesCount} {collectionPlacesCount === 1 ? 'plats' : 'platser'}</span>
            </button>
          )}
          {/* Non-collection: Show on map button */}
          {!isCollection && onShowOnMap && (
            <button
              onClick={handleShowOnMap}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
              title="Visa på karta"
            >
              <MapIcon size={16} />
            </button>
          )}
          {/* Google Maps button - only for primary location, not extras */}
          {!isCollection && !isExtraLocation && (
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
          )}
          {/* Waze button - only for primary location, not extras */}
          {!isCollection && !isExtraLocation && (
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
          )}
          {/* Edit note button */}
          {onEditNote && (
            <button
              onClick={onEditNote}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
              title={data.note ? 'Redigera anteckning' : 'Lägg till anteckning'}
            >
              <Edit2 size={16} />
            </button>
          )}
          {/* Delete button */}
          {canDelete && onDelete && (
            <button
              onClick={handleDelete}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
              title="Ta bort position"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
      </div>
      {/* Show note if available */}
      {data.note && (
        <div className="ml-6 text-xs text-gray-500 italic">
          "{data.note}"
        </div>
      )}
    </div>
  );
};

export const ImageBlock = ({ data, isPlaying = false, animation = 'none' }) => {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [animationActive, setAnimationActive] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [showZanettiText, setShowZanettiText] = useState(false);
  const focalStyles = getFocalPointStyles(data.focalPoint);
  
  // Get optimized full image URL - max 1600px wide for good mobile quality without being huge
  const getFullImageUrl = (url) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', '/upload/c_limit,w_1600,q_auto:good/');
  };
  
  // Handle animation start/stop based on audio playing state
  useEffect(() => {
    if (isPlaying && animation !== 'none' && !animationActive) {
      setAnimationKey(prev => prev + 1); // Reset animation
      setAnimationActive(true);
      setShowZanettiText(false);
    } else if (!isPlaying && animationActive) {
      // Fade out animation smoothly
      setAnimationActive(false);
      setShowZanettiText(false);
    }
  }, [isPlaying, animation, animationActive]);
  
  // Separat useEffect för Zanetti-text timer
  useEffect(() => {
    let showTimer;
    let hideTimer;
    if (animationActive && animation === 'cykel') {
      showTimer = setTimeout(() => {
        setShowZanettiText(true);
      }, 7000);
      // Göm texten efter 3 sekunder
      hideTimer = setTimeout(() => {
        setShowZanettiText(false);
      }, 10000);
    }
    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [animationActive, animation]);
  
  // Reset loading state when opening fullscreen
  const openFullscreen = () => {
    setImageLoaded(false);
    setShowFullscreen(true);
  };
  
  // Get animation image source
  const getAnimationImage = () => {
    if (animation === 'cykel') return '/media/cykel.png';
    if (animation === 'gris') return '/media/gris.png';
    return null;
  };
  
  return (
    <>
      <div className="relative w-full h-48 lg:h-auto lg:aspect-[16/9] rounded-xl overflow-hidden mb-4 border border-white/10 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)]">
        <img 
          src={getTransformedImageUrl(data.url, data.focalPoint ? 'custom' : data.cropMode, 800, 480, data.focalPoint)} 
          alt="" 
          className={`w-full h-full object-cover transition-transform ${animationActive ? 'image-ken-burns' : ''}`}
          style={focalStyles}
        />
        
        {/* Animation overlay */}
        {animationActive && animation !== 'none' && (
          <div 
            key={animationKey}
            className="animation-plupp-container"
          >
            <div className={animation === 'gris' ? 'animation-plupp-gris' : 'animation-plupp'}>
              <img 
                src={getAnimationImage()} 
                alt="" 
                className="animation-plupp-img"
              />
            </div>
          </div>
        )}
        
        {/* Zanetti text för cykel-animation */}
        {showZanettiText && animation === 'cykel' && (
          <>
            <div className="italian-flag-wave" />
            <div className="zanetti-text-container">
              <span className="zanetti-text">Han är Zanetti</span>
            </div>
          </>
        )}
        
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

// Copyable code block component with touch support
const CodeBlockCopyable = ({ code }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for older browsers/mobile
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };
  
  return (
    <pre 
      className="bg-black/40 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto cursor-pointer hover:bg-black/50 active:bg-black/60 transition-colors group relative touch-manipulation"
      onClick={handleCopy}
      onTouchEnd={handleCopy}
    >
      <code className="text-sm font-mono text-blue-400 whitespace-pre">
        {code}
      </code>
      <span className={`absolute top-2 right-2 flex items-center gap-1 text-xs transition-all ${copied ? 'text-green-400 opacity-100 scale-110' : 'text-gray-400 opacity-70 sm:opacity-0 sm:group-hover:opacity-100'}`}>
        {copied ? (
          <Check size={16} />
        ) : (
          <Copy size={16} />
        )}
      </span>
    </pre>
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
  let codeBlockLines = []; // For code blocks
  let inCodeBlock = false;
  
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
  
  const flushCodeBlock = () => {
    if (codeBlockLines.length > 0) {
      const codeContent = codeBlockLines.join('\n');
      elements.push(
        <CodeBlockCopyable key={`code-${elements.length}`} code={codeContent} />
      );
      codeBlockLines = [];
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
    // Check for code block start/end (```)
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        // Start of code block
        flushList();
        flushQuote();
        inCodeBlock = true;
      }
      return; // Skip the ``` line itself
    }
    
    // If inside code block, just collect lines
    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }
    
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
  flushCodeBlock(); // In case code block wasn't closed
  return elements;
};

// Section block - visual separator with title
export const SectionBlock = ({ data }) => {
  const title = data.title || 'Sektion';
  const isUppercase = data.uppercase !== false; // Default to uppercase
  
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-blue-500/50" />
      <span className={`text-sm font-semibold text-blue-400 tracking-wide ${isUppercase ? 'uppercase' : ''}`}>
        {title}
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-blue-500/30 to-blue-500/50" />
    </div>
  );
};

export const TextBlock = ({ data, onExpand, canEdit, onEditContent }) => {
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
            {title}
          </span>
        </div>
      </button>
      
      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="bg-white/[0.03] rounded-xl p-4 relative">
          {/* Edit button for owners/editors */}
          {canEdit && onEditContent && (
            <button
              onClick={handleEditClick}
              className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
              title="Redigera text"
            >
              <Edit2 size={14} />
            </button>
          )}
          <div className="text-sm leading-relaxed space-y-1">
            {renderMarkdown(data.content)}
          </div>
        </div>
      )}
    </div>
  );
};

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
      { id: 'done', label: '', type: 'checkbox', width: 'w-8', hideInEditor: true },
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
      { id: 'done', label: '', type: 'checkbox', width: 'w-8' },
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
      { id: 'done', label: '', type: 'checkbox', width: 'w-8' },
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
      { id: 'done', label: '', type: 'checkbox', width: 'w-8' },
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
      { id: 'confirmed', label: '', type: 'checkbox', width: 'w-8' },
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

export const TableBlock = ({ data, objectId, blockIndex, onUpdate, onExpand }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? false);
  const blockRef = useRef(null);
  const template = TABLE_TEMPLATES[data.template] || TABLE_TEMPLATES.tasks;
  const columns = data.columns || template.columns;
  const rows = data.rows || [];
  const title = data.title || '';

  // Sync collapsed state when defaultCollapsed changes (e.g., after editing)
  React.useEffect(() => {
    setIsCollapsed(data.defaultCollapsed ?? false);
  }, [data.defaultCollapsed]);
  
  // Scroll into view when expanded
  const handleToggleCollapse = () => {
    const wasCollapsed = isCollapsed;
    setIsCollapsed(!isCollapsed);
    if (wasCollapsed && onExpand) {
      setTimeout(() => onExpand(blockRef.current), 100);
    }
  };

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
            <Icon size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
              {title || template.name}
            </span>
          </div>
          {checkboxCol && totalCount > 0 && (
            <div className="flex items-center gap-2 ml-2">
              <div className="h-1.5 w-12 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${progressColorClass} transition-all duration-300`}
                  style={{ width: `${(checkedCount / totalCount) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 tabular-nums">{checkedCount}/{totalCount}</span>
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
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => {
        const countdown = getCountdown(tag);
        return (
          <div 
            key={i}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${
              countdown?.highlight
                ? 'bg-amber-500/15 text-amber-200 border border-amber-500/20'
                : 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
            }`}
          >
            <Calendar size={12} />
            <span>{formatTag(tag)}</span>
            {countdown && (
              <span className={`text-xs ${countdown.highlight ? 'text-amber-300' : 'text-blue-400'}`}>
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
export const PollBlock = ({ data, currentUser, onVote, shares = {}, userDisplayName = '', onClosePoll, canEdit = false, onAddOption, onRemoveOption, onExpand }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? false);
  const [showDetails, setShowDetails] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [newSuggestionUrl, setNewSuggestionUrl] = useState('');
  const [showSuggestionInput, setShowSuggestionInput] = useState(false);
  const blockRef = useRef(null);
  const options = data.options || [];
  const votes = data.votes || {};
  const title = data.title || 'Omröstning';
  const pollType = data.pollType || 'date'; // 'date' or 'ranked'
  const isClosed = data.closed || false;
  const allowSuggestions = data.allowSuggestions || false;
  
  // Sync collapsed state when defaultCollapsed changes
  React.useEffect(() => {
    setIsCollapsed(data.defaultCollapsed ?? false);
  }, [data.defaultCollapsed]);
  
  // Scroll into view when expanded
  const handleToggleCollapse = () => {
    const wasCollapsed = isCollapsed;
    setIsCollapsed(!isCollapsed);
    if (wasCollapsed && onExpand) {
      setTimeout(() => onExpand(blockRef.current), 100);
    }
  };
  
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
      1: { active: 'bg-amber-500/30 text-amber-400 ring-1 ring-amber-500/50', inactive: 'text-amber-400/50' },
      2: { active: 'bg-gray-400/30 text-gray-300 ring-1 ring-gray-400/50', inactive: 'text-gray-400/50' },
      3: { active: 'bg-orange-700/30 text-orange-500 ring-1 ring-orange-600/50', inactive: 'text-orange-500/50' }
    };
    return (
      <button
        onClick={() => handleRankVote(optionId, rank)}
        disabled={isDisabled}
        className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
          isActive 
            ? colors[rank].active
            : `bg-white/5 ${colors[rank].inactive} hover:bg-white/10 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`
        }`}
        title={rank === 1 ? '1:a (3p)' : rank === 2 ? '2:a (2p)' : '3:a (1p)'}
      >
        <Trophy size={14} />
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
          <Vote size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
            {title}
          </span>
        </div>
        {isClosed ? (
          <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-500 flex items-center gap-1.5">
            <Lock size={10} />
            Avslutad
          </span>
        ) : (
          <span className="text-xs text-gray-500 tabular-nums">{participants.length} röster</span>
        )}
      </button>
      
      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="space-y-2">
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
                            <span className="truncate flex items-center gap-1">
                              {score.first > 0 && <><Trophy size={10} className="text-amber-400" />{score.voters.first.join(', ')}</>}
                              {score.second > 0 && <><Trophy size={10} className="text-gray-300 ml-1" />{score.voters.second.join(', ')}</>}
                              {score.third > 0 && <><Trophy size={10} className="text-orange-500 ml-1" />{score.voters.third.join(', ')}</>}
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
            <div className="flex items-center gap-3 flex-1">
              {/* Add suggestion - expanded mode takes full width */}
              {allowSuggestions && !isClosed && currentUserKey && onAddOption && showSuggestionInput ? (
                <div className="flex items-center gap-1 w-full">
                  <input
                    type="text"
                    value={newSuggestion}
                    onChange={(e) => setNewSuggestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSuggestion.trim()) {
                        const finalUrl = newSuggestionUrl.trim();
                        const processedUrl = finalUrl && !finalUrl.match(/^https?:\/\//) 
                          ? `https://${finalUrl.replace(/^www\./, 'www.')}` 
                          : finalUrl;
                        onAddOption(newSuggestion.trim(), currentUserKey, pollType === 'ranked' ? processedUrl : null);
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
                    className={`${pollType === 'ranked' ? 'w-2/5' : 'flex-1'} min-w-0 px-2 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500`}
                    autoFocus
                  />
                  {pollType === 'ranked' && (
                    <input
                      type="text"
                      value={newSuggestionUrl}
                      onChange={(e) => setNewSuggestionUrl(e.target.value)}
                      placeholder="www..."
                      className="w-2/5 min-w-0 px-2 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                    />
                  )}
                  <button
                    onClick={() => {
                      if (newSuggestion.trim()) {
                        const finalUrl = newSuggestionUrl.trim();
                        const processedUrl = finalUrl && !finalUrl.match(/^https?:\/\//) 
                          ? `https://${finalUrl.replace(/^www\./, 'www.')}` 
                          : finalUrl;
                        onAddOption(newSuggestion.trim(), currentUserKey, pollType === 'ranked' ? processedUrl : null);
                        setNewSuggestion('');
                        setNewSuggestionUrl('');
                        setShowSuggestionInput(false);
                      }
                    }}
                    disabled={!newSuggestion.trim()}
                    className="w-[10%] aspect-square flex-shrink-0 flex items-center justify-center text-green-400 hover:bg-green-500/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Lägg till"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setNewSuggestion('');
                      setNewSuggestionUrl('');
                      setShowSuggestionInput(false);
                    }}
                    className="w-[10%] aspect-square flex-shrink-0 flex items-center justify-center text-gray-400 hover:bg-white/10 rounded-lg transition-colors"
                    title="Avbryt"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  {/* Show names toggle - compact switch */}
                  {participants.length > 0 || (pollType === 'ranked' && Object.keys(votes).length > 0) ? (
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${showDetails ? 'bg-blue-500/30' : 'bg-white/10'}`}
                      title={showDetails ? 'Kompakt vy' : 'Visa namn'}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform flex items-center justify-center ${showDetails ? 'translate-x-7' : 'translate-x-1'}`}>
                        {showDetails ? <Users size={10} className="text-blue-600" /> : <Vote size={10} className="text-gray-600" />}
                      </div>
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">Ingen har röstat än</span>
                  )}
              
                  {/* Add suggestion button */}
                  {allowSuggestions && !isClosed && currentUserKey && onAddOption && (
                    <button
                      onClick={() => setShowSuggestionInput(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Föreslå
                    </button>
                  )}
                </>
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
      )}
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
  // Normalize URL: remove /ourspots prefix if present (for Firebase vs GitHub Pages compatibility)
  const rawUrl = data.url || '';
  const url = rawUrl.startsWith('/ourspots/') ? rawUrl.replace('/ourspots/', '/') : rawUrl;

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
export const SplitBlock = ({ data, currentUser, shares = {}, canEdit = false, onUpdateAmount, onCloseSplit, onExpand }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const [myAmount, setMyAmount] = useState('');
  const [hasEdited, setHasEdited] = useState(false);
  const blockRef = useRef(null);
  
  const title = data.title || 'Splitt';
  const model = data.model || 'individual'; // 'individual' or 'family'
  const participants = data.participants || [];
  const isClosed = data.closed || false;
  const currency = data.currency || 'kr';
  
  // Easter egg: evaluate simple math expressions like "100+300+100"
  const evaluateMathExpression = (str) => {
    if (!str || typeof str !== 'string') return parseFloat(str) || 0;
    // Only allow numbers, +, -, *, /, spaces, parentheses, and decimal points
    const sanitized = str.replace(/[^0-9+\-*/().\s]/g, '');
    if (!sanitized) return 0;
    try {
      // Use Function to safely evaluate (sandboxed math only)
      const result = new Function('return ' + sanitized)();
      return typeof result === 'number' && isFinite(result) ? result : 0;
    } catch {
      return parseFloat(str) || 0;
    }
  };
  
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
  
  // Scroll into view when expanded
  const handleToggleCollapse = () => {
    const wasCollapsed = isCollapsed;
    setIsCollapsed(!isCollapsed);
    if (wasCollapsed && onExpand) {
      setTimeout(() => onExpand(blockRef.current), 100);
    }
  };
  
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
      const evaluated = evaluateMathExpression(myAmount);
      onUpdateAmount(myParticipant.email, evaluated);
      setMyAmount(evaluated > 0 ? evaluated.toString() : '');
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
          <Wallet size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
            {title}
          </span>
        </div>
        {isClosed ? (
          <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-500 flex items-center gap-1.5">
            <Lock size={10} />
            Avslutad
          </span>
        ) : (
          <div className="flex items-center gap-2">
            {totalPaid > 0 && (
              <span className="text-xs text-gray-400">{formatAmount(totalPaid)} {currency}</span>
            )}
            <span className="text-xs text-gray-500 tabular-nums">{paidCount}/{participants.length}</span>
          </div>
        )}
      </button>
      
      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="bg-white/[0.03] rounded-xl p-4 space-y-4">
          {/* My input section - only if I'm a participant and not closed */}
          {myParticipant && !isClosed && onUpdateAmount && (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-400">Jag har lagt ut:</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={myAmount}
                  onChange={(e) => { setMyAmount(e.target.value); setHasEdited(true); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMyAmount(); }}
                  placeholder="0"
                  className="flex-1 px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-green-500 text-white placeholder-gray-600 text-right"
                />
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
            </div>
          )}
          
          {/* Participants table */}
          <div>
            {/* Column headers */}
            <div className="flex items-center justify-between px-2 pb-1 mb-1 border-b border-white/5">
              <span className="text-xs text-gray-500">Deltagare</span>
              <div className="flex items-center gap-2">
                <span className="w-16 text-right text-xs text-gray-500">Utlägg</span>
                <span className="w-16 text-right text-xs text-gray-500">Saldo</span>
              </div>
            </div>
            
            {/* All participants list */}
            <div className="space-y-0.5">
              {/* My row first */}
              {myParticipant && (() => {
                const { paid, balance } = getParticipantData(myParticipant);
                return (
                  <div className="flex items-center justify-between py-1 px-2 text-sm">
                    <span className="text-gray-300 truncate">
                      {myParticipant.name || 'Jag'}
                      {model === 'family' && <span className="text-gray-600 ml-1">×{myParticipant.weight || 1}</span>}
                    </span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className={`w-16 text-right ${paid > 0 ? 'text-gray-400' : 'text-gray-600'}`}>
                        {paid > 0 ? formatAmount(paid) : '–'}
                      </span>
                      <span className={`w-16 text-right ${balance > 0.5 ? 'text-green-400' : balance < -0.5 ? 'text-red-400' : 'text-gray-600'}`}>
                        {balance > 0.5 ? '+' : ''}{formatAmount(balance)}
                      </span>
                    </div>
                  </div>
                );
              })()}
              {/* Other participants */}
              {otherParticipants.map((participant, idx) => {
                const { paid, balance } = getParticipantData(participant);
                return (
                  <div 
                    key={idx}
                    className="flex items-center justify-between py-1 px-2 text-sm"
                  >
                    <span className="text-gray-400 truncate">
                      {participant.name || participant.email?.split('@')[0]}
                      {model === 'family' && <span className="text-gray-600 ml-1">×{participant.weight || 1}</span>}
                    </span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className={`w-16 text-right ${paid > 0 ? 'text-gray-400' : 'text-gray-600'}`}>
                        {paid > 0 ? formatAmount(paid) : '–'}
                      </span>
                      <span className={`w-16 text-right ${balance > 0.5 ? 'text-green-400' : balance < -0.5 ? 'text-red-400' : 'text-gray-600'}`}>
                        {balance > 0.5 ? '+' : ''}{formatAmount(balance)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Total row */}
            {totalPaid > 0 && (
              <div className="flex items-center justify-between py-1 px-2 text-sm mt-1 pt-1 border-t border-white/10">
                <span className="text-gray-500">Totalt</span>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="w-16 text-right text-gray-300">{formatAmount(totalPaid)}</span>
                  <span className="w-16"></span>
                </div>
              </div>
            )}
          </div>
      
      {/* Settlement suggestions (when closed or has amounts) */}
      {isClosed && totalPaid > 0 && (
        <div className="pt-3 border-t border-white/10">
          {getSettlements().length > 0 ? (
            <div className="space-y-1.5">
              {getSettlements().map((s, idx) => (
                <div key={idx} className="text-sm text-gray-400">
                  <span className="text-gray-300">{s.from}</span>
                  {' swishar '}
                  <span className="text-gray-300">{s.to}</span>
                  {' '}
                  <span className="text-white font-medium tabular-nums">{formatAmount(s.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Alla är kvitt!</div>
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

// Leaderboard Block - ranking/competition display
export const LeaderboardBlock = ({ data, currentUser, shares = {}, canEdit = false, onOpenModal, onExpand }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const blockRef = useRef(null);
  
  const title = data.title || 'Leaderboard';
  const participants = data.participants || [];
  const roundCount = data.roundCount || 0;
  const scores = data.scores || {};
  const status = data.status || 'active';
  const sortOrder = data.sortOrder || 'desc'; // 'desc' = higher is better
  const mode = data.mode || 'single'; // 'single' or 'team'
  const isTeamMode = mode === 'team';
  
  const currentUserEmail = currentUser?.email?.toLowerCase();
  
  // Sync collapsed state when defaultCollapsed changes
  useEffect(() => {
    setIsCollapsed(data.defaultCollapsed ?? true);
  }, [data.defaultCollapsed]);
  
  // Scroll into view when expanded
  const handleToggleCollapse = () => {
    const wasCollapsed = isCollapsed;
    setIsCollapsed(!isCollapsed);
    
    // If expanding, notify parent to scroll
    if (wasCollapsed && onExpand) {
      setTimeout(() => {
        onExpand(blockRef.current);
      }, 100);
    }
  };
  
  // Calculate total score for a participant
  const getTotalScore = (email) => {
    const participantScores = scores[email] || {};
    return Object.values(participantScores).reduce((sum, score) => sum + (score || 0), 0);
  };
  
  // Get ranked participants (sorted by total score)
  const getRankedParticipants = () => {
    return participants
      .map(p => ({
        ...p,
        total: getTotalScore(p.email)
      }))
      .sort((a, b) => sortOrder === 'desc' ? b.total - a.total : a.total - b.total);
  };
  
  const rankedParticipants = getRankedParticipants();
  const top3 = rankedParticipants.slice(0, 3);
  const hasScores = rankedParticipants.some(p => p.total > 0);
  
  // Find current user's rank if not in top 3
  const currentUserRank = rankedParticipants.findIndex(p => p.email?.toLowerCase() === currentUserEmail) + 1;
  const currentUserData = currentUserRank > 3 ? rankedParticipants[currentUserRank - 1] : null;
  
  // Medal/rank icons as SVG triangles
  const RankIcon = ({ rank }) => {
    if (rank === 1) return <Trophy size={14} className="text-amber-400" />;
    if (rank === 2) return <Trophy size={14} className="text-gray-300" />;
    if (rank === 3) return <Trophy size={14} className="text-orange-600" />;
    return <span className="text-xs text-gray-500 w-3.5 text-center">{rank}</span>;
  };
  
  if (participants.length === 0) {
    return (
      <div className="bg-white/[0.03] rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Trophy size={18} className="text-amber-400" />
          <span className="text-sm">{title} – inga deltagare tillagda än</span>
        </div>
      </div>
    );
  }
  
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
          <Trophy size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
            {title}
          </span>
        </div>
        {status === 'finished' ? (
          <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-500 flex items-center gap-1.5">
            <Lock size={10} />
            Avslutad
          </span>
        ) : (
          <span className="text-xs text-gray-500 tabular-nums">{participants.length} deltagare</span>
        )}
      </button>
      
      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="bg-white/[0.03] rounded-xl p-4 space-y-3">
          {/* Top 3 preview + current user if outside top 3 */}
          {hasScores ? (
            <div className="space-y-1">
              {top3.map((participant, idx) => {
                const rank = idx + 1;
                const isCurrentUser = participant.email?.toLowerCase() === currentUserEmail;
                return (
                  <div 
                    key={participant.email}
                    className={`flex items-center gap-3 py-1.5 px-2 rounded-lg ${
                      isCurrentUser ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : ''
                    }`}
                  >
                    <RankIcon rank={rank} />
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isTeamMode && participant.team === 1 ? 'bg-cyan-500' :
                      isTeamMode && participant.team === 2 ? 'bg-orange-500' :
                      isCurrentUser ? 'bg-blue-500' : 'bg-white/10'
                    }`}>
                      <User size={12} className={`${
                        isTeamMode && participant.team ? 'text-white' :
                        isCurrentUser ? 'text-white' : 'text-gray-400'
                      }`} />
                    </div>
                    <span className={`text-sm flex-1 truncate ${isCurrentUser ? 'text-blue-300 font-medium' : 'text-gray-300'}`}>
                      {participant.name || participant.email?.split('@')[0]}
                      {isCurrentUser && ' (du)'}
                    </span>
                    <span className="text-sm font-medium text-gray-400 tabular-nums">
                      {participant.total}p
                    </span>
                  </div>
                );
              })}
              
              {/* Show current user if outside top 3 */}
              {currentUserData && (
                <>
                  <div className="text-xs text-gray-600 text-center py-0.5">···</div>
                  <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/30">
                    <span className="text-xs text-gray-500 w-3.5 text-center">{currentUserRank}</span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isTeamMode && currentUserData.team === 1 ? 'bg-cyan-500' :
                      isTeamMode && currentUserData.team === 2 ? 'bg-orange-500' :
                      'bg-blue-500'
                    }`}>
                      <User size={12} className="text-white" />
                    </div>
                    <span className="text-sm flex-1 truncate text-blue-300 font-medium">
                      {currentUserData.name || currentUserData.email?.split('@')[0]} (du)
                    </span>
                    <span className="text-sm font-medium text-gray-400 tabular-nums">
                      {currentUserData.total}p
                    </span>
                  </div>
                </>
              )}
              
              {rankedParticipants.length > 3 && !currentUserData && (
                <div className="text-xs text-gray-500 pl-2 pt-1">
                  +{rankedParticipants.length - 3} till...
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-2">
              Inga poäng registrerade än
            </div>
          )}
          
          {/* View full leaderboard button */}
          {onOpenModal && (
            <button
              onClick={onOpenModal}
              className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg flex items-center justify-center gap-1 transition-colors"
            >
              Visa hela leaderboarden
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Distribution block - for carpooling, task assignment, etc.
// Preset configs for different use cases
const DISTRIBUTION_PRESETS = {
  carpool: {
    icon: Car,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    title: 'Samåkning',
    slotLabel: 'bil',
    emptyStateUser: 'Du har inte valt bil än',
    emptyStateGeneral: 'Inga bilar skapade än',
    createLabel: 'Jag tar min bil',
    joinLabel: 'Jag behöver plats',
    capacityLabel: 'Antal platser (inkl. förare)',
    infoPlaceholder: 'T.ex. "Hämtar i stan kl 19"',
    slotPrefix: 'Bil',
    assigneeLabel: 'passagerare',
    spotsLeftLabel: (n) => n === 1 ? '1 plats kvar' : `${n} platser kvar`,
    fullLabel: 'Full'
  },
  tasks: {
    icon: ClipboardList,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    title: 'Uppgiftstilldelning',
    slotLabel: 'uppgift',
    emptyStateUser: 'Du har inte valt uppgift',
    emptyStateGeneral: 'Inga uppgifter skapade än',
    createLabel: 'Skapa uppgift',
    joinLabel: 'Välj uppgift',
    capacityLabel: 'Max antal personer',
    infoPlaceholder: 'Beskrivning av uppgiften',
    slotPrefix: '',
    assigneeLabel: 'tilldelade',
    spotsLeftLabel: (n) => n === 1 ? '1 plats kvar' : `${n} platser kvar`,
    fullLabel: 'Tilldelad'
  }
};

export const DistributionBlock = ({ 
  data, 
  currentUser, 
  shares = {}, 
  canEdit = false, 
  onOpenModal,
  onExpand 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const blockRef = useRef(null);
  
  const preset = DISTRIBUTION_PRESETS[data.preset] || DISTRIBUTION_PRESETS.carpool;
  const PresetIcon = preset.icon;
  const title = data.title || preset.title;
  const slots = data.slots || [];
  
  // Get current user's email key
  const getUserEmailKey = (email) => {
    if (!email) return null;
    return email.replace(/\./g, '_DOT_');
  };
  
  const currentUserKey = currentUser?.email ? getUserEmailKey(currentUser.email) : null;
  
  // Find which slot the current user is assigned to
  const findUserSlot = () => {
    if (!currentUserKey) return null;
    return slots.find(slot => slot.assignees?.includes(currentUserKey));
  };
  
  const userSlot = findUserSlot();
  const isUserCreator = (slot) => slot.createdBy === currentUserKey;
  
  // Get display name for an email key (including extra seats info)
  const getDisplayName = (emailKey, slot = null, includeExtras = true) => {
    if (!emailKey) return '';
    const email = emailKey.replace(/_DOT_/g, '.');
    // Check shares for displayName or name
    let name = '';
    if (shares[emailKey]?.displayName) {
      name = shares[emailKey].displayName;
    } else if (shares[emailKey]?.name) {
      name = shares[emailKey].name;
    } else {
      // Check participants list for name
      const participant = (data.participants || []).find(p => {
        const pKey = p.email?.replace(/\./g, '_DOT_');
        return pKey === emailKey;
      });
      if (participant?.name) {
        name = participant.name;
      } else {
        // Fall back to email prefix
        name = email.split('@')[0];
      }
    }
    
    // Add extra seats suffix if applicable
    if (includeExtras && slot?.assigneeDetails?.[emailKey]) {
      const details = slot.assigneeDetails[emailKey];
      if (details.extraSeats > 0) {
        const suffix = details.note || details.extraSeats;
        name = `${name} (+${suffix})`;
      }
    }
    
    return name;
  };
  
  // Get total seats taken in a slot (including extra seats)
  const getTotalSeatsTaken = (slot) => {
    const assignees = slot.assignees || [];
    let total = assignees.length;
    // Add extra seats for each assignee
    assignees.forEach(key => {
      const details = slot.assigneeDetails?.[key];
      if (details?.extraSeats) {
        total += details.extraSeats;
      }
    });
    return total;
  };
  
  // Get spots left for a slot (accounting for extra seats)
  const getSpotsLeft = (slot) => {
    const taken = getTotalSeatsTaken(slot);
    const capacity = slot.capacity || 1;
    return Math.max(0, capacity - taken);
  };
  
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
  
  // Calculate summary for collapsed view
  const getCollapsedSummary = () => {
    if (userSlot) {
      if (data.preset === 'carpool') {
        // Show "Bil X: förare, passagerare, Du (+2)"
        const assigneeNames = userSlot.assignees
          .map(key => {
            const name = key === currentUserKey ? 'Du' : getDisplayName(key, userSlot, false);
            // Add extra seats suffix
            const details = userSlot.assigneeDetails?.[key];
            if (details?.extraSeats > 0) {
              const suffix = details.note || details.extraSeats;
              return `${name} (+${suffix})`;
            }
            return name;
          })
          .join(', ');
        return `${userSlot.label}: ${assigneeNames}`;
      } else {
        // Tasks: show "Du: Uppgiftens namn"
        return `Du: ${userSlot.label}`;
      }
    }
    return preset.emptyStateUser;
  };

  if (slots.length === 0) {
    return (
      <div ref={blockRef} className="space-y-2">
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
            <PresetIcon size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
              {title}
            </span>
          </div>
        </button>
        
        {!isCollapsed && (
          <div className="bg-white/[0.03] rounded-xl p-4">
            <div className="text-sm text-gray-500 text-center py-2">
              {preset.emptyStateGeneral}
            </div>
            {onOpenModal && (
              <button
                onClick={onOpenModal}
                className={`w-full mt-2 py-2 text-sm ${preset.color} hover:bg-white/5 rounded-lg flex items-center justify-center gap-1 transition-colors`}
              >
                <Plus size={14} />
                Kom igång
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Count totals (including extra seats)
  const totalSlots = slots.length;
  const totalAssigned = slots.reduce((sum, slot) => sum + getTotalSeatsTaken(slot), 0);
  
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
          <PresetIcon size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
            {title}
          </span>
        </div>
        <span className="text-xs text-gray-500 tabular-nums">{totalAssigned} {preset.assigneeLabel}</span>
      </button>
      
      {/* Expanded content */}
      {!isCollapsed && (
        <div className="bg-white/[0.03] rounded-xl p-4 space-y-3">
          {/* Slots list */}
          {slots.map((slot, index) => {
            const spotsLeft = getSpotsLeft(slot);
            const isFull = spotsLeft === 0;
            const isCreator = isUserCreator(slot);
            const isAssigned = slot.assignees?.includes(currentUserKey);
            
            return (
              <div 
                key={slot.id || index} 
                className={`p-3 rounded-lg border transition-colors ${
                  isAssigned 
                    ? `${preset.bgColor} border-white/20` 
                    : 'bg-white/[0.02] border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">{slot.label}</span>
                      {isCreator && data.preset === 'carpool' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
                          Din
                        </span>
                      )}
                    </div>
                    {slot.info && (
                      <div className="text-xs text-gray-500 mt-0.5">{slot.info}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isFull ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600/50 text-gray-400">
                        {preset.fullLabel}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        {preset.spotsLeftLabel(spotsLeft)}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Assignees */}
                {slot.assignees && slot.assignees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {slot.assignees.map((assigneeKey, i) => {
                      const isMe = assigneeKey === currentUserKey;
                      const baseName = isMe ? 'Du' : getDisplayName(assigneeKey, null, false);
                      // Add extra seats suffix
                      const details = slot.assigneeDetails?.[assigneeKey];
                      const displayName = details?.extraSeats > 0 
                        ? `${baseName} (+${details.note || details.extraSeats})`
                        : baseName;
                      return (
                        <span 
                          key={i} 
                          className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                            isMe 
                              ? `${preset.bgColor} ${preset.color}` 
                              : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          <User size={10} />
                          {displayName}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Action button to open modal */}
          {onOpenModal && (
            <button
              onClick={onOpenModal}
              className={`w-full py-2.5 text-sm ${preset.color} hover:bg-white/5 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-white/10`}
            >
              {userSlot ? 'Ändra val' : preset.joinLabel}
              <ChevronRight size={14} />
            </button>
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
  section: SectionBlock,
  text: TextBlock,
  contact: ContactBlock,
  links: LinksBlock,
  table: TableBlock,
  datetag: DateTagBlock,
  timer: TimerBlock,
  poll: PollBlock,
  audio: AudioBlock,
  split: SplitBlock,
  leaderboard: LeaderboardBlock,
  distribution: DistributionBlock
};
