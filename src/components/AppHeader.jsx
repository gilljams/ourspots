import React, { useRef, useState } from 'react';
import {
  X, Search, Menu, Mail, LogIn, User, Eye,
  SlidersHorizontal, Star, Navigation,
  Swords,
  LayoutGrid, LayoutList, ArrowUpDown
} from 'lucide-react';
import { getIconComponent } from '../utils/iconHelpers';
import InvitationsDropdown from './InvitationsDropdown';

/**
 * Top-level app chrome: toast, tiebreaker banner, header bar (menu/logo/search/user),
 * invitations dropdown, category pills, and filter panel.
 *
 * Exposes `headerRef` + `headerHeight` via render-prop style: the parent
 * passes `headerRef` / `headerHeight` so the filter bar can stick correctly.
 */
export default function AppHeader({
  // tiebreaker
  pendingTiebreakerChallenges, selectedObject, objects, setSelectedObject,
  // header bar
  headerRef, showDemoObjects, setShowDemoObjects, isAdmin,
  onOpenMenu, pendingInvitations, showInvitations, setShowInvitations,
  // search
  searchQuery, setSearchQuery,
  // user
  user, handleLogin,
  // invitations
  userEmailKey, handleAcceptInvitation, handleRejectInvitation,
  // category bar
  headerHeight, categories, activeCategory, setActiveCategory,
  showFilters, setShowFilters,
  // filters
  showFavoritesOnly, setShowFavoritesOnly,
  showOnlyOwned, setShowOnlyOwned,
  viewFilter, setViewFilter,
  compactCards, setCompactCards,
  userLocation, maxDistanceKm, setMaxDistanceKm,
  sortByDistance, setSortByDistance,
  validFavoritesCount,
}) {
  const searchInputRef = useRef(null);
  const [searchExpanded, setSearchExpanded] = useState(false);

  return (
    <>
      {/* Tiebreaker challenge banner */}
      {pendingTiebreakerChallenges.length > 0 && selectedObject?.id !== pendingTiebreakerChallenges[0].objectId && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] bg-blue-600/95 backdrop-blur-sm border-b border-blue-400/30 cursor-pointer"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
          onClick={() => {
            const challenge = pendingTiebreakerChallenges[0];
            const obj = objects.find(o => o.id === challenge.objectId);
            if (obj) setSelectedObject(obj);
          }}
        >
          <div className="max-w-6xl mx-auto px-3 py-2.5 flex items-center justify-between gap-3" style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}>
            <div className="flex items-center gap-2 text-white text-sm min-w-0">
              <Swords size={18} className="flex-shrink-0 animate-pulse" />
              <span className="truncate">
                <span className="font-semibold">{pendingTiebreakerChallenges[0].fromName}</span> utmanar dig!
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-white/70 text-xs hidden sm:inline truncate max-w-[120px]">
                {pendingTiebreakerChallenges[0].objectName}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs font-medium">
                Gå till match →
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header bar */}
      <header
        ref={headerRef}
        className={`bg-gray-900/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 ${
          pendingTiebreakerChallenges.length > 0 && selectedObject?.id !== pendingTiebreakerChallenges[0].objectId ? 'mt-[52px]' : ''
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Demo mode banner */}
        {showDemoObjects && (
          <div className="bg-purple-600/90 border-b border-purple-400/30">
            <div className="max-w-6xl mx-auto px-3 py-1.5 flex items-center justify-between gap-2" style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}>
              <div className="flex items-center gap-1.5 text-white text-xs">
                <Eye size={14} className="flex-shrink-0" />
                <span><span className="font-medium">Demo</span> {isAdmin ? '(admin-läge)' : '– du deltar som "Anna"'}</span>
              </div>
              <button
                onClick={() => setShowDemoObjects(false)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors flex-shrink-0"
              >
                <X size={12} />
                Avsluta
              </button>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onOpenMenu}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
              title="Meny"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-white">OurSpots</h1>
            {pendingInvitations.length > 0 && (
              <button
                onClick={() => setShowInvitations(!showInvitations)}
                className="relative w-9 h-9 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400 hover:text-blue-300 transition-all"
                title="Inbjudningar"
              >
                <Mail size={18} />
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingInvitations.length}
                </span>
              </button>
            )}
          </div>

          {/* Right side: Search + User */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <div className="relative flex items-center justify-end">
              {/* Expandable search */}
              <div className={`flex items-center transition-all duration-300 ease-out ${
                searchExpanded || searchQuery ? 'w-full max-w-md' : 'w-9'
              }`}>
                {(searchExpanded || searchQuery) ? (
                  <div className="relative w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={() => { if (!searchQuery) setSearchExpanded(false); }}
                      className="w-full h-9 bg-white/10 text-white text-base placeholder:text-gray-500 rounded-full pl-9 pr-8 border border-white/10 focus:border-blue-400 focus:bg-white/15 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Sök..."
                      autoFocus
                    />
                    <button
                      onClick={() => { setSearchQuery(''); setSearchExpanded(false); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-gray-300 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white border border-white/10 transition-all"
                    title="Sök"
                  >
                    <Search size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* User avatar or login */}
            <div className="flex-shrink-0">
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm text-white truncate max-w-[120px]">{user.displayName}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[120px]">{user.email}</div>
                  </div>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-full border border-white/10" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-white/10 flex items-center justify-center">
                      <User size={16} className="text-blue-400" />
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={handleLogin} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm transition-all">
                  <LogIn size={16} />
                  <span className="hidden sm:inline">Logga in</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Invitations dropdown */}
      {showInvitations && pendingInvitations.length > 0 && (
        <InvitationsDropdown
          pendingInvitations={pendingInvitations}
          userEmailKey={userEmailKey}
          onAccept={async (obj) => {
            const success = await handleAcceptInvitation(obj);
            if (success && pendingInvitations.length === 1) setShowInvitations(false);
          }}
          onReject={async (obj) => {
            const success = await handleRejectInvitation(obj);
            if (success && pendingInvitations.length === 1) setShowInvitations(false);
          }}
          onClose={() => setShowInvitations(false)}
        />
      )}

      {/* Category bar + Filter panel */}
      <div className="bg-gray-900/30 backdrop-blur-md border-b border-white/10 sticky z-30" style={{ top: headerHeight }}>
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-center">
            {/* Scrollable categories */}
            <div className="flex gap-2 overflow-x-auto flex-1 min-w-0 pb-1 -mb-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl whitespace-nowrap transition-all flex-shrink-0 ${activeCategory === 'all' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
              >
                <span className="text-sm font-medium">Alla</span>
              </button>

              {categories.map(cat => {
                const IconComponent = getIconComponent(cat.icon);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl whitespace-nowrap transition-all flex-shrink-0 ${activeCategory === cat.id ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                  >
                    <IconComponent size={16} />
                    <span className="text-sm font-medium hidden sm:inline">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${showFilters ? 'bg-amber-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
              title={showFilters ? 'Dölj filter' : 'Visa filter'}
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 p-3 bg-white/5 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-300 ease-out">
              {/* Row 1: Favorites, Mina | View filter pills | Compact toggle */}
              <div className="flex items-center gap-1.5">
                {user && (
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`h-8 flex items-center justify-center gap-1 px-2.5 rounded-lg transition-all text-sm font-medium ${showFavoritesOnly ? 'bg-yellow-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                    title="Favoriter"
                  >
                    <Star size={14} className={showFavoritesOnly ? 'fill-white' : ''} />
                    {validFavoritesCount > 0 && (
                      <span className={`text-xs ${showFavoritesOnly ? '' : 'text-yellow-400'}`}>
                        {validFavoritesCount}
                      </span>
                    )}
                  </button>
                )}
                {user && (
                  <button
                    onClick={() => setShowOnlyOwned(!showOnlyOwned)}
                    className={`h-8 flex items-center justify-center gap-1 px-2.5 rounded-lg transition-all text-sm font-medium ${showOnlyOwned ? 'bg-amber-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                  >
                    <User size={14} />
                    <span className="text-xs">Mina</span>
                  </button>
                )}

                <div className="flex h-8 rounded-lg overflow-hidden border border-white/10">
                  <button
                    onClick={() => setViewFilter('all')}
                    className={`px-2 transition-all text-xs font-medium border-r border-white/10 ${viewFilter === 'all' ? 'bg-amber-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                  >
                    Alla
                  </button>
                  <button
                    onClick={() => setViewFilter('collections')}
                    className={`px-2 transition-all text-xs font-medium border-r border-white/10 ${viewFilter === 'collections' ? 'bg-amber-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                  >
                    Samlingar
                  </button>
                  <button
                    onClick={() => setViewFilter('objects')}
                    className={`px-2 transition-all text-xs font-medium ${viewFilter === 'objects' ? 'bg-amber-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                  >
                    Objekt
                  </button>
                </div>

                <button
                  onClick={() => setCompactCards(v => !v)}
                  className={`ml-auto h-8 w-8 flex items-center justify-center rounded-lg transition-all flex-shrink-0 ${compactCards ? 'bg-amber-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                  title={compactCards ? 'Stora kort' : 'Kompakta kort'}
                >
                  {compactCards ? <LayoutGrid size={14} /> : <LayoutList size={14} />}
                </button>
              </div>

              {/* Distance slider + Närmast */}
              {userLocation && (
                <div className="flex items-center gap-2">
                  <Navigation size={14} className="text-gray-500 flex-shrink-0" />
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={maxDistanceKm ?? 50}
                    onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                    className="flex-1 h-1.5 accent-amber-500"
                  />
                  <span className="text-xs text-gray-300 w-14 text-right tabular-nums">
                    {maxDistanceKm ? `≤${maxDistanceKm} km` : 'Alla'}
                  </span>
                  {maxDistanceKm && (
                    <button
                      onClick={() => setMaxDistanceKm(null)}
                      className="h-6 w-6 flex items-center justify-center rounded-full bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white transition-all"
                      title="Rensa avståndsfilter"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => setSortByDistance(!sortByDistance)}
                    className={`h-8 flex items-center gap-1 px-2.5 rounded-lg transition-all text-xs font-medium ${sortByDistance ? 'bg-amber-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                  >
                    <ArrowUpDown size={12} />
                    <span>Närmast</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
