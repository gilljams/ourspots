import React, { useState, useEffect } from 'react';
import { List, ChevronDown, RefreshCw, X, AlertTriangle, XCircle, RefreshCcw } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteField, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useSwipeToClose } from '../utils/useSwipeToClose';
import { useConfirm } from '../utils/useConfirm';
import { useToast } from '../utils/useToast';

function ObjectsAdminModal({ objects: passedObjects, categories, onClose, onViewObject }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [sortBy, setSortBy] = useState('title'); // title, category, parent
  const [filterUserId, setFilterUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [allObjects, setAllObjects] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  
  // Fetch ALL objects for admin view
  useEffect(() => {
    const objectsRef = collection(db, 'objects');
    const unsub = onSnapshot(objectsRef, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      setAllObjects(all);
      setLoadingAll(false);
    }, (error) => {
      console.error('Admin: Error loading all objects:', error);
      // Fallback to passed objects if admin query fails
      setAllObjects(passedObjects);
      setLoadingAll(false);
    });
    return () => unsub();
  }, [passedObjects]);
  
  // Use allObjects if loaded, otherwise passedObjects
  const objects = loadingAll ? passedObjects : allObjects;
  
  // Swipe to close
  const swipe = useSwipeToClose(onClose);

  const getObjectTitle = (obj) => {
    return obj.blocks?.find(b => b.type === 'title')?.data?.text || 'Namnlöst objekt';
  };

  const getCategoryLabel = (typeId) => {
    const cat = categories.find(c => c.id === typeId);
    return cat ? cat.label : typeId;
  };

  const getChildCount = (objId) => {
    return objects.filter(o => o.parentId === objId).length;
  };

  // Migration function to update parentPath AND ancestorIds for all objects
  // Also fixes inherited shares by adding them to acceptedShareEmails
  const migrateParentPaths = async () => {
    if (migrating) return;
    
    const objectsWithParent = objects.filter(o => o.parentId);
    
    setMigrating(true);
    setMigrationResult(null);
    
    try {
      let updated = 0;
      let skipped = 0;
      let inheritedFixed = 0;
      
      // First: Fix parentPath and ancestorIds
      for (const obj of objectsWithParent) {
        // Build parent path (names) AND ancestor IDs
        const path = [];
        const ids = [];
        let currentId = obj.parentId;
        let depth = 0;
        while (currentId && depth < 10) {
          const p = objects.find(o => o.id === currentId);
          if (p) {
            const name = p.blocks?.find(b => b.type === 'title')?.data?.text;
            if (name) path.unshift(name);
            ids.unshift(currentId); // Add ID to ancestor list
            currentId = p.parentId;
          } else {
            break;
          }
          depth++;
        }
        
        // Update with both parentPath and ancestorIds
        if (ids.length > 0) {
          await updateDoc(doc(db, 'objects', obj.id), { 
            parentPath: path.length > 0 ? path : [], 
            ancestorIds: ids 
          });
          updated++;
        } else {
          skipped++;
        }
      }
      
      // Second: Fix inherited shares - add to acceptedShareEmails
      for (const obj of objects) {
        if (!obj.shares) continue;
        
        const inheritedEmails = [];
        Object.entries(obj.shares).forEach(([emailKey, share]) => {
          if (share.status === 'inherited' && share.email) {
            // Check if not already in acceptedShareEmails
            if (!obj.acceptedShareEmails?.includes(share.email.toLowerCase())) {
              inheritedEmails.push(share.email.toLowerCase());
            }
          }
        });
        
        if (inheritedEmails.length > 0) {
          await updateDoc(doc(db, 'objects', obj.id), {
            acceptedShareEmails: arrayUnion(...inheritedEmails)
          });
          inheritedFixed++;
        }
      }
      
      const messages = [];
      if (updated > 0) messages.push(`${updated} objekt uppdaterade med parentPath + ancestorIds`);
      if (skipped > 0) messages.push(`${skipped} kunde inte bygga path för`);
      if (inheritedFixed > 0) messages.push(`${inheritedFixed} objekt med ärvda delningar fixade`);
      if (messages.length === 0) messages.push('Inget att uppdatera');
      
      setMigrationResult({ 
        success: true, 
        message: `Klart! ${messages.join(', ')}.` 
      });
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationResult({ success: false, message: `Fel: ${error.message}` });
    } finally {
      setMigrating(false);
    }
  };

  // Get unique users from objects with their info
  const usersMap = new Map();
  objects.forEach(obj => {
    if (obj.ownerId && !usersMap.has(obj.ownerId)) {
      usersMap.set(obj.ownerId, {
        id: obj.ownerId,
        name: obj.ownerName || obj.ownerEmail || obj.ownerId,
        email: obj.ownerEmail
      });
    }
  });
  const users = Array.from(usersMap.values());
  
  // Filter objects - show nothing if no filter selected
  let filteredObjects = [];
  if (filterUserId === 'all') {
    filteredObjects = objects;
  } else if (filterUserId) {
    filteredObjects = objects.filter(o => o.ownerId === filterUserId);
  }
  
  if (searchTerm && filteredObjects.length > 0) {
    const term = searchTerm.toLowerCase();
    filteredObjects = filteredObjects.filter(o => getObjectTitle(o).toLowerCase().includes(term));
  }

  // Sort objects
  let sortedObjects = [...filteredObjects];
  if (sortBy === 'title') {
    sortedObjects.sort((a, b) => getObjectTitle(a).localeCompare(getObjectTitle(b)));
  } else if (sortBy === 'category') {
    sortedObjects.sort((a, b) => (a.type || '').localeCompare(b.type || ''));
  } else if (sortBy === 'parent') {
    sortedObjects.sort((a, b) => {
      if (a.parentId && !b.parentId) return 1;
      if (!a.parentId && b.parentId) return -1;
      return (a.parentId || '').localeCompare(b.parentId || '');
    });
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[1000] flex items-end sm:items-center justify-center lg:justify-end sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={swipe.ref}
        className={`bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-2xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-lg sm:w-[90%] lg:w-[35%] h-full sm:h-auto sm:max-h-[85vh] lg:h-[calc(100dvh-2rem)] lg:max-h-none overflow-hidden flex flex-col pt-[var(--sat)] sm:pt-0 ${swipe.className} relative sm:shadow-2xl sm:shadow-black/50`}
        style={swipe.style}
        {...swipe.handlers}
      >
        {/* Subtle decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-blue-600/8 via-blue-900/5 to-transparent pointer-events-none" />
        
        {/* Fixed header */}
        <div className="sticky top-0 z-10 px-4 py-4 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
              <List size={20} className="text-blue-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Alla objekt</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation"
            aria-label="Stäng"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Filters section */}
        <div className="px-4 py-3 sm:p-4 border-b border-white/5 relative z-[1]">
          {/* User select with proper dark mode styling */}
          <div className="relative">
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-base focus:outline-none focus:border-blue-400/50 appearance-none cursor-pointer"
            >
              <option value="">Välj användare...</option>
              <option value="all">Alla användare ({objects.length} objekt)</option>
              {users.map(user => {
                const userObjects = objects.filter(o => o.ownerId === user.id);
                return (
                  <option key={user.id} value={user.id}>
                    {user.name} ({userObjects.length} objekt)
                  </option>
                );
              })}
            </select>
            <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          
          {filterUserId && (
            <div className="mt-3">
              {/* Toggle filters button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-3"
              >
                <ChevronDown size={16} className={`transition-transform ${showFilters ? '' : '-rotate-90'}`} />
                <span>{sortedObjects.length} objekt{filterUserId !== 'all' && ` av ${objects.length}`}</span>
                <span className="text-gray-600">•</span>
                <span>Sök & sortera</span>
              </button>
              
              {showFilters && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Sök på titel..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-base focus:outline-none focus:border-blue-400/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSortBy('title')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'title' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                      Titel
                    </button>
                    <button
                      onClick={() => setSortBy('category')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'category' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                      Kategori
                    </button>
                    <button
                      onClick={() => setSortBy('parent')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'parent' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                      Parent
                    </button>
                  </div>
                  
                  {/* Migration button */}
                  <div className="pt-3 border-t border-white/5 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Synkar hierarki-index (parentPath + ancestorIds)</p>
                      <button
                        onClick={migrateParentPaths}
                        disabled={migrating}
                        className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={`${migrating ? 'animate-spin' : ''}`} />
                        {migrating ? 'Synkar...' : 'Synka hierarki'}
                      </button>
                      {migrationResult && (
                        <p className={`text-xs mt-2 ${migrationResult.success ? 'text-green-400' : 'text-red-400'}`}>
                          {migrationResult.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-6 pb-8 sm:pb-10">
          <div className="space-y-2">
            {!filterUserId ? (
              <div className="text-center py-12 text-gray-500">
                <List size={48} className="mx-auto mb-4 opacity-50" />
                <p>Välj en användare ovan för att se objekt</p>
              </div>
            ) : sortedObjects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Inga objekt hittades</p>
              </div>
            ) : sortedObjects.map(obj => {
              const hasInvalidCategory = !categories.find(c => c.id === obj.type);
              const parent = obj.parentId ? objects.find(o => o.id === obj.parentId) : null;
              const childCount = getChildCount(obj.id);
              const hasCircularParent = obj.parentId === obj.id;
              const hasInvalidParent = obj.parentId && !parent;
              
              return (
                <div
                  key={obj.id}
                  className={`p-4 rounded-xl border ${hasInvalidCategory || hasCircularParent || hasInvalidParent ? 'bg-yellow-400/5 border-yellow-400/30' : 'bg-white/5 border-white/10'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium truncate">{getObjectTitle(obj)}</h3>
                        {(hasInvalidCategory || hasCircularParent || hasInvalidParent) && (
                          <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <div>Kategori: <span className={hasInvalidCategory ? 'text-yellow-400' : 'text-gray-300'}>{getCategoryLabel(obj.type)}</span></div>
                        {obj.parentId && (
                          <div>
                            Parent: <span className={hasCircularParent ? 'text-red-400' : hasInvalidParent ? 'text-yellow-400' : 'text-blue-400'}>
                              {hasCircularParent ? <><RefreshCcw size={12} className="inline mr-1" />Cirkulär (sig själv!)</> : parent ? getObjectTitle(parent) : <><XCircle size={12} className="inline mr-1" />{obj.parentId}</>}
                            </span>
                          </div>
                        )}
                        {childCount > 0 && (
                          <div>Children: <span className="text-green-400">{childCount}</span></div>
                        )}
                        <div className="text-xs text-gray-500">ID: {obj.id}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {(hasCircularParent || hasInvalidParent) && (
                        <button
                          onClick={async () => {
                            if (await confirm({ title: 'Ta bort parent?', message: 'Parent-referensen tas bort från objektet.', confirmText: 'Ta bort', variant: 'danger' })) {
                              try {
                                await updateDoc(doc(db, 'objects', obj.id), { parentId: deleteField() });
                              } catch (err) {
                                console.error('Error removing parent:', err);
                                toast.error('Kunde inte ta bort parent');
                              }
                            }
                          }}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                        >
                          Ta bort parent
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onViewObject(obj);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                      >
                        Visa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ObjectsAdminModal;
