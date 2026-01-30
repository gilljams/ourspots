import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

function DeleteConfirmModal({ object, onConfirm, onCancel, descendantCount = 0 }) {
  const titleBlock = object.blocks.find(b => b.type === 'title');
  const hasDescendants = descendantCount > 0;
  
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-red-500/30 max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 size={24} className="text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Ta bort objekt?</h3>
        </div>
        <p className="text-gray-300 mb-4">
          Är du säker på att du vill ta bort <span className="font-semibold text-white">"{titleBlock?.data?.text || 'detta objekt'}"</span>? Detta kan inte ångras.
        </p>
        {hasDescendants && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4">
            <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-200 text-sm">
              <span className="font-semibold">{descendantCount} {descendantCount === 1 ? 'barnobjekt' : 'barnobjekt'}</span> kommer också att raderas.
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">Avbryt</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all">
            {hasDescendants ? `Ta bort ${descendantCount + 1} objekt` : 'Ta bort'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
