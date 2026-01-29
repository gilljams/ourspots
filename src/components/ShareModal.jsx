import React, { useState, useEffect, useRef } from 'react';
import { Share2, X, Mail, Loader, UserPlus, UserMinus, Users } from 'lucide-react';
import { doc, updateDoc, onSnapshot, Timestamp, deleteField, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { emailToKey, keyToEmail } from '../utils/iconHelpers';

function ShareModal({ object, onClose, currentUserEmail }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [includeChildren, setIncludeChildren] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [shares, setShares] = useState(object.shares || {});
  
  // Swipe to close state
  const [touchStart, setTouchStart] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const modalRef = useRef(null);
  
  const SWIPE_THRESHOLD = 30;
  const CLOSE_THRESHOLD = 150;
  const RESISTANCE = 0.5;
  
  // Listen to real-time updates for this object's shares
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'objects', object.id), (snap) => {
      if (snap.exists()) {
        setShares(snap.data().shares || {});
      }
    });
    return () => unsub();
  }, [object.id]);
  
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setIsSwipeActive(false);
  };
  
  const handleTouchMove = (e) => {
    if (touchStart === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStart;
    const deltaY = currentY - touchStartY;
    
    if (!isSwipeActive) {
      if (deltaX > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
        setIsSwipeActive(true);
        e.preventDefault();
      } else if (Math.abs(deltaY) > 10) {
        setTouchStart(null);
        return;
      } else {
        return;
      }
    }
    
    if (deltaX > SWIPE_THRESHOLD) {
      e.preventDefault();
      const adjustedDelta = (deltaX - SWIPE_THRESHOLD) * RESISTANCE;
      setTouchDelta(adjustedDelta);
    }
  };
  
  const handleTouchEnd = () => {
    if (touchDelta > CLOSE_THRESHOLD * RESISTANCE) {
      setTouchDelta(200);
      setTimeout(onClose, 200);
    } else {
      setTouchDelta(0);
    }
    setTouchStart(null);
    setTouchStartY(null);
    setIsSwipeActive(false);
  };

  // Convert shares object to list, using stored email or converting key back to email
  const sharesList = Object.entries(shares).map(([key, data]) => ({ 
    key, // Keep the Firestore key for updates/deletes
    email: data.email || keyToEmail(key), // Use stored email or convert key
    ...data 
  }));

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleInvite = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Ange en e-postadress');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Ogiltig e-postadress');
      return;
    }
    if (trimmedEmail === currentUserEmail) {
      setError('Du kan inte dela med dig själv');
      return;
    }
    const emailKey = emailToKey(trimmedEmail);
    if (shares[emailKey]) {
      setError('Denna användare har redan tillgång');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${emailKey}`]: {
          email: trimmedEmail, // Store original email for display
          role,
          status: 'pending',
          includeChildren,
          invitedAt: Timestamp.now(),
          respondedAt: null
        },
        sharedWithEmails: arrayUnion(trimmedEmail)
      });
      setEmail('');
    } catch (err) {
      console.error('Error sharing:', err);
      setError('Kunde inte dela objektet');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveShare = async (emailKey, originalEmail) => {
    const displayEmail = originalEmail || keyToEmail(emailKey);
    if (!confirm(`Ta bort delning för ${displayEmail}?`)) return;
    
    try {
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${emailKey}`]: deleteField(),
        sharedWithEmails: arrayRemove(displayEmail)
      });
    } catch (err) {
      console.error('Error removing share:', err);
      alert('Kunde inte ta bort delningen');
    }
  };

  const handleUpdateRole = async (emailKey, newRole) => {
    try {
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${emailKey}.role`]: newRole
      });
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const titleBlock = object.blocks?.find(b => b.type === 'title');

  return (
    <div 
      className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[1100] flex items-end sm:items-center justify-center sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-md sm:w-[90%] h-full sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col transition-transform duration-200 ease-out relative sm:shadow-2xl sm:shadow-black/50"
        style={{ transform: `translateX(${touchDelta}px)`, opacity: touchDelta > 0 ? 1 - (touchDelta / 300) : 1 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative gradient */}
        <div 
          className="absolute top-0 left-0 right-0 h-72 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, rgba(139,92,246,0.12), rgba(139,92,246,0.05) 50%, transparent)` }}
        />
        
        {/* Fixed header */}
        <div className="sticky top-0 z-10 px-4 py-4 sm:p-5 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-500/20">
              <Share2 size={20} className="text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-white truncate">Dela objekt</h2>
              <span className="text-xs text-gray-400 truncate block">{titleBlock?.data?.text || 'Namnlöst objekt'}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation flex-shrink-0 ml-2"
            aria-label="Stäng"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 pb-8 sm:pb-10">
          {/* Invite new user */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bjud in med e-post</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="exempel@email.com"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  />
                  {email && (
                    <button
                      onClick={() => setEmail('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-gray-300 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleInvite}
                  disabled={saving || !email.trim()}
                  className="px-4 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Bjud in användare"
                >
                  {saving ? <Loader size={16} className="animate-spin" /> : <UserPlus size={16} />}
                </button>
              </div>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">Roll</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
                >
                  <option value="viewer" className="bg-gray-800 text-white">Läsare (kan bara se)</option>
                  <option value="editor" className="bg-gray-800 text-white">Redigerare (kan ändra)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={includeChildren}
                onChange={(e) => setIncludeChildren(e.target.checked)}
                className="w-5 h-5 rounded border-purple-500 text-purple-500 focus:ring-purple-500"
              />
              <div>
                <span className="text-gray-200 text-sm">Inkludera barn-objekt</span>
                <p className="text-xs text-gray-500">Dela också alla objekt under detta</p>
              </div>
            </label>
          </div>

          {/* Current shares */}
          {sharesList.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Users size={16} />
                Delad med ({sharesList.length})
              </h3>
              <div className="space-y-2">
                {sharesList.map(share => (
                  <div key={share.key} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{share.email}</p>
                      <p className="text-xs text-gray-500">
                        {share.status === 'pending' ? '⏳ Väntar på svar' : share.status === 'accepted' ? '✓ Accepterad' : '✗ Nekad'}
                        {share.includeChildren && ' • Inkl. barn'}
                      </p>
                    </div>
                    <select
                      value={share.role}
                      onChange={(e) => handleUpdateRole(share.key, e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px', paddingRight: '24px' }}
                    >
                      <option value="viewer" className="bg-gray-800 text-white">Läsare</option>
                      <option value="editor" className="bg-gray-800 text-white">Redigerare</option>
                    </select>
                    <button
                      onClick={() => handleRemoveShare(share.key, share.email)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                      title="Ta bort delning"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShareModal;
