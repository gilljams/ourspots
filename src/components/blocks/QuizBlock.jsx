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

const TYPE_LABELS = {
  multiple: 'Flerval',
  boolean: 'Sant/Falskt',
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
  const quizType = data.quizType || 'multiple';
  const typeLabel = TYPE_LABELS[quizType] || 'Flerval';

  return (
    <>
      <div ref={blockRef} className="space-y-2">
        {/* Collapsible header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="flex-1 flex items-center gap-2.5 py-2 group touch-manipulation"
          >
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <ChevronDown
                size={16}
                className={`text-gray-400 group-hover:text-white transition-all ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
              />
            </div>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <HelpCircle size={16} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">{title}</span>
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {typeLabel} · {categoryLabel} · {difficultyLabel}
            </span>
          </button>
        </div>

        {/* Expanded content */}
        {!isCollapsed && (
          <div className="bg-white/[0.03] rounded-xl p-4 space-y-3">
            <div className="text-xs text-gray-500">
              {typeLabel} · Kategori: {categoryLabel} · Svårighetsgrad: {difficultyLabel} · Engelska
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
          quizType={quizType}
          title={title}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </>
  );
};
