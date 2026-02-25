import React from 'react';

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
