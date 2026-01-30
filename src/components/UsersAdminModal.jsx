import React, { useState, useEffect, useRef } from 'react';
import { Users, Shield, ShieldOff, Ban, CheckCircle, Search, X, ChevronDown, Mail, Package, Share2, Calendar } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

function UsersAdminModal({ objects, currentUserId, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, admin, blocked, active
  const [sortBy, setSortBy] = useState('name'); // name, objects, created
  const [updating, setUpdating] = useState(null);
  
  // Fetch all users
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsub = onSnapshot(usersRef, (snap) => {
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(allUsers);
      setLoading(false);
    }, (error) => {
      console.error('Error loading users:', error);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  
  // Calculate stats for each user
  const usersWithStats = users.map(user => {
    const userObjects = objects.filter(o => o.ownerId === user.id);
    const sharedToOthers = userObjects.filter(o => o.sharedWithEmails?.length > 0).length;
    const sharedWithUser = objects.filter(o => 
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
    filteredUsers = filteredUsers.filter(u => !u.blocked && !u.isAdmin);
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
      alert('Du kan inte ändra din egen admin-status!');
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
      alert('Kunde inte uppdatera admin-status');
    }
    setUpdating(null);
  };
  
  // Toggle blocked status
  const toggleBlocked = async (userId, currentStatus) => {
    if (userId === currentUserId) {
      alert('Du kan inte blockera dig själv!');
      return;
    }
    
    const action = currentStatus ? 'avblockera' : 'blockera';
    if (!confirm(`Är du säker på att du vill ${action} denna användare?`)) {
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
      alert('Kunde inte uppdatera blockerad-status');
    }
    setUpdating(null);
  };
  
  // Swipe to close
  const [touchStart, setTouchStart] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const modalRef = useRef(null);
  
  const SWIPE_THRESHOLD = 30;
  const CLOSE_THRESHOLD = 150;
  const RESISTANCE = 0.5;
  
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
      onClose();
    }
    setTouchStart(null);
    setTouchStartY(null);
    setTouchDelta(0);
    setIsSwipeActive(false);
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return '-';
    return timestamp.toDate().toLocaleDateString('sv-SE');
  };
  
  const adminCount = users.filter(u => u.isAdmin).length;
  const blockedCount = users.filter(u => u.blocked).length;
  const activeCount = users.filter(u => !u.blocked && !u.isAdmin).length;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-end sm:items-center justify-center sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl border-t sm:border border-white/10 w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col"
        style={{ transform: `translateX(${touchDelta}px)`, opacity: touchDelta > 0 ? 1 - (touchDelta / 300) : 1 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        
        {/* Stats bar */}
        <div className="px-4 py-3 border-b border-white/5 flex gap-4 text-xs">
          <button 
            onClick={() => setFilterStatus('all')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${filterStatus === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Users size={14} />
            <span>Alla ({users.length})</span>
          </button>
          <button 
            onClick={() => setFilterStatus('admin')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${filterStatus === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}
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
          <button 
            onClick={() => setFilterStatus('active')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${filterStatus === 'active' ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-green-400'}`}
          >
            <CheckCircle size={14} />
            <span>Aktiva ({activeCount})</span>
          </button>
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
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-8 text-white text-sm focus:outline-none focus:border-purple-500/50"
            >
              <option value="name">Namn</option>
              <option value="objects">Flest objekt</option>
              <option value="created">Senast skapad</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
        
        {/* User list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">
                        {user.displayName || user.email?.split('@')[0] || 'Okänd'}
                      </span>
                      {user.isAdmin && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400">
                          ADMIN
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
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package size={12} />
                        {user.objectCount} objekt
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 size={12} />
                        {user.sharedToOthers} delade
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  {user.id !== currentUserId && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAdmin(user.id, user.isAdmin)}
                        disabled={updating === user.id}
                        className={`p-2 rounded-lg transition-all ${
                          user.isAdmin 
                            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' 
                            : 'bg-white/5 text-gray-400 hover:bg-amber-500/20 hover:text-amber-400'
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
