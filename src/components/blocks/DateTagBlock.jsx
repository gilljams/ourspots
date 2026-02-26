import React from 'react';
import { Calendar } from 'lucide-react';

// DateTag Block - for marking years or date ranges
export const DateTagBlock = ({ data, variant = 'default' }) => {
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

  const isOverlay = variant === 'overlay';

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => {
        const countdown = getCountdown(tag);
        const pillClass = isOverlay
          ? countdown?.highlight
            ? 'bg-amber-500/50 backdrop-blur-sm text-white border border-amber-400/30'
            : 'bg-black/40 backdrop-blur-sm text-white/90 border border-white/10'
          : countdown?.highlight
            ? 'bg-amber-500/15 text-amber-200 border border-amber-500/20'
            : 'bg-blue-500/15 text-blue-300 border border-blue-500/20';
        return (
          <div 
            key={i}
            className={`inline-flex items-center gap-1.5 rounded-full font-medium ${
              isOverlay ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
            } ${pillClass}`}
          >
            <Calendar size={isOverlay ? 10 : 12} />
            <span>{formatTag(tag)}</span>
            {countdown && (
              <span className={`text-xs ${
                isOverlay
                  ? countdown.highlight ? 'text-amber-100' : 'text-white/70'
                  : countdown.highlight ? 'text-amber-300' : 'text-blue-400'
              }`}>
                · {countdown.text}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
