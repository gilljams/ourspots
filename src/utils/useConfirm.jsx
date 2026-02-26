import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

const ConfirmContext = createContext(null);

/**
 * Provider — wrap your app with this to enable useConfirm() anywhere.
 *
 * Usage in App.jsx:
 *   <ConfirmProvider> ... </ConfirmProvider>
 *
 * Usage in any child component:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: '...', message: '...' });
 *   if (ok) { ... }
 */
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(({ title, message, confirmText, cancelText, variant }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ title, message, confirmText, cancelText, variant });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setDialog(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setDialog(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          message={dialog.message}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          variant={dialog.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * Hook — returns an async confirm() function.
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Nollställ poäng?',
 *     message: 'Alla poäng raderas. Detta kan inte ångras.',
 *     confirmText: 'Nollställ',
 *     variant: 'danger'
 *   });
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}
