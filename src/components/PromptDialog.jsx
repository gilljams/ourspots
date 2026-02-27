import React, { useState, useEffect, useRef } from 'react';
import { Type } from 'lucide-react';

/**
 * Themed prompt dialog — replaces native window.prompt()
 *
 * Props:
 *   title        — dialog heading
 *   message      — optional body text (string or JSX)
 *   placeholder  — input placeholder
 *   defaultValue — pre-filled value
 *   multiline    — if true renders a <textarea> instead of <input>
 *   confirmText  — confirm button label (default "OK")
 *   cancelText   — cancel button label (default "Avbryt")
 *   onConfirm    — called with the entered string
 *   onCancel     — called when user cancels
 */
function PromptDialog({
  title,
  message,
  placeholder = '',
  defaultValue = '',
  multiline = false,
  confirmText = 'OK',
  cancelText = 'Avbryt',
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  // Auto-focus + select on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        if (defaultValue) el.select();
      }
    });
  }, []);

  const handleSubmit = () => {
    onConfirm(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const inputClasses =
    'w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors';

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[5000] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-blue-500/30 max-w-sm w-full p-5 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Type size={20} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>

        {message && (
          <p className="text-gray-300 text-sm leading-relaxed mb-3 pl-[52px]">
            {message}
          </p>
        )}

        <div className="mb-5 pl-[52px]">
          {multiline ? (
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={5}
              className={`${inputClasses} resize-none`}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={inputClasses}
            />
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 active:bg-white/20 transition-all touch-manipulation text-sm font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all touch-manipulation text-sm"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PromptDialog;
