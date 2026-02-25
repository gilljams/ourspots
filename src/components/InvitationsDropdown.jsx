import React from 'react';
import { X, Check, Edit3, Eye, Mail } from 'lucide-react';

/**
 * Dropdown showing pending share invitations with accept/reject actions.
 */
export default function InvitationsDropdown({
  pendingInvitations,
  userEmailKey,
  onAccept,
  onReject,
  onClose
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-4 right-4 sm:left-auto sm:right-auto sm:w-80 mt-2 ml-0 sm:ml-14 p-3 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-in slide-in-from-top-2">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Mail size={16} className="text-blue-400" />
          Inbjudningar ({pendingInvitations.length})
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {pendingInvitations.map(obj => {
            const titleBlock = obj.blocks?.find(b => b.type === 'title');
            const shareInfo = obj.shares[userEmailKey];
            return (
              <div key={obj.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/5 border border-white/10">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{titleBlock?.data?.text || 'Namnlöst'}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    {shareInfo?.role === 'editor' ? <><Edit3 size={10} /> <span>Redigerare</span></> : <><Eye size={10} /> <span>Läsare</span></>}
                    {shareInfo?.includeChildren && <span className="ml-1">• Inkl. barn</span>}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onAccept(obj)}
                    className="px-2.5 py-1.5 rounded-lg bg-green-500/20 text-green-300 text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center justify-center"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => onReject(obj)}
                    className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
