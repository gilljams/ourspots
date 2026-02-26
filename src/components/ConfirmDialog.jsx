import React from 'react';
import { AlertTriangle, Trash2, Info, HelpCircle } from 'lucide-react';

// Themed variants for the confirm dialog
const VARIANTS = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    confirmBg: 'bg-red-500 hover:bg-red-600',
    borderColor: 'border-red-500/30',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    confirmBg: 'bg-amber-500 hover:bg-amber-600',
    borderColor: 'border-amber-500/30',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    confirmBg: 'bg-blue-500 hover:bg-blue-600',
    borderColor: 'border-blue-500/30',
  },
  default: {
    icon: HelpCircle,
    iconBg: 'bg-gray-500/20',
    iconColor: 'text-gray-400',
    confirmBg: 'bg-blue-500 hover:bg-blue-600',
    borderColor: 'border-white/20',
  },
};

/**
 * Generic themed confirm dialog — replaces native window.confirm()
 *
 * Props:
 *   title       — dialog heading
 *   message     — body text (string or JSX)
 *   confirmText — confirm button label (default "OK")
 *   cancelText  — cancel button label (default "Avbryt")
 *   variant     — 'danger' | 'warning' | 'info' | 'default'
 *   onConfirm   — called when user confirms
 *   onCancel    — called when user cancels
 */
function ConfirmDialog({ title, message, confirmText = 'OK', cancelText = 'Avbryt', variant = 'default', onConfirm, onCancel }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  const Icon = v.icon;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[5000] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className={`bg-gray-900/95 backdrop-blur-xl rounded-2xl border ${v.borderColor} max-w-sm w-full p-5 shadow-2xl`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full ${v.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={20} className={v.iconColor} />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>

        <p className="text-gray-300 text-sm leading-relaxed mb-5 pl-[52px]">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 active:bg-white/20 transition-all touch-manipulation text-sm font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl ${v.confirmBg} text-white font-medium transition-all touch-manipulation text-sm`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
