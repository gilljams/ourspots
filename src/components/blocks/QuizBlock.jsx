import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, HelpCircle, Play } from 'lucide-react';
import { QuizModal } from './QuizModal';

// Category labels in Swedish
const CATEGORY_LABELS = {
  '': 'Blandad',
  '9': 'Allmänbildning',
  '10': 'Böcker',
  '11': 'Film',
  '12': 'Musik',
  '14': 'TV',
  '15': 'TV-spel',
  '17': 'Natur & vetenskap',
  '21': 'Sport',
  '22': 'Geografi',
  '23': 'Historia',
  '25': 'Konst',
  '27': 'Djur',
};

const DIFFICULTY_LABELS = {
  '': 'Blandad',
  easy: 'Lätt',
  medium: 'Medel',
  hard: 'Svår',
};

export const QuizBlock = ({ data, onExpand }) => {
  const [isCollapsed, setIsCollapsed] = useState(data.defaultCollapsed ?? true);
  const [showQuiz, setShowQuiz] = useState(false);
  const blockRef = useRef(null);

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

  const title = data.title || 'Quiz';
  const categoryLabel = CATEGORY_LABELS[data.categoryId || ''] || 'Blandad';
  const difficultyLabel = DIFFICULTY_LABELS[data.difficulty || ''] || 'Blandad';

  return (
    <>
      <div ref={blockRef} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        {/* Collapsible header */}
        <button
          type="button"
          onClick={handleToggleCollapse}
          className="flex items-center gap-2 p-3 w-full text-left"
        >
          <ChevronDown
            size={16}
            className={`text-gray-500 transition-transform flex-shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
          />
          <HelpCircle size={16} className="text-purple-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-200 truncate">{title}</span>
          <span className="text-xs text-gray-500 ml-auto flex-shrink-0">
            {categoryLabel} · {difficultyLabel}
          </span>
        </button>

        {/* Expanded content */}
        {!isCollapsed && (
          <div className="px-3 pb-3 space-y-3">
            <div className="text-xs text-gray-400 flex flex-col gap-1">
              <span>📂 Kategori: {categoryLabel}</span>
              <span>📊 Svårighetsgrad: {difficultyLabel}</span>
              <span className="text-gray-500 italic mt-1">Frågorna är på engelska</span>
            </div>

            <button
              type="button"
              onClick={() => setShowQuiz(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600/80 hover:bg-purple-500/80 active:bg-purple-700/80 text-white font-medium text-sm transition-colors"
            >
              <Play size={18} />
              Starta Quiz
            </button>
          </div>
        )}
      </div>

      {showQuiz && (
        <QuizModal
          categoryId={data.categoryId || ''}
          difficulty={data.difficulty || ''}
          title={title}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </>
  );
};
