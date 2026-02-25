import React from 'react';
import { X, Plus, Trash2, Target, Lightbulb, MapPin } from 'lucide-react';

/**
 * Slide-in panel showing saved GPS captures with create/delete actions.
 */
export default function CapturesModal({ captures, onDeleteCapture, onCreateFromCapture, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[2000] flex items-end sm:items-center justify-center sm:justify-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-l-xl sm:rounded-r-none border-t sm:border-l sm:border-t sm:border-b border-white/10 sm:border-white/[0.08] w-full sm:w-96 h-full sm:h-full overflow-hidden flex flex-col relative sm:shadow-2xl sm:shadow-black/50 animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
        {/* Subtle decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-orange-600/8 via-orange-900/5 to-transparent pointer-events-none" />

        {/* Fixed header */}
        <div className="sticky top-0 z-10 px-4 py-4 sm:p-6 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
              <Target size={20} className="text-orange-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">GPS-pinningar</h2>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation"
            aria-label="Stäng"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6 pb-8 sm:pb-10">
          <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">
            <div className="flex gap-3">
              <Lightbulb size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="mb-1">Använd orange svampknappen för att snabbt spara GPS-positioner när du är i skogen!</p>
                <p className="text-xs text-gray-500">Perfekt för kantarellställen utan uppkoppling. Skapa objekt senare.</p>
              </div>
            </div>
          </div>

          {captures.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Target size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-lg mb-2">Inga pinningar än</p>
              <p className="text-sm">Tryck på orange knappen för att spara en position</p>
            </div>
          ) : (
            <div className="space-y-3">
              {captures.map((capture, index) => {
                const date = new Date(capture.timestamp);
                const timeStr = date.toLocaleString('sv-SE', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div key={capture.id} className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-white font-medium mb-1">
                          <Target size={16} className="text-orange-400" />
                          <span>Pinning #{captures.length - index}</span>
                        </div>
                        <div className="text-xs text-gray-400">{timeStr}</div>
                      </div>
                      <button
                        onClick={() => onDeleteCapture(capture.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
                        title="Ta bort"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="text-xs text-gray-400 space-y-1 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} />
                        <span>{capture.lat.toFixed(6)}, {capture.lng.toFixed(6)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onCreateFromCapture(capture)}
                      className="w-full py-2 px-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Skapa objekt från denna
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
