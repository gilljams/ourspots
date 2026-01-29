import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, FileText, CheckSquare, ClipboardList } from 'lucide-react';

// Simple block editor with local state to avoid parent re-renders on each keystroke
function BlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title);
  const [content, setContent] = useState(block.content);
  
  const syncTitle = () => onUpdate(block.id, { title });
  const syncContent = () => onUpdate(block.id, { content });
  
  return (
    <div className="rounded-xl border border-white/10 p-3 bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
          {block.type === 'text' && <><FileText size={16} className="text-blue-400" /> Anteckning</>}
          {block.type === 'checklist' && <><CheckSquare size={16} className="text-green-400" /> Checklista</>}
          {block.type === 'todo' && <><ClipboardList size={16} className="text-amber-400" /> Att göra</>}
        </span>
        <div className="flex gap-1">
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
      <input
        type="text"
        defaultValue={block.title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={syncTitle}
        placeholder="Rubrik (valfritt)"
        disabled={saving}
        className="w-full px-3 py-2 mb-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />
      <textarea
        defaultValue={block.content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={syncContent}
        placeholder={block.type === 'text' ? 'Skriv text här...' : 'En per rad'}
        rows={3}
        disabled={saving}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
      />
    </div>
  );
}

export default BlockEditor;
