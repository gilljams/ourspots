import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, HelpCircle } from 'lucide-react';

// Quiz categories – subset of opentdb categories with Swedish labels
const CATEGORIES = [
  { id: '', label: 'Blandad' },
  { id: '9', label: 'Allmänbildning' },
  { id: '27', label: 'Djur' },
  { id: '11', label: 'Film' },
  { id: '22', label: 'Geografi' },
  { id: '23', label: 'Historia' },
  { id: '25', label: 'Konst' },
  { id: '12', label: 'Musik' },
  { id: '17', label: 'Natur & vetenskap' },
  { id: '21', label: 'Sport' },
  { id: '14', label: 'TV' },
  { id: '15', label: 'TV-spel' },
  { id: '10', label: 'Böcker' },
];

const DIFFICULTIES = [
  { id: '', label: 'Blandad' },
  { id: 'easy', label: 'Lätt' },
  { id: 'medium', label: 'Medel' },
  { id: 'hard', label: 'Svår' },
];

function QuizBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title || 'Quiz');
  const [categoryId, setCategoryId] = useState(block.categoryId || '');
  const [difficulty, setDifficulty] = useState(block.difficulty || '');
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? true);
  const [isExpanded, setIsExpanded] = useState(false);

  const syncToParent = (newTitle, newCategoryId, newDifficulty, newDefaultCollapsed) => {
    onUpdate(block.id, {
      title: newTitle,
      categoryId: newCategoryId,
      difficulty: newDifficulty,
      defaultCollapsed: newDefaultCollapsed,
    });
  };

  const handleTitleChange = (val) => {
    setTitle(val);
    syncToParent(val, categoryId, difficulty, defaultCollapsed);
  };

  const handleCategoryChange = (val) => {
    setCategoryId(val);
    syncToParent(title, val, difficulty, defaultCollapsed);
  };

  const handleDifficultyChange = (val) => {
    setDifficulty(val);
    syncToParent(title, categoryId, val, defaultCollapsed);
  };

  const handleCollapsedChange = (val) => {
    setDefaultCollapsed(val);
    syncToParent(title, categoryId, difficulty, val);
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
          <HelpCircle size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">{title || 'Quiz'}</span>
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

      {/* Expanded editor */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Titel"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />

          {/* Category */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Kategori</label>
            <select
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id} className="bg-gray-900">{c.label}</option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Svårighetsgrad</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleDifficultyChange(d.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    difficulty === d.id
                      ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Default collapsed toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-gray-400">Ihopfälld som standard</span>
            <button
              type="button"
              onClick={() => handleCollapsedChange(!defaultCollapsed)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                defaultCollapsed ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                defaultCollapsed ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <p className="text-xs text-gray-500 italic">
            Frågorna hämtas live från Open Trivia Database och visas på engelska.
          </p>
        </div>
      )}
    </div>
  );
}

export { QuizBlockEditor };
