import React, { useState, useEffect, useCallback } from 'react';
import { X, SkipForward, Eye, Loader, RefreshCw, HelpCircle } from 'lucide-react';
import { useSwipeToClose } from '../../utils/useSwipeToClose';

// Decode HTML entities from opentdb responses
const decodeHTML = (str) => {
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
};

// Shuffle array (Fisher-Yates)
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const QuizModal = ({ categoryId, difficulty, title, onClose }) => {
  const [question, setQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);

  const swipe = useSwipeToClose(onClose);

  const fetchQuestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setShowAnswer(false);
    try {
      let url = `https://opentdb.com/api.php?amount=1&type=multiple`;
      if (categoryId) url += `&category=${categoryId}`;
      if (difficulty) url += `&difficulty=${difficulty}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      if (data.response_code !== 0 || !data.results?.length) {
        throw new Error('Inga frågor tillgängliga');
      }

      const q = data.results[0];
      const correct = decodeHTML(q.correct_answer);
      const allOptions = shuffle([
        correct,
        ...q.incorrect_answers.map(decodeHTML),
      ]);

      setQuestion(decodeHTML(q.question));
      setCorrectAnswer(correct);
      setOptions(allOptions);
      setQuestionCount(c => c + 1);
    } catch (err) {
      setError(err.message || 'Kunde inte hämta fråga');
    } finally {
      setLoading(false);
    }
  }, [categoryId, difficulty]);

  // Fetch first question on mount
  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  const handleReveal = () => {
    setShowAnswer(true);
  };

  const handleOptionSelect = (opt) => {
    if (showAnswer) return;
    setSelectedAnswer(opt);
  };

  const getOptionStyle = (opt) => {
    const base = 'w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3';

    if (!showAnswer) {
      if (selectedAnswer === opt) {
        return `${base} bg-blue-600/40 border-2 border-blue-400 text-white`;
      }
      return `${base} bg-white/5 border-2 border-white/10 text-gray-200 hover:bg-white/10 active:bg-white/15`;
    }

    // Answer revealed
    if (opt === correctAnswer) {
      return `${base} bg-green-600/30 border-2 border-green-400 text-green-300`;
    }
    if (selectedAnswer === opt && opt !== correctAnswer) {
      return `${base} bg-red-600/20 border-2 border-red-400/50 text-red-300`;
    }
    return `${base} bg-white/5 border-2 border-white/5 text-gray-500`;
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gray-950 flex flex-col">
      {/* Header */}
      <div
        ref={swipe.ref}
        className={`flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gray-900/80 backdrop-blur-md flex-shrink-0 ${swipe.className}`}
        style={swipe.style}
        {...swipe.handlers}
      >
        <HelpCircle size={18} className="text-blue-400 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-200 truncate flex-1">{title}</span>
        <span className="text-xs text-gray-500 flex-shrink-0">Fråga #{questionCount}</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 -mr-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader size={32} className="animate-spin text-blue-400" />
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              type="button"
              onClick={fetchQuestion}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/15 text-sm"
            >
              <RefreshCw size={16} /> Försök igen
            </button>
          </div>
        )}

        {!loading && !error && question && (
          <div className="flex flex-col gap-6 max-w-lg mx-auto w-full">
            {/* Question */}
            <div className="text-lg font-medium text-white leading-relaxed">
              {question}
            </div>

            {/* Options */}
            <div className="flex flex-col gap-2.5">
              {options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleOptionSelect(opt)}
                  disabled={showAnswer}
                  className={getOptionStyle(opt)}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    showAnswer && opt === correctAnswer
                      ? 'bg-green-500/30 text-green-300'
                      : showAnswer && selectedAnswer === opt && opt !== correctAnswer
                        ? 'bg-red-500/30 text-red-300'
                        : selectedAnswer === opt
                          ? 'bg-blue-500/30 text-blue-300'
                          : 'bg-white/10 text-gray-400'
                  }`}>
                    {OPTION_LETTERS[i]}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {showAnswer && opt === correctAnswer && (
                    <span className="text-green-400 text-xs font-medium">✓ Rätt</span>
                  )}
                </button>
              ))}
            </div>

            {/* Reveal / Next buttons */}
            <div className="mt-2">
              {!showAnswer ? (
                <button
                  type="button"
                  onClick={handleReveal}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium text-sm transition-colors"
                >
                  <Eye size={18} />
                  Visa svar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={fetchQuestion}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-gray-200 font-medium text-sm transition-colors"
                >
                  <SkipForward size={18} />
                  Nästa fråga
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
