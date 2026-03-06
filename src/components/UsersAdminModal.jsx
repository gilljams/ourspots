import React, { useState, useEffect } from 'react';
import { Users, Shield, ShieldOff, Ban, CheckCircle, Search, X, ChevronDown, Mail, Package, Share2, Calendar, UserCheck, Settings, Save, RefreshCw, Check } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useSwipeToClose } from '../utils/useSwipeToClose';
import { useConfirm } from '../utils/useConfirm';
import { useToast } from '../utils/useToast';

function UsersAdminModal({ currentUserId, onClose, menuOpen }) {
  const [users, setUsers] = useState([]);
  const confirm = useConfirm();
  const toast = useToast();
  const [allObjects, setAllObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, admin, blocked, active, pending
  const [sortBy, setSortBy] = useState('name'); // name, objects, created
  const [updating, setUpdating] = useState(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState({
    defaultObjectLimit: 5,
    approvedObjectLimit: 100
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncingNames, setSyncingNames] = useState(false);
  const [syncNamesResult, setSyncNamesResult] = useState(null);
  
  // Fetch app settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setAppSettings({
            defaultObjectLimit: data.defaultObjectLimit ?? 5,
            approvedObjectLimit: data.approvedObjectLimit ?? 100
          });
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);
  
  // Save app settings
  const [settingsSaved, setSettingsSaved] = useState(false);
  
  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'app'), {
        defaultObjectLimit: appSettings.defaultObjectLimit,
        approvedObjectLimit: appSettings.approvedObjectLimit,
        updatedAt: Timestamp.now()
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Kunde inte spara inställningar');
    }
    setSavingSettings(false);
  };
  
  // Fetch all users
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsub = onSnapshot(usersRef, (snap) => {
      const fetchedUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(fetchedUsers);
    }, (error) => {
      console.error('Error loading users:', error);
    });
    return () => unsub();
  }, []);
  
  // Fetch ALL objects (admin needs to see all for stats)
  useEffect(() => {
    const objectsRef = collection(db, 'objects');
    const unsub = onSnapshot(objectsRef, (snap) => {
      const fetchedObjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllObjects(fetchedObjects);
      setLoading(false);
    }, (error) => {
      console.error('Error loading objects:', error);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  
  // Calculate stats for each user
  const usersWithStats = users.map(user => {
    const userObjects = allObjects.filter(o => o.ownerId === user.id);
    const sharedToOthers = userObjects.filter(o => o.sharedWithEmails?.length > 0).length;
    const sharedWithUser = allObjects.filter(o => 
      o.ownerId !== user.id && 
      o.sharedWithEmails?.includes(user.email?.toLowerCase())
    ).length;
    
    return {
      ...user,
      objectCount: userObjects.length,
      sharedToOthers,
      sharedWithUser
    };
  });
  
  // Filter and sort
  let filteredUsers = usersWithStats;
  
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredUsers = filteredUsers.filter(u => 
      u.email?.toLowerCase().includes(term) ||
      u.displayName?.toLowerCase().includes(term)
    );
  }
  
  if (filterStatus === 'admin') {
    filteredUsers = filteredUsers.filter(u => u.isAdmin);
  } else if (filterStatus === 'blocked') {
    filteredUsers = filteredUsers.filter(u => u.blocked);
  } else if (filterStatus === 'active') {
    filteredUsers = filteredUsers.filter(u => !u.blocked && !u.isAdmin && u.approved);
  } else if (filterStatus === 'pending') {
    filteredUsers = filteredUsers.filter(u => !u.blocked && !u.isAdmin && !u.approved);
  }
  
  filteredUsers.sort((a, b) => {
    if (sortBy === 'name') {
      return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '');
    } else if (sortBy === 'objects') {
      return b.objectCount - a.objectCount;
    } else if (sortBy === 'created') {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    }
    return 0;
  });
  
  // Toggle admin status
  const toggleAdmin = async (userId, currentStatus) => {
    if (userId === currentUserId) {
      toast.error('Du kan inte ändra din egen admin-status!');
      return;
    }
    
    setUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        isAdmin: !currentStatus,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error updating admin status:', err);
      toast.error('Kunde inte uppdatera admin-status');
    }
    setUpdating(null);
  };
  
  // Toggle blocked status
  const toggleBlocked = async (userId, currentStatus) => {
    if (userId === currentUserId) {
      toast.error('Du kan inte blockera dig själv!');
      return;
    }
    
    const action = currentStatus ? 'avblockera' : 'blockera';
    if (!await confirm({ title: `${currentStatus ? 'Avblockera' : 'Blockera'} användare?`, message: `Är du säker på att du vill ${action} denna användare?`, confirmText: action.charAt(0).toUpperCase() + action.slice(1), variant: currentStatus ? 'info' : 'danger' })) {
      return;
    }
    
    setUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        blocked: !currentStatus,
        blockedAt: !currentStatus ? Timestamp.now() : null,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error updating blocked status:', err);
      toast.error('Kunde inte uppdatera blockerad-status');
    }
    setUpdating(null);
  };
  
  // Toggle approved status
  const toggleApproved = async (userId, currentStatus) => {
    setUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        approved: !currentStatus,
        approvedAt: !currentStatus ? Timestamp.now() : null,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error updating approved status:', err);
      toast.error('Kunde inte uppdatera godkännande-status');
    }
    setUpdating(null);
  };

  // Sync display names from users collection to all objects
  // Updates: shares.displayName, leaderboard/split participants, poll votes
  const syncDisplayNames = async () => {
    if (syncingNames) return;
    
    setSyncingNames(true);
    setSyncNamesResult(null);
    
    try {
      // Build a map of email -> displayName from users collection
      const nameMap = new Map();
      users.forEach(user => {
        if (user.email && user.displayName) {
          nameMap.set(user.email.toLowerCase(), user.displayName);
        }
      });
      
      if (nameMap.size === 0) {
        setSyncNamesResult({ 
          success: true, 
          message: 'Inga användare har angett visningsnamn.' 
        });
        setSyncingNames(false);
        return;
      }
      
      let objectsUpdated = 0;
      let sharesUpdated = 0;
      let participantsUpdated = 0;
      let pollVotesUpdated = 0;
      
      for (const obj of allObjects) {
        let needsUpdate = false;
        const updates = {};
        
        // 1. Update shares displayName
        if (obj.shares) {
          const updatedShares = { ...obj.shares };
          let sharesModified = false;
          
          Object.entries(updatedShares).forEach(([key, share]) => {
            const email = share.email?.toLowerCase();
            const newName = nameMap.get(email);
            
            if (newName && newName !== share.displayName) {
              updatedShares[key] = { ...share, displayName: newName };
              sharesModified = true;
              sharesUpdated++;
            }
          });
          
          if (sharesModified) {
            updates.shares = updatedShares;
            needsUpdate = true;
          }
        }
        
        // 2. Update blocks (leaderboard, split, poll)
        if (obj.blocks) {
          let blocksModified = false;
          const updatedBlocks = obj.blocks.map(block => {
            // Leaderboard, Split and Distribution blocks - update participants
            if (block.type === 'leaderboard' || block.type === 'split' || block.type === 'distribution') {
              const participants = block.data?.participants || [];
              if (participants.length === 0) return block;
              
              let modified = false;
              const updatedParticipants = participants.map(p => {
                const email = p.email?.toLowerCase();
                const newName = nameMap.get(email);
                
                if (newName && newName !== p.name) {
                  modified = true;
                  participantsUpdated++;
                  return { ...p, name: newName };
                }
                return p;
              });
              
              if (modified) {
                blocksModified = true;
                return {
                  ...block,
                  data: { ...block.data, participants: updatedParticipants }
                };
              }
            }
            
            // Poll blocks - update vote displayNames
            if (block.type === 'poll' && block.data?.votes) {
              const votes = block.data.votes;
              let modified = false;
              const updatedVotes = { ...votes };
              
              Object.entries(votes).forEach(([emailKey, voteData]) => {
                // Convert emailKey back to email (replace _DOT_ with .)
                const email = emailKey.replace(/_DOT_/g, '.').toLowerCase();
                const newName = nameMap.get(email);
                
                if (newName && voteData.displayName !== newName) {
                  updatedVotes[emailKey] = { ...voteData, displayName: newName };
                  modified = true;
                  pollVotesUpdated++;
                }
              });
              
              if (modified) {
                blocksModified = true;
                return {
                  ...block,
                  data: { ...block.data, votes: updatedVotes }
                };
              }
            }
            
            return block;
          });
          
          if (blocksModified) {
            updates.blocks = updatedBlocks;
            needsUpdate = true;
          }
        }
        
        // Save if anything changed
        if (needsUpdate) {
          await updateDoc(doc(db, 'objects', obj.id), updates);
          objectsUpdated++;
        }
      }
      
      const messages = [];
      if (sharesUpdated > 0) messages.push(`${sharesUpdated} delningar`);
      if (participantsUpdated > 0) messages.push(`${participantsUpdated} deltagare`);
      if (pollVotesUpdated > 0) messages.push(`${pollVotesUpdated} röster`);
      
      if (messages.length > 0) {
        setSyncNamesResult({ 
          success: true, 
          message: `Klart! Uppdaterade ${messages.join(', ')} i ${objectsUpdated} objekt.` 
        });
      } else {
        setSyncNamesResult({ 
          success: true, 
          message: 'Inga namn behövde uppdateras.' 
        });
      }
    } catch (error) {
      console.error('Sync names error:', error);
      setSyncNamesResult({ success: false, message: `Fel: ${error.message}` });
    } finally {
      setSyncingNames(false);
    }
  };
  
  // Swipe to close
  const swipe = useSwipeToClose(onClose);
  
  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return '-';
    return timestamp.toDate().toLocaleDateString('sv-SE');
  };
  
  const adminCount = users.filter(u => u.isAdmin).length;
  const blockedCount = users.filter(u => u.blocked).length;
  const pendingCount = users.filter(u => !u.blocked && !u.isAdmin && !u.approved).length;
  const activeCount = users.filter(u => !u.blocked && !u.isAdmin && u.approved).length;

  return (
    <div 
      className={`fixed inset-0 flex items-end sm:items-center sm:p-8 ${
        menuOpen
          ? 'z-[2002] bg-black/80 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none justify-center lg:justify-start lg:pl-[25rem]'
          : 'z-[1000] bg-black/80 backdrop-blur-sm justify-center lg:justify-end'
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={swipe.ref}
        className={`bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-2xl border-t sm:border border-white/10 w-full sm:max-w-2xl sm:w-[90%] ${menuOpen ? 'lg:w-[30rem]' : 'lg:w-[35%]'} h-full sm:h-auto sm:max-h-[85vh] lg:h-[calc(100dvh-2rem)] lg:max-h-none overflow-hidden flex flex-col pt-[var(--sat)] sm:pt-0 ${swipe.className}`}
        style={swipe.style}
        {...swipe.handlers}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/10 bg-gray-900/80 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Användare</h2>
              <p className="text-xs text-gray-400">{users.length} användare totalt</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation" aria-label="Stäng">
            <X size={20} />
          </button>
        </div>
        
        {/* Stats bar */}
        <div className="px-4 py-3 border-b border-white/5 flex flex-wrap gap-2 text-xs">
          <button 
            onClick={() => setFilterStatus('all')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${filterStatus === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Users size={14} />
            <span>Alla ({users.length})</span>
          </button>
          <button 
            onClick={() => setFilterStatus('pending')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${filterStatus === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}
          >
            <UserCheck size={14} />
            <span>Väntar ({pendingCount})</span>
          </button>
          <button 
            onClick={() => setFilterStatus('active')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${filterStatus === 'active' ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-green-400'}`}
          >
            <CheckCircle size={14} />
            <span>Godkända ({activeCount})</span>
          </button>
          <button 
            onClick={() => setFilterStatus('admin')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${filterStatus === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-purple-400'}`}
          >
            <Shield size={14} />
            <span>Admin ({adminCount})</span>
          </button>
          <button 
            onClick={() => setFilterStatus('blocked')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${filterStatus === 'blocked' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-red-400'}`}
          >
            <Ban size={14} />
            <span>Blockerade ({blockedCount})</span>
          </button>
          <div className="flex-1" />
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${showSettings ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:text-indigo-400'}`}
          >
            <Settings size={14} />
            <span>Inställningar</span>
          </button>
        </div>
        
        {/* Settings panel */}
        {showSettings && (
          <div className="px-4 py-3 border-b border-white/5 bg-indigo-500/5">
            <div className="flex items-center gap-3 mb-3">
              <Settings size={16} className="text-indigo-400" />
              <span className="text-sm font-medium text-white">Objektgränser</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nya användare (max objekt)</label>
                <input
                  type="number"
                  min="1"
                  value={appSettings.defaultObjectLimit}
                  onChange={(e) => setAppSettings(prev => ({ ...prev, defaultObjectLimit: parseInt(e.target.value) || 5 }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-base focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Godkända användare</label>
                <input
                  type="number"
                  min="1"
                  value={appSettings.approvedObjectLimit}
                  onChange={(e) => setAppSettings(prev => ({ ...prev, approvedObjectLimit: parseInt(e.target.value) || 100 }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-base focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end items-center gap-3 mt-3">
              {settingsSaved && (
                <span className="text-xs text-green-400 flex items-center gap-1"><Check size={14} /> Sparat!</span>
              )}
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 disabled:opacity-50 text-sm"
              >
                <Save size={14} />
                {savingSettings ? 'Sparar...' : 'Spara'}
              </button>
            </div>
          </div>
        )}
        
        {/* Sync display names button */}
        <div className="px-4 py-3 border-b border-white/5">
          <button
            onClick={syncDisplayNames}
            disabled={syncingNames}
            className="w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={`${syncingNames ? 'animate-spin' : ''}`} />
            {syncingNames ? 'Synkar...' : 'Synka visningsnamn'}
          </button>
          <p className="text-xs text-gray-500 mt-1.5 text-center">
            Uppdaterar namn i delningar, leaderboards, polls m.m.
          </p>
          {syncNamesResult && (
            <p className={`text-xs mt-2 text-center ${syncNamesResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {syncNamesResult.message}
            </p>
          )}
        </div>
        
        {/* Search and sort */}
        <div className="px-4 py-3 border-b border-white/5 flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Sök på namn eller email..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-base placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-8 text-white text-base focus:outline-none focus:border-purple-500/50"
            >
              <option value="name">Namn</option>
              <option value="objects">Flest objekt</option>
              <option value="created">Senast skapad</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
        
        {/* User list */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Laddar användare...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Inga användare hittades</div>
          ) : (
            filteredUsers.map(user => (
              <div 
                key={user.id}
                className={`p-4 rounded-xl border transition-all ${
                  user.blocked 
                    ? 'bg-red-500/5 border-red-500/20' 
                    : user.isAdmin 
                      ? 'bg-purple-500/5 border-purple-500/20'
                      : !user.approved
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white truncate">
                        {user.displayName || user.email?.split('@')[0] || 'Okänd'}
                      </span>
                      {user.isAdmin && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400">
                          ADMIN
                        </span>
                      )}
                      {!user.isAdmin && !user.blocked && !user.approved && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400">
                          VÄNTAR
                        </span>
                      )}
                      {!user.isAdmin && !user.blocked && user.approved && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400">
                          GODKÄND
                        </span>
                      )}
                      {user.blocked && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400">
                          BLOCKERAD
                        </span>
                      )}
                      {user.id === currentUserId && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400">
                          DU
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                      <Mail size={12} />
                      <span className="truncate">{user.email || '-'}</span>
                      <span className="text-gray-600 lg:inline hidden">·</span>
                      <span className="lg:flex items-center gap-1 hidden text-gray-500 whitespace-nowrap shrink-0" title={formatDate(user.createdAt)}>
                        <Calendar size={11} />
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package size={12} />
                        {user.objectCount} objekt
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 size={12} />
                        {user.sharedToOthers} delade
                      </span>
                    </div>
                  </div>
                  
                  {user.id !== currentUserId && (
                    <div className="flex gap-2">
                      {/* Approve button - only show for non-admins */}
                      {!user.isAdmin && (
                        <button
                          onClick={() => toggleApproved(user.id, user.approved)}
                          disabled={updating === user.id}
                          className={`p-2 rounded-lg transition-all ${
                            user.approved 
                              ? 'bg-green-500/20 text-green-400 hover:bg-gray-500/20 hover:text-gray-400' 
                              : 'bg-white/5 text-gray-400 hover:bg-green-500/20 hover:text-green-400'
                          } disabled:opacity-50`}
                          title={user.approved ? 'Ta bort godkännande' : 'Godkänn användare'}
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => toggleAdmin(user.id, user.isAdmin)}
                        disabled={updating === user.id}
                        className={`p-2 rounded-lg transition-all ${
                          user.isAdmin 
                            ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' 
                            : 'bg-white/5 text-gray-400 hover:bg-purple-500/20 hover:text-purple-400'
                        } disabled:opacity-50`}
                        title={user.isAdmin ? 'Ta bort admin' : 'Gör till admin'}
                      >
                        {user.isAdmin ? <ShieldOff size={16} /> : <Shield size={16} />}
                      </button>
                      <button
                        onClick={() => toggleBlocked(user.id, user.blocked)}
                        disabled={updating === user.id}
                        className={`p-2 rounded-lg transition-all ${
                          user.blocked 
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                            : 'bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400'
                        } disabled:opacity-50`}
                        title={user.blocked ? 'Avblockera' : 'Blockera'}
                      >
                        {user.blocked ? <CheckCircle size={16} /> : <Ban size={16} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default UsersAdminModal;
