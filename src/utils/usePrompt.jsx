import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import PromptDialog from '../components/PromptDialog';

const PromptContext = createContext(null);

/**
 * Provider — wrap your app with this to enable usePrompt() anywhere.
 *
 * Usage in main.jsx:
 *   <PromptProvider> ... </PromptProvider>
 *
 * Usage in any child component:
 *   const prompt = usePrompt();
 *   const value = await prompt({ title: '...', placeholder: '...' });
 *   if (value !== null) { ... }
 */
export function PromptProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const prompt = useCallback(({ title, message, placeholder, defaultValue, multiline, confirmText, cancelText }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ title, message, placeholder, defaultValue, multiline, confirmText, cancelText });
    });
  }, []);

  const handleConfirm = useCallback((value) => {
    resolveRef.current?.(value);
    setDialog(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(null);
    setDialog(null);
  }, []);

  return (
    <PromptContext.Provider value={prompt}>
      {children}
      {dialog && (
        <PromptDialog
          title={dialog.title}
          message={dialog.message}
          placeholder={dialog.placeholder}
          defaultValue={dialog.defaultValue}
          multiline={dialog.multiline}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </PromptContext.Provider>
  );
}

/**
 * Hook — returns an async prompt() function.
 *
 *   const prompt = usePrompt();
 *   const value = await prompt({
 *     title: 'Ange URL',
 *     placeholder: 'https://...',
 *     defaultValue: '',
 *   });
 *   if (value !== null) { ... }   // null = cancelled
 */
export function usePrompt() {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error('usePrompt must be used within <PromptProvider>');
  return ctx;
}
