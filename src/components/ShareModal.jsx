import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Share2, X, Mail, Loader, UserPlus, UserMinus, Users, Clock, Check, CornerDownRight, XCircle, Eye, Edit3, Pause, Play, Ban } from 'lucide-react';
import { doc, updateDoc, onSnapshot, Timestamp, deleteField, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { emailToKey, keyToEmail } from '../utils/iconHelpers';

function ShareModal({ object, onClose, currentUserEmail, allObjects = [], sharedContacts = [], onAddContact }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [includeChildren, setIncludeChildren] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [shares, setShares] = useState(object.shares || {});
  
  // Get all descendants using ancestorIds for fast O(n) lookup, or fallback to recursive
  const allDescendants = useMemo(() => {
    // Fast path: use ancestorIds if objects have them
    const descendantsViaAncestorIds = allObjects.filter(o => 
      o.ancestorIds && o.ancestorIds.includes(object.id)
    );
    
    if (descendantsViaAncestorIds.length > 0) {
      return descendantsViaAncestorIds;
    }
    
    // Fallback: recursive traversal for objects without ancestorIds
    const descendants = [];
    const findDescendants = (parentId) => {
      const children = allObjects.filter(o => o.parentId === parentId);
      children.forEach(child => {
        descendants.push(child);
        findDescendants(child.id);
      });
    };
    findDescendants(object.id);
    return descendants;
  }, [object.id, allObjects]);
  
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
      const shareData = {
        email: trimmedEmail, // Store original email for display
        role,
        status: 'pending',
        includeChildren,
        invitedAt: Timestamp.now(),
        respondedAt: null
      };

      // Update parent object
      const updateData = {
        [`shares.${emailKey}`]: shareData,
        sharedWithEmails: arrayUnion(trimmedEmail)
      };
      // Add to editorEmails if editor role (for Firestore security rules)
      if (role === 'editor') {
        updateData.editorEmails = arrayUnion(trimmedEmail);
      }
      await updateDoc(doc(db, 'objects', object.id), updateData);

      // If includeChildren, also share with all descendants (children, grandchildren, etc.)
      if (includeChildren && allDescendants.length > 0) {
        const descendantShareData = {
          email: trimmedEmail,
          role,
          status: 'inherited', // Use 'inherited' instead of 'pending' - no separate notification needed
          includeChildren: false, // Descendants don't cascade further
          invitedAt: Timestamp.now(),
          respondedAt: null,
          inheritedFrom: object.id // Track that this was inherited from parent
        };

        // Update all descendants in parallel
        await Promise.all(allDescendants.map(descendant => {
          const descUpdateData = {
            [`shares.${emailKey}`]: descendantShareData,
            sharedWithEmails: arrayUnion(trimmedEmail),
            // Inherited shares are auto-accepted (no separate accept needed)
            acceptedShareEmails: arrayUnion(trimmedEmail)
          };
          if (role === 'editor') {
            descUpdateData.editorEmails = arrayUnion(trimmedEmail);
          }
          return updateDoc(doc(db, 'objects', descendant.id), descUpdateData);
        }));
      }

      // Save contact to user's sharedContacts
      if (onAddContact && !sharedContacts.includes(trimmedEmail)) {
        onAddContact(trimmedEmail);
      }

      setEmail('');
    } catch (err) {
      console.error('Error sharing:', err);
      setError('Kunde inte dela objektet');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveShare = async (emailKey, originalEmail, shareData) => {
    const displayEmail = originalEmail || keyToEmail(emailKey);
    if (!confirm(`Ta bort delning för ${displayEmail}?`)) return;
    
    try {
      // Remove from parent object
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${emailKey}`]: deleteField(),
        sharedWithEmails: arrayRemove(displayEmail),
        editorEmails: arrayRemove(displayEmail),
        acceptedShareEmails: arrayRemove(displayEmail)
      });

      // If this share included children, also remove from all descendants
      if (shareData?.includeChildren && allDescendants.length > 0) {
        await Promise.all(allDescendants.map(descendant =>
          updateDoc(doc(db, 'objects', descendant.id), {
            [`shares.${emailKey}`]: deleteField(),
            sharedWithEmails: arrayRemove(displayEmail),
            editorEmails: arrayRemove(displayEmail),
            acceptedShareEmails: arrayRemove(displayEmail)
          })
        ));
      }
    } catch (err) {
      console.error('Error removing share:', err);
      alert('Kunde inte ta bort delningen');
    }
  };

  const handleUpdateRole = async (emailKey, newRole, shareData) => {
    const userEmail = shareData?.email || keyToEmail(emailKey);
    try {
      // Update parent object
      const updateData = {
        [`shares.${emailKey}.role`]: newRole
      };
      // Update editorEmails array based on new role
      if (newRole === 'editor') {
        updateData.editorEmails = arrayUnion(userEmail);
      } else {
        updateData.editorEmails = arrayRemove(userEmail);
      }
      await updateDoc(doc(db, 'objects', object.id), updateData);

      // If this share included children, also update all descendants
      if (shareData?.includeChildren && allDescendants.length > 0) {
        await Promise.all(allDescendants.map(descendant => {
          const descUpdateData = {
            [`shares.${emailKey}.role`]: newRole
          };
          if (newRole === 'editor') {
            descUpdateData.editorEmails = arrayUnion(userEmail);
          } else {
            descUpdateData.editorEmails = arrayRemove(userEmail);
          }
          return updateDoc(doc(db, 'objects', descendant.id), descUpdateData);
        }));
      }
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  // Toggle pause/resume for a share
  const handleTogglePause = async (emailKey, shareData, isPaused) => {
    const userEmail = shareData?.email || keyToEmail(emailKey);
    try {
      // Update parent object
      const updateData = {
        [`shares.${emailKey}.paused`]: !isPaused
      };
      
      // If pausing, remove from sharedWithEmails and acceptedShareEmails (hides object completely)
      // If resuming, add back to both arrays
      if (!isPaused) {
        updateData.sharedWithEmails = arrayRemove(userEmail);
        updateData.acceptedShareEmails = arrayRemove(userEmail);
        updateData.editorEmails = arrayRemove(userEmail);
      } else {
        // Add back to sharedWithEmails
        updateData.sharedWithEmails = arrayUnion(userEmail);
        // Only add back to acceptedShareEmails if status is accepted or inherited
        if (shareData?.status === 'accepted' || shareData?.status === 'inherited') {
          updateData.acceptedShareEmails = arrayUnion(userEmail);
        }
        // Add back to editorEmails if editor role
        if (shareData?.role === 'editor') {
          updateData.editorEmails = arrayUnion(userEmail);
        }
      }
      
      await updateDoc(doc(db, 'objects', object.id), updateData);

      // If this share included children, also update all descendants
      if (shareData?.includeChildren && allDescendants.length > 0) {
        await Promise.all(allDescendants.map(descendant => {
          const descUpdateData = {
            [`shares.${emailKey}.paused`]: !isPaused
          };
          if (!isPaused) {
            descUpdateData.sharedWithEmails = arrayRemove(userEmail);
            descUpdateData.acceptedShareEmails = arrayRemove(userEmail);
            descUpdateData.editorEmails = arrayRemove(userEmail);
          } else {
            descUpdateData.sharedWithEmails = arrayUnion(userEmail);
            const descShare = descendant.shares?.[emailKey];
            if (descShare?.status === 'accepted' || descShare?.status === 'inherited') {
              descUpdateData.acceptedShareEmails = arrayUnion(userEmail);
            }
            if (descShare?.role === 'editor') {
              descUpdateData.editorEmails = arrayUnion(userEmail);
            }
          }
          return updateDoc(doc(db, 'objects', descendant.id), descUpdateData);
        }));
      }
    } catch (err) {
      console.error('Error toggling pause:', err);
    }
  };

  // Remove inherited share from this object only (exclude from parent's share)
  const handleExcludeInherited = async (emailKey, shareData) => {
    const displayEmail = shareData?.email || keyToEmail(emailKey);
    if (!confirm(`Ta bort ärvd delning för ${displayEmail} från detta objekt?\n\nObjektet kommer inte längre vara delat med denna användare, även om föräldern är delad med dem.`)) return;
    
    try {
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${emailKey}`]: deleteField(),
        sharedWithEmails: arrayRemove(displayEmail),
        editorEmails: arrayRemove(displayEmail),
        acceptedShareEmails: arrayRemove(displayEmail)
      });
    } catch (err) {
      console.error('Error excluding inherited share:', err);
      alert('Kunde inte ta bort den ärvda delningen');
    }
  };

  const titleBlock = object.blocks?.find(b => b.type === 'title');

  return (
    <div 
      className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[1100] flex items-end sm:items-center justify-center lg:justify-end sm:p-8 lg:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl lg:rounded-2xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-md lg:max-w-sm sm:w-[90%] lg:w-[28%] h-full sm:h-auto sm:max-h-[85vh] lg:h-[calc(100vh-2rem)] lg:max-h-none overflow-hidden flex flex-col transition-transform duration-200 ease-out relative sm:shadow-2xl sm:shadow-black/50"
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
        <div className="sticky top-0 z-10 px-4 lg:px-5 py-4 lg:py-3 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 lg:gap-2 flex-1 min-w-0">
            <div className="w-10 h-10 lg:w-8 lg:h-8 rounded-xl lg:rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-500/20">
              <Share2 size={20} className="lg:hidden text-purple-400" />
              <Share2 size={16} className="hidden lg:block text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl lg:text-base font-bold text-white truncate">Dela objekt</h2>
              <span className="text-xs text-gray-400 truncate block">{titleBlock?.data?.text || 'Namnlöst objekt'}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-11 h-11 lg:w-8 lg:h-8 flex items-center justify-center rounded-xl lg:rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation flex-shrink-0 ml-2"
            aria-label="Stäng"
          >
            <X size={24} className="lg:hidden" />
            <X size={18} className="hidden lg:block" />
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
              
              {/* Recent contacts */}
              {sharedContacts.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-gray-500 mb-2 block">Senaste kontakter</span>
                  <div className="flex flex-wrap gap-1.5">
                    {sharedContacts
                      .filter(c => c !== currentUserEmail && !shares[emailToKey(c)])
                      .slice(0, 8)
                      .map(contact => (
                        <button
                          key={contact}
                          onClick={() => setEmail(contact)}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                            email === contact 
                              ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' 
                              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                          }`}
                        >
                          {contact.split('@')[0]}
                        </button>
                      ))}
                  </div>
                </div>
              )}
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
                <p className="text-xs text-gray-500">Dela också alla objekt under detta. Kan inte ändras senare – ta bort och lägg till igen vid behov.</p>
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
                  <div key={share.key} className={`flex items-center gap-3 p-3 rounded-xl border ${share.paused ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${share.paused ? 'text-orange-300' : 'text-white'}`}>{share.email}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                        {share.paused ? <><Pause size={10} className="text-orange-400" /> <span className="text-orange-400">Pausad</span></> :
                         share.status === 'pending' ? <><Clock size={10} className="text-amber-400" /> <span>Väntar på svar</span></> : 
                         share.status === 'accepted' ? <><Check size={10} className="text-green-400" /> <span>Accepterad</span></> : 
                         share.status === 'inherited' ? <><CornerDownRight size={10} className="text-blue-400" /> <span>Via förälder</span></> :
                         share.status === 'declined' ? <><XCircle size={10} className="text-red-400" /> <span>Nekad</span></> : 
                         <><Clock size={10} className="text-amber-400" /> <span>Väntar på svar</span></>}
                        {share.includeChildren && <span className="ml-1">• Inkl. barn</span>}
                      </p>
                    </div>
                    <select
                      value={share.role}
                      onChange={(e) => handleUpdateRole(share.key, e.target.value, share)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px', paddingRight: '24px' }}
                    >
                      <option value="viewer" className="bg-gray-800 text-white">Läsare</option>
                      <option value="editor" className="bg-gray-800 text-white">Redigerare</option>
                    </select>
                    {/* Pause/Resume button */}
                    {(share.status === 'accepted' || share.status === 'inherited') && (
                      <button
                        onClick={() => handleTogglePause(share.key, share, share.paused)}
                        className={`p-2 rounded-lg transition-colors ${share.paused ? 'hover:bg-green-500/20 text-orange-400 hover:text-green-400' : 'hover:bg-orange-500/20 text-gray-400 hover:text-orange-400'}`}
                        title={share.paused ? 'Återuppta delning' : 'Pausa delning'}
                      >
                        {share.paused ? <Play size={16} /> : <Pause size={16} />}
                      </button>
                    )}
                    {/* Remove/Exclude button */}
                    {share.status === 'inherited' ? (
                      <button
                        onClick={() => handleExcludeInherited(share.key, share)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                        title="Exkludera från förälderns delning"
                      >
                        <Ban size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRemoveShare(share.key, share.email, share)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                        title="Ta bort delning"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
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
