import React, { useState, useEffect, useMemo } from 'react';
import { Share2, X, Mail, Loader, UserPlus, UserMinus, Users, Clock, Check, CornerDownRight, XCircle, Eye, Edit3, Pause, Play, Ban, Link2, ClipboardList, Trash2, Search, ChevronDown, Star } from 'lucide-react';
import { doc, updateDoc, onSnapshot, Timestamp, deleteField, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { emailToKey, keyToEmail } from '../utils/iconHelpers';
import { useKeyboardHeight } from '../utils/useKeyboardHeight';
import { useSwipeToClose } from '../utils/useSwipeToClose';

function ShareModal({ object, onClose, currentUserEmail, allObjects = [], sharedContacts = [], favoriteContacts = [], onAddContact, onToggleFavoriteContact }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [includeChildren, setIncludeChildren] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [shares, setShares] = useState(object.shares || {});
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'purge'|'remove'|'exclude', key, email, displayName, shareData }
  const [processing, setProcessing] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  
  // Keyboard-aware height for iOS
  const { viewportHeight, keyboardVisible } = useKeyboardHeight();
  
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
  
  // For collections: get linked objects and their share status
  const isCollection = object.isCollection;
  const linkedObjects = useMemo(() => {
    if (!isCollection) return [];
    return (object.linkedObjectIds || [])
      .map(id => allObjects.find(o => o.id === id))
      .filter(Boolean);
  }, [isCollection, object.linkedObjectIds, allObjects]);
  
  // Track which shares have been pushed to linked objects (state for UI feedback)
  const [pushingToLinked, setPushingToLinked] = useState(false);
  
  // Swipe to close
  const swipe = useSwipeToClose(onClose);
  
  // Listen to real-time updates for this object's shares
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'objects', object.id), (snap) => {
      if (snap.exists()) {
        setShares(snap.data().shares || {});
      }
    });
    return () => unsub();
  }, [object.id]);
  

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
    // Normalize to lowercase for array operations (Firestore arrays are case-sensitive)
    const normalizedEmail = displayEmail.toLowerCase();
    
    setProcessing(true);
    try {
      // Remove from parent object
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${emailKey}`]: deleteField(),
        sharedWithEmails: arrayRemove(normalizedEmail),
        editorEmails: arrayRemove(normalizedEmail),
        acceptedShareEmails: arrayRemove(normalizedEmail)
      });

      // If this share included children, also remove from all descendants
      if (shareData?.includeChildren && allDescendants.length > 0) {
        await Promise.all(allDescendants.map(descendant =>
          updateDoc(doc(db, 'objects', descendant.id), {
            [`shares.${emailKey}`]: deleteField(),
            sharedWithEmails: arrayRemove(normalizedEmail),
            editorEmails: arrayRemove(normalizedEmail),
            acceptedShareEmails: arrayRemove(normalizedEmail)
          })
        ));
      }
      setConfirmDialog(null);
    } catch (err) {
      console.error('Error removing share:', err);
      alert('Kunde inte ta bort delningen');
    } finally {
      setProcessing(false);
    }
  };

  // Purge user data from all blocks (polls, distributions, splits)
  const handlePurgeUserData = async (emailKey, email) => {
    setProcessing(true);
    try {
      const blocks = object.blocks || [];
      let purgedBlocks = [...blocks];
      let changesMade = false;
      
      purgedBlocks = purgedBlocks.map(block => {
        const newBlock = { ...block, data: { ...block.data } };
        
        // Poll block - remove votes
        if (block.type === 'poll' && block.data?.votes?.[emailKey]) {
          const newVotes = { ...block.data.votes };
          delete newVotes[emailKey];
          newBlock.data.votes = newVotes;
          changesMade = true;
        }
        
        // Split block - remove participant
        if (block.type === 'split' && block.data?.participants) {
          const emailLower = email.toLowerCase();
          const filtered = block.data.participants.filter(
            p => p.email?.toLowerCase() !== emailLower
          );
          if (filtered.length !== block.data.participants.length) {
            newBlock.data.participants = filtered;
            changesMade = true;
          }
        }
        
        // Distribution block - remove from slots
        if (block.type === 'distribution' && block.data?.slots) {
          const newSlots = block.data.slots.map(slot => {
            const newSlot = { ...slot };
            if (slot.assignees?.includes(emailKey)) {
              newSlot.assignees = slot.assignees.filter(a => a !== emailKey);
              changesMade = true;
            }
            if (slot.assigneeDetails?.[emailKey]) {
              newSlot.assigneeDetails = { ...slot.assigneeDetails };
              delete newSlot.assigneeDetails[emailKey];
              changesMade = true;
            }
            return newSlot;
          });
          newBlock.data.slots = newSlots;
        }
        
        // Leaderboard - we keep scores but could mark as inactive
        // (Keeping as-is per requirements)
        
        return newBlock;
      });
      
      if (changesMade) {
        await updateDoc(doc(db, 'objects', object.id), {
          blocks: purgedBlocks,
          updatedAt: Timestamp.now()
        });
      }
      
      setConfirmDialog(null);
    } catch (err) {
      console.error('Error purging user data:', err);
      alert('Kunde inte rensa data');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateRole = async (emailKey, newRole, shareData) => {
    const userEmail = (shareData?.email || keyToEmail(emailKey)).toLowerCase();
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
    const userEmail = (shareData?.email || keyToEmail(emailKey)).toLowerCase();
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
    // Normalize to lowercase for array operations (Firestore arrays are case-sensitive)
    const normalizedEmail = displayEmail.toLowerCase();
    
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${emailKey}`]: deleteField(),
        sharedWithEmails: arrayRemove(normalizedEmail),
        editorEmails: arrayRemove(normalizedEmail),
        acceptedShareEmails: arrayRemove(normalizedEmail)
      });
      setConfirmDialog(null);
    } catch (err) {
      console.error('Error excluding inherited share:', err);
      alert('Kunde inte ta bort den ärvda delningen');
    } finally {
      setProcessing(false);
    }
  };

  // Push sharing to all linked objects in a collection (one-off operation)
  const handlePushToLinkedObjects = async (emailKey, shareData) => {
    if (!isCollection || linkedObjects.length === 0) return;
    
    const userEmail = (shareData?.email || keyToEmail(emailKey)).toLowerCase();
    
    // Count how many linked objects already have this share
    const alreadyShared = linkedObjects.filter(obj => obj.shares?.[emailKey]);
    const toShare = linkedObjects.filter(obj => !obj.shares?.[emailKey]);
    
    if (toShare.length === 0) {
      alert(`Alla ${linkedObjects.length} länkade objekt är redan delade med ${userEmail}.`);
      return;
    }
    
    const confirmMsg = alreadyShared.length > 0 
      ? `Dela ${toShare.length} objekt med ${userEmail}?\n\n${alreadyShared.length} objekt är redan delade och behålls som de är.\n\nDetta är en engångsåtgärd – framtida ändringar hanteras på respektive objekt.`
      : `Dela alla ${toShare.length} länkade objekt med ${userEmail}?\n\nDetta är en engångsåtgärd – framtida ändringar hanteras på respektive objekt.`;
    
    if (!confirm(confirmMsg)) return;
    
    setPushingToLinked(true);
    try {
      const shareEntry = {
        email: userEmail,
        role: shareData?.role || 'viewer',
        status: 'pending',
        sharedAt: Timestamp.now(),
        sharedBy: currentUserEmail,
        includeChildren: false // Don't propagate to children of linked objects
      };
      
      await Promise.all(toShare.map(obj => 
        updateDoc(doc(db, 'objects', obj.id), {
          [`shares.${emailKey}`]: shareEntry,
          sharedWithEmails: arrayUnion(userEmail)
        })
      ));
      
      alert(`✓ Delat ${toShare.length} objekt med ${userEmail}!`);
    } catch (err) {
      console.error('Error pushing to linked objects:', err);
      alert('Kunde inte dela alla länkade objekt. Försök igen.');
    } finally {
      setPushingToLinked(false);
    }
  };

  const titleBlock = object.blocks?.find(b => b.type === 'title');

  return (
    <div 
      className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[1100] flex items-end sm:items-center justify-center lg:justify-end sm:p-8 lg:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={swipe.ref}
        className={`bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl lg:rounded-2xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-md lg:max-w-sm sm:w-[90%] lg:w-[28%] ${keyboardVisible ? '' : 'h-full'} sm:h-auto sm:max-h-[85vh] lg:h-[calc(100dvh-2rem)] lg:max-h-none overflow-hidden flex flex-col ${swipe.className} relative sm:shadow-2xl sm:shadow-black/50`}
        style={{ ...swipe.style, ...(keyboardVisible ? { height: `${viewportHeight}px` } : {}) }}
        {...swipe.handlers}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative gradient */}
        <div 
          className="absolute top-0 left-0 right-0 h-72 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, rgba(59,130,246,0.12), rgba(59,130,246,0.05) 50%, transparent)` }}
        />
        
        {/* Fixed header */}
        <div className="sticky top-0 z-10 px-4 lg:px-5 py-4 lg:py-3 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 lg:gap-2 flex-1 min-w-0">
            <div className="w-10 h-10 lg:w-8 lg:h-8 rounded-xl lg:rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/20">
              <Share2 size={20} className="lg:hidden text-blue-400" />
              <Share2 size={16} className="hidden lg:block text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl lg:text-base font-bold text-white truncate">Dela objekt</h2>
              <span className="text-xs text-gray-400 truncate block">{titleBlock?.data?.text || 'Namnlöst objekt'}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 lg:w-8 lg:h-8 flex items-center justify-center rounded-xl lg:rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation flex-shrink-0 ml-2"
            aria-label="Stäng"
          >
            <X size={20} className="lg:hidden" />
            <X size={16} className="hidden lg:block" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-5 pb-8 sm:pb-10">
          {/* Section: Dela till */}
          <div className="mb-8">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-blue-400" />
              Dela till
            </h3>
            
            <div className="space-y-3">
              {/* Email input */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">E-post</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); setShowContactPicker(false); }}
                    placeholder="Skriv e-post eller välj nedan..."
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && email.trim() && handleInvite()}
                    onFocus={() => sharedContacts.length > 0 && !email && setShowContactPicker(true)}
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
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              </div>
              
              {/* Contact picker - expandable list with search */}
              {sharedContacts.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowContactPicker(!showContactPicker)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
                  >
                    <Users size={14} />
                    <span>Välj från kontakter ({sharedContacts.filter(c => c !== currentUserEmail && !shares[emailToKey(c)]).length})</span>
                    <ChevronDown size={14} className={`ml-auto transition-transform ${showContactPicker ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showContactPicker && (
                    <div className="mt-2 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                      {/* Search within contacts */}
                      {sharedContacts.filter(c => c !== currentUserEmail && !shares[emailToKey(c)]).length > 5 && (
                        <div className="p-2 border-b border-white/10">
                          <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                              type="text"
                              value={contactSearch}
                              onChange={(e) => setContactSearch(e.target.value)}
                              placeholder="Sök kontakter..."
                              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Contact list - sorted: favorites first, then 5 most recent, then alphabetically */}
                      <div className="max-h-48 overflow-y-auto">
                        {(() => {
                          const availableContacts = sharedContacts
                            .filter(c => c !== currentUserEmail && !shares[emailToKey(c)])
                            .filter(c => !contactSearch || c.toLowerCase().includes(contactSearch.toLowerCase()));
                          
                          // Sort contacts: favorites first, then recent (first 5 in sharedContacts), then alphabetically
                          const sortedContacts = [...availableContacts].sort((a, b) => {
                            const aIsFavorite = favoriteContacts.includes(a);
                            const bIsFavorite = favoriteContacts.includes(b);
                            const aRecentIndex = sharedContacts.indexOf(a);
                            const bRecentIndex = sharedContacts.indexOf(b);
                            const aIsRecent = aRecentIndex >= sharedContacts.length - 5;
                            const bIsRecent = bRecentIndex >= sharedContacts.length - 5;
                            
                            // Favorites always first
                            if (aIsFavorite && !bIsFavorite) return -1;
                            if (!aIsFavorite && bIsFavorite) return 1;
                            
                            // Within favorites or non-favorites, recent ones come before alphabetical
                            if (aIsRecent && !bIsRecent) return -1;
                            if (!aIsRecent && bIsRecent) return 1;
                            
                            // Within same group, sort recent by recency (most recent first)
                            if (aIsRecent && bIsRecent) {
                              return bRecentIndex - aRecentIndex;
                            }
                            
                            // Non-recent, non-favorites: alphabetical
                            return a.toLowerCase().localeCompare(b.toLowerCase(), 'sv');
                          });
                          
                          // Determine section boundaries for visual separation
                          let lastSection = null;
                          
                          return sortedContacts.map((contact, index) => {
                            const [username, domain] = contact.split('@');
                            const isFavorite = favoriteContacts.includes(contact);
                            const recentIndex = sharedContacts.indexOf(contact);
                            const isRecent = recentIndex >= sharedContacts.length - 5 && !isFavorite;
                            
                            // Determine current section
                            let currentSection = 'alphabetical';
                            if (isFavorite) currentSection = 'favorites';
                            else if (isRecent) currentSection = 'recent';
                            
                            // Show separator between sections
                            const showSeparator = lastSection !== null && lastSection !== currentSection;
                            lastSection = currentSection;
                            
                            return (
                              <div key={contact}>
                                {showSeparator && (
                                  <div className="border-t border-white/10 my-1" />
                                )}
                                {/* Section header */}
                                {index === 0 || showSeparator ? (
                                  <div className="px-3 py-1.5 text-xs text-gray-500 bg-white/5">
                                    {currentSection === 'favorites' && '★ Favoriter'}
                                    {currentSection === 'recent' && 'Senaste'}
                                    {currentSection === 'alphabetical' && 'Alla kontakter'}
                                  </div>
                                ) : null}
                                <div
                                  className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-white/10 transition-colors text-left cursor-pointer ${
                                    email === contact ? 'bg-blue-500/20' : ''
                                  }`}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleFavoriteContact?.(contact);
                                    }}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                                      isFavorite 
                                        ? 'bg-amber-500/30 text-amber-400 hover:bg-amber-500/40' 
                                        : 'bg-gradient-to-br from-blue-500/30 to-cyan-500/30 text-white hover:from-blue-500/40 hover:to-cyan-500/40'
                                    }`}
                                    title={isFavorite ? 'Ta bort från favoriter' : 'Lägg till som favorit'}
                                  >
                                    {isFavorite ? (
                                      <Star size={14} fill="currentColor" />
                                    ) : (
                                      <span className="text-sm font-medium">{username.charAt(0).toUpperCase()}</span>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEmail(contact);
                                      setShowContactPicker(false);
                                      setContactSearch('');
                                    }}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <p className="text-white text-sm font-medium truncate">{username}</p>
                                    <p className="text-gray-500 text-xs truncate">@{domain}</p>
                                  </button>
                                  {email === contact && (
                                    <Check size={16} className="text-blue-400 flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                        {sharedContacts.filter(c => c !== currentUserEmail && !shares[emailToKey(c)]).filter(c => !contactSearch || c.toLowerCase().includes(contactSearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-4 text-center text-gray-500 text-sm">
                            {contactSearch ? 'Inga kontakter matchar sökningen' : 'Inga tillgängliga kontakter'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Settings - only show when email is entered */}
              {email.trim() && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 text-blue-300 text-sm font-medium">
                    <Mail size={14} />
                    <span className="truncate">{email}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRole('viewer')}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        role === 'viewer' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Eye size={16} />
                      Läsare
                    </button>
                    <button
                      onClick={() => setRole('editor')}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        role === 'editor' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Edit3 size={16} />
                      Redigerare
                    </button>
                  </div>

                  {/* Include children - only for non-collections */}
                  {!isCollection && (
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeChildren}
                        onChange={(e) => setIncludeChildren(e.target.checked)}
                        className="w-4 h-4 rounded border-blue-500 text-blue-500 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-200 text-sm">Inkludera barn-objekt</span>
                        <p className="text-xs text-gray-500">Dela även alla objekt under detta</p>
                      </div>
                    </label>
                  )}

                  {/* Invite button */}
                  <button
                    onClick={handleInvite}
                    disabled={saving}
                    className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Bjuder in...
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        Bjud in {email.split('@')[0]}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section: Delad med */}
          {sharesList.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Users size={18} className="text-blue-400" />
                Delad med
                <span className="text-sm font-normal text-gray-500">({sharesList.length})</span>
              </h3>
              <div className="space-y-2">
                {sharesList.map(share => (
                  <div key={share.key} className={`flex items-center gap-3 p-3 rounded-xl border ${share.paused ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex-1 min-w-0">
                      {share.displayName ? (
                        <>
                          <p className={`text-sm truncate ${share.paused ? 'text-orange-300' : 'text-white'}`}>{share.displayName}</p>
                          <p className="text-xs text-gray-500 truncate">{share.email}</p>
                        </>
                      ) : (
                        <p className={`text-sm truncate ${share.paused ? 'text-orange-300' : 'text-white'}`}>{share.email}</p>
                      )}
                      <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap mt-0.5">
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
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
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
                    {/* Action menu - Purge data & Remove */}
                    <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-1">
                      <button
                        onClick={() => setConfirmDialog({ type: 'purge', key: share.key, email: share.email, displayName: share.displayName })}
                        className="p-2 rounded-lg hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 transition-colors"
                        title="Rensa användarens data"
                      >
                        <Trash2 size={16} />
                      </button>
                      {share.status === 'inherited' ? (
                        <button
                          onClick={() => setConfirmDialog({ type: 'exclude', key: share.key, email: share.email, displayName: share.displayName, shareData: share })}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                          title="Exkludera från delning"
                        >
                          <Ban size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDialog({ type: 'remove', key: share.key, email: share.email, displayName: share.displayName, shareData: share })}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                          title="Ta bort delning"
                        >
                          <UserMinus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collection: Linked objects sharing section */}
          {isCollection && linkedObjects.length > 0 && sharesList.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
                <ClipboardList size={16} />
                Länkade objekt ({linkedObjects.length})
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Delning sker separat på varje objekt. Använd knappen för att snabbt dela alla med en person.
              </p>
              <div className="space-y-2">
                {sharesList.map(share => {
                  const sharedCount = linkedObjects.filter(obj => obj.shares?.[share.key]).length;
                  const notSharedCount = linkedObjects.length - sharedCount;
                  const allShared = notSharedCount === 0;
                  
                  return (
                    <div key={`linked-${share.key}`} className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-blue-200 truncate">{share.displayName || share.email}</p>
                        {share.displayName && <p className="text-xs text-gray-500 truncate">{share.email}</p>}
                        <p className="text-xs text-gray-500">
                          {allShared ? (
                            <span className="text-green-400">✓ Alla {linkedObjects.length} objekt delade</span>
                          ) : (
                            <span>{sharedCount} av {linkedObjects.length} objekt delade</span>
                          )}
                        </p>
                      </div>
                      {!allShared && (
                        <button
                          onClick={() => handlePushToLinkedObjects(share.key, share)}
                          disabled={pushingToLinked}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200 transition-colors disabled:opacity-50 disabled:cursor-wait"
                        >
                          {pushingToLinked ? (
                            <Loader size={12} className="animate-spin" />
                          ) : (
                            <Link2 size={12} />
                          )}
                          Dela alla
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Unified confirmation dialog */}
      {confirmDialog && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-20">
          <div className="bg-gray-900 rounded-2xl p-5 max-w-sm w-full border border-white/10">
            {/* Purge data dialog */}
            {confirmDialog.type === 'purge' && (
              <>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Trash2 size={18} className="text-amber-400" />
                  Rensa data
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  Rensa all data för <span className="text-white font-medium">{confirmDialog.displayName || confirmDialog.email}</span>?
                </p>
                <p className="text-gray-500 text-xs mb-4 p-3 rounded-lg bg-white/5">
                  Tar bort: röster i omröstningar, platser i fördelningar, och belopp i splittar. Delningen behålls, endast data rensas.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    disabled={processing}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium disabled:opacity-50"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={() => handlePurgeUserData(confirmDialog.key, confirmDialog.email)}
                    disabled={processing}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white hover:bg-amber-400 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    Rensa data
                  </button>
                </div>
              </>
            )}
            
            {/* Remove share dialog */}
            {confirmDialog.type === 'remove' && (
              <>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <UserMinus size={18} className="text-red-400" />
                  Ta bort delning
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  Ta bort delning för <span className="text-white font-medium">{confirmDialog.displayName || confirmDialog.email}</span>?
                </p>
                <p className="text-gray-500 text-xs mb-4 p-3 rounded-lg bg-white/5">
                  Användaren förlorar tillgång till objektet{confirmDialog.shareData?.includeChildren ? ' och alla barn-objekt' : ''}. Eventuell data (röster etc.) behålls.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    disabled={processing}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium disabled:opacity-50"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={() => handleRemoveShare(confirmDialog.key, confirmDialog.email, confirmDialog.shareData)}
                    disabled={processing}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-400 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing ? <Loader size={16} className="animate-spin" /> : <UserMinus size={16} />}
                    Ta bort
                  </button>
                </div>
              </>
            )}
            
            {/* Exclude inherited share dialog */}
            {confirmDialog.type === 'exclude' && (
              <>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Ban size={18} className="text-red-400" />
                  Exkludera från delning
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  Exkludera <span className="text-white font-medium">{confirmDialog.displayName || confirmDialog.email}</span> från detta objekt?
                </p>
                <p className="text-gray-500 text-xs mb-4 p-3 rounded-lg bg-white/5">
                  Användaren har åtkomst via en förälder. Detta tar bort åtkomsten endast för detta objekt – föräldern förblir delad.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    disabled={processing}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium disabled:opacity-50"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={() => handleExcludeInherited(confirmDialog.key, confirmDialog.shareData)}
                    disabled={processing}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-400 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing ? <Loader size={16} className="animate-spin" /> : <Ban size={16} />}
                    Exkludera
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShareModal;
