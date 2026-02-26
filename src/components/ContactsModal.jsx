import React, { useState, useMemo } from 'react';
import { X, Users, Share2, ChevronDown, ChevronRight, Star, Eye, Edit3, Clock, Check, CornerDownRight, ExternalLink } from 'lucide-react';
import { emailToKey } from '../utils/iconHelpers';
import { useSwipeToClose } from '../utils/useSwipeToClose';

function ContactsModal({ onClose, currentUserEmail, objects = [], favoriteContacts = [], onToggleFavoriteContact, onNavigateToObject }) {
  const [activeTab, setActiveTab] = useState('sharing'); // 'sharing' or 'sharedWithMe'
  const [expandedContacts, setExpandedContacts] = useState({});
  
  // Swipe to close
  const swipe = useSwipeToClose(onClose);

  // Helper to get parent title
  const getParentTitle = (parentId) => {
    if (!parentId) return null;
    const parent = objects.find(o => o.id === parentId);
    if (!parent) return null;
    const titleBlock = parent.blocks?.find(b => b.type === 'title');
    return titleBlock?.data?.text || null;
  };

  // Calculate "I'm sharing with" - objects I own that are shared with others
  const sharingData = useMemo(() => {
    const contactMap = {};
    
    objects.forEach(obj => {
      // Only include objects I own
      if (obj.ownerEmail?.toLowerCase() !== currentUserEmail) return;
      if (!obj.shares) return;
      
      Object.entries(obj.shares).forEach(([key, share]) => {
        const email = share.email || key;
        if (email.toLowerCase() === currentUserEmail) return;
        
        if (!contactMap[email]) {
          contactMap[email] = {
            email,
            displayName: share.displayName,
            objects: [],
            pendingCount: 0,
            acceptedCount: 0
          };
        }
        
        const titleBlock = obj.blocks?.find(b => b.type === 'title');
        const parentTitle = getParentTitle(obj.parentId);
        contactMap[email].objects.push({
          id: obj.id,
          title: titleBlock?.data?.text || 'Namnlöst objekt',
          parentTitle,
          role: share.role,
          status: share.status,
          includeChildren: share.includeChildren
        });
        
        if (share.status === 'pending') {
          contactMap[email].pendingCount++;
        } else if (share.status === 'accepted' || share.status === 'inherited') {
          contactMap[email].acceptedCount++;
        }
      });
    });
    
    // Sort: favorites first, then by object count
    return Object.values(contactMap).sort((a, b) => {
      const aFav = favoriteContacts.includes(a.email);
      const bFav = favoriteContacts.includes(b.email);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return b.objects.length - a.objects.length;
    });
  }, [objects, currentUserEmail, favoriteContacts]);

  // Calculate "Shared with me" - objects others have shared with me
  const sharedWithMeData = useMemo(() => {
    const contactMap = {};
    const userEmailKey = emailToKey(currentUserEmail);
    
    objects.forEach(obj => {
      // Only include objects I don't own but have access to
      if (obj.ownerEmail?.toLowerCase() === currentUserEmail) return;
      
      // Check if I have a share entry
      const myShare = obj.shares?.[userEmailKey];
      if (!myShare) return;
      if (myShare.status !== 'accepted' && myShare.status !== 'inherited') return;
      
      const ownerEmail = obj.ownerEmail?.toLowerCase() || 'unknown';
      
      if (!contactMap[ownerEmail]) {
        contactMap[ownerEmail] = {
          email: ownerEmail,
          displayName: obj.ownerName,
          objects: []
        };
      }
      
      const titleBlock = obj.blocks?.find(b => b.type === 'title');
      const parentTitle = getParentTitle(obj.parentId);
      contactMap[ownerEmail].objects.push({
        id: obj.id,
        title: titleBlock?.data?.text || 'Namnlöst objekt',
        parentTitle,
        role: myShare.role,
        status: myShare.status
      });
    });
    
    // Sort by object count
    return Object.values(contactMap).sort((a, b) => b.objects.length - a.objects.length);
  }, [objects, currentUserEmail]);

  const toggleExpanded = (email) => {
    setExpandedContacts(prev => ({
      ...prev,
      [email]: !prev[email]
    }));
  };

  const handleObjectClick = (objectId) => {
    onNavigateToObject?.(objectId);
    onClose();
  };

  const renderContactList = (data, isSharing) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Users size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            {isSharing ? 'Du har inte delat några objekt än' : 'Ingen har delat objekt med dig än'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {data.map(contact => {
          const isExpanded = expandedContacts[contact.email];
          const isFavorite = favoriteContacts.includes(contact.email);
          const [username, domain] = contact.email.split('@');
          
          return (
            <div key={contact.email} className="rounded-xl border border-white/10 overflow-hidden">
              {/* Contact header */}
              <button
                onClick={() => toggleExpanded(contact.email)}
                className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                {/* Avatar with favorite toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavoriteContact?.(contact.email);
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isFavorite 
                      ? 'bg-amber-500/30 text-amber-400 hover:bg-amber-500/40' 
                      : 'bg-gradient-to-br from-blue-500/30 to-cyan-500/30 text-white hover:from-blue-500/40 hover:to-cyan-500/40'
                  }`}
                  title={isFavorite ? 'Ta bort från favoriter' : 'Lägg till som favorit'}
                >
                  {isFavorite ? (
                    <Star size={16} fill="currentColor" />
                  ) : (
                    <span className="text-sm font-medium">{username.charAt(0).toUpperCase()}</span>
                  )}
                </button>
                
                {/* Name and email */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {contact.displayName || username}
                  </p>
                  <p className="text-gray-500 text-xs truncate">
                    {contact.displayName ? contact.email : `@${domain}`}
                  </p>
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="bg-white/10 px-2 py-1 rounded-lg">
                    {contact.objects.length} objekt
                  </span>
                  {isSharing && contact.pendingCount > 0 && (
                    <span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg">
                      {contact.pendingCount} väntar
                    </span>
                  )}
                </div>
                
                {/* Expand icon */}
                {isExpanded ? (
                  <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                )}
              </button>
              
              {/* Expanded object list */}
              {isExpanded && (
                <div className="border-t border-white/10 divide-y divide-white/5">
                  {contact.objects.map(obj => (
                    <button
                      key={obj.id}
                      onClick={() => handleObjectClick(obj.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">
                          {obj.title}
                          {obj.parentTitle && (
                            <span className="text-gray-500 text-xs ml-1.5">
                              (i {obj.parentTitle})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          {obj.role === 'editor' ? (
                            <span className="flex items-center gap-1"><Edit3 size={10} /> Redigerare</span>
                          ) : (
                            <span className="flex items-center gap-1"><Eye size={10} /> Läsare</span>
                          )}
                          {isSharing && (
                            <>
                              <span className="text-gray-600">•</span>
                              {obj.status === 'pending' ? (
                                <span className="flex items-center gap-1 text-amber-400"><Clock size={10} /> Väntar</span>
                              ) : obj.status === 'accepted' ? (
                                <span className="flex items-center gap-1 text-green-400"><Check size={10} /> Accepterad</span>
                              ) : obj.status === 'inherited' ? (
                                <span className="flex items-center gap-1 text-blue-400"><CornerDownRight size={10} /> Ärvd</span>
                              ) : null}
                            </>
                          )}
                          {obj.includeChildren && <span className="text-gray-600">• Inkl. barn</span>}
                        </p>
                      </div>
                      <ExternalLink size={14} className="text-gray-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[1100] flex items-end sm:items-center justify-center lg:justify-end sm:p-8 lg:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={swipe.ref}
        className={`bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl lg:rounded-2xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-md lg:max-w-sm sm:w-[90%] lg:w-[28%] h-full sm:h-auto sm:max-h-[85vh] lg:h-[calc(100dvh-2rem)] lg:max-h-none overflow-hidden flex flex-col ${swipe.className} relative sm:shadow-2xl sm:shadow-black/50`}
        style={swipe.style}
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
              <Users size={20} className="lg:hidden text-blue-400" />
              <Users size={16} className="hidden lg:block text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl lg:text-base font-bold text-white truncate">Kontakter & delningar</h2>
              <span className="text-xs text-gray-400 truncate block">Översikt över delningar</span>
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

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('sharing')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'sharing' 
                ? 'text-blue-400' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Share2 size={14} />
              Jag delar
              {sharingData.length > 0 && (
                <span className="bg-blue-500/20 text-blue-300 text-xs px-1.5 py-0.5 rounded">
                  {sharingData.length}
                </span>
              )}
            </span>
            {activeTab === 'sharing' && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('sharedWithMe')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'sharedWithMe' 
                ? 'text-blue-400' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Users size={14} />
              Delat med mig
              {sharedWithMeData.length > 0 && (
                <span className="bg-blue-500/20 text-blue-300 text-xs px-1.5 py-0.5 rounded">
                  {sharedWithMeData.length}
                </span>
              )}
            </span>
            {activeTab === 'sharedWithMe' && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-5 pb-8 sm:pb-10">
          {activeTab === 'sharing' 
            ? renderContactList(sharingData, true)
            : renderContactList(sharedWithMeData, false)
          }
        </div>
      </div>
    </div>
  );
}

export default ContactsModal;
