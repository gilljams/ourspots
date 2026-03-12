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
      <div ref={blockRef}>
        {/* Collapsible header */}
        <button
          type="button"
          onClick={handleToggleCollapse}
          className="flex items-center gap-2 py-1 w-full text-left"
        >
          <ChevronDown
            size={16}
            className={`text-gray-500 transition-transform flex-shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
          />
          <HelpCircle size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-200 truncate">{title}</span>
          <span className="text-xs text-gray-500 ml-auto flex-shrink-0">
            {categoryLabel} · {difficultyLabel}
          </span>
        </button>

        {/* Expanded content */}
        {!isCollapsed && (
          <div className="pl-8 pr-1 pb-2 pt-1 space-y-3">
            <div className="text-xs text-gray-500">
              Kategori: {categoryLabel} · Svårighetsgrad: {difficultyLabel} · Engelska
            </div>

            <button
              type="button"
              onClick={() => setShowQuiz(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium text-sm transition-colors"
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
