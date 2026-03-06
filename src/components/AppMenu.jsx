import React, { useState, useEffect } from 'react';
import {
  X, LogOut, ChevronDown, ChevronRight, Settings, Target, Users, Share2, Check, AlertTriangle, Eye,
  MapPin, Navigation, Trash2, ExternalLink, Wrench, HelpCircle, Pencil, List
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { getDistance, formatDistance } from '../utils/geoUtils';
import { useConfirm } from '../utils/useConfirm';

/**
 * Slide-out sidebar menu with user identity, contacts, tools, settings, help, and admin sections.
 */
export default function AppMenu({
  onClose,
  user,
  isAdmin,
  // Settings
  displayName,
  setDisplayName,
  keepScreenOn,
  setKeepScreenOn,
  preciseGPS,
  setPreciseGPS,
  showDemoObjects,
  setShowDemoObjects,
  setShowOnlyOwned,
  setShowFavoritesOnly,
  // Quick capture
  showQuickCapture,
  setShowQuickCapture,
  quickCaptureObjectId,
  objects,
  categories,
  captures,
  onOpenQuickCapturePicker,
  onShowCaptures,
  // Admin
  onShowCategoryAdmin,
  onShowObjectsAdmin,
  onShowUsersAdmin,
  onCloseMenuOnly,
  showCategoryAdmin,
  showObjectsAdmin,
  showUsersAdmin,
  // Contacts
  onShowContacts,
  // Section expansion states
  menuAdminExpanded,
  setMenuAdminExpanded,
  menuSettingsExpanded,
  setMenuSettingsExpanded,
  menuQuickCaptureExpanded,
  setMenuQuickCaptureExpanded,
  menuToolsExpanded,
  setMenuToolsExpanded,
  menuHelpExpanded,
  setMenuHelpExpanded,
  // Auth
  handleSwitchAccount,
  handleLogout,
  // Location
  userLocation
}) {
  // Editing display name state
  const [editingName, setEditingName] = useState(false);

  // Mark my spot state
  const confirm = useConfirm();
  const [markedSpot, setMarkedSpot] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.MARKED_SPOT)); } catch { return null; }
  });
  const [spotNote, setSpotNote] = useState('');
  const [spotSaving, setSpotSaving] = useState(false);
  const [spotEditingNote, setSpotEditingNote] = useState(false);

  const saveSpot = () => {
    setSpotSaving(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const spot = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          note: '',
          timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEYS.MARKED_SPOT, JSON.stringify(spot));
        setMarkedSpot(spot);
        setSpotSaving(false);
        setSpotEditingNote(true);
      },
      () => setSpotSaving(false),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleToggleSpot = async () => {
    if (markedSpot) {
      // Toggle off — confirm and clear
      if (await confirm({ title: 'Rensa markering?', message: 'Platsen tas bort.', confirmText: 'Rensa', variant: 'danger' })) {
        localStorage.removeItem(STORAGE_KEYS.MARKED_SPOT);
        setMarkedSpot(null);
        setSpotEditingNote(false);
      }
    } else {
      // Toggle on — capture GPS
      saveSpot();
    }
  };

  const navigateToSpot = () => {
    if (!markedSpot) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${markedSpot.lat},${markedSpot.lng}&travelmode=walking`;
    window.open(url, '_blank');
  };

  const spotDistance = markedSpot && userLocation
    ? getDistance(userLocation.lat, userLocation.lng, markedSpot.lat, markedSpot.lng)
    : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000]" onClick={onClose} />
      <div className="fixed top-0 left-0 h-full w-80 lg:w-96 bg-gray-950/98 backdrop-blur-xl border-r border-white/10 z-[2005] shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col pt-[var(--sat)]">
        {/* Sticky header with user identity */}
        <div className="flex-shrink-0 p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{displayName || user?.email?.split('@')[0] || 'Meny'}</h2>
              {user?.email && (
                <div className="text-xs text-gray-500 truncate mt-0.5">{user.email}</div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation flex-shrink-0 ml-3"
              aria-label="Stäng"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* === VERKTYG === */}
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setMenuToolsExpanded(v => !v)}
              className="w-full flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronDown size={16} className={`text-gray-500 transition-transform ${menuToolsExpanded ? '' : '-rotate-90'}`} />
              <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Verktyg</span>
            </button>
            {menuToolsExpanded && (
              <div className="p-2 space-y-1">
                {/* Contacts & Sharing — simple row */}
                {user && (
                  <button
                    onClick={() => { onShowContacts(); onClose(); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
                  >
                    <Users size={16} className="text-gray-400" />
                    <span className="text-sm">Kontakter & delningar</span>
                  </button>
                )}

                {/* Mark my spot — toggle activates + expands */}
                <div className="rounded-lg bg-white/5 overflow-hidden">
                  <div className="flex items-center justify-between p-2.5">
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-300">{spotSaving ? 'Hämtar GPS...' : 'Markera min plats'}</span>
                    </div>
                    <button
                      onClick={handleToggleSpot}
                      disabled={spotSaving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                        markedSpot ? 'bg-blue-500' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          markedSpot ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {markedSpot && (
                    <div className="px-2.5 pb-2.5 space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                        <div className="flex-1 min-w-0">
                          {spotEditingNote ? (
                            <input
                              type="text"
                              autoFocus
                              value={spotNote}
                              onChange={(e) => setSpotNote(e.target.value)}
                              onBlur={() => {
                                const updated = { ...markedSpot, note: spotNote.trim() };
                                localStorage.setItem(STORAGE_KEYS.MARKED_SPOT, JSON.stringify(updated));
                                setMarkedSpot(updated);
                                setSpotEditingNote(false);
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                              placeholder="Lägg till notering..."
                              className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => { setSpotNote(markedSpot.note || ''); setSpotEditingNote(true); }}
                              className="w-full text-left"
                            >
                              <div className="text-sm text-white truncate">
                                {markedSpot.note || 'Lägg till notering...'}
                              </div>
                            </button>
                          )}
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(markedSpot.timestamp).toLocaleString('sv-SE', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                            {spotDistance != null && ` · ${formatDistance(spotDistance)}`}
                            {markedSpot.accuracy > 0 && ` · ±${markedSpot.accuracy}m`}
                          </div>
                        </div>
                      </div>
                      <button onClick={navigateToSpot} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors">
                        <Navigation size={12} />
                        Navigera hit
                      </button>
                    </div>
                  )}
                </div>

                {/* Snabbpinningar — toggle activates + expands */}
                <div className="rounded-lg bg-white/5 overflow-hidden">
                  <div className="flex items-center justify-between p-2.5">
                    <div className="flex items-center gap-3">
                      <Target size={16} className="text-orange-400" />
                      <span className="text-sm text-gray-300">Snabbpinningar</span>
                      {captures.length > 0 && (
                        <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {captures.length}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowQuickCapture(!showQuickCapture)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showQuickCapture ? 'bg-orange-500' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showQuickCapture ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {showQuickCapture && (
                    <div className="px-2.5 pb-2.5 space-y-2">
                      <div className="p-2.5 rounded-lg bg-white/5">
                        <div className="text-xs text-gray-400 mb-1.5">Går till objekt</div>
                        <button
                          onClick={onOpenQuickCapturePicker}
                          className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm hover:border-orange-500/50 transition-colors"
                        >
                          {quickCaptureObjectId ? (
                            <span className="text-white truncate">
                              {objects?.find(o => o.id === quickCaptureObjectId)?.blocks?.find(b => b.type === 'title')?.data?.text || 'Namnlöst objekt'}
                            </span>
                          ) : (
                            <span className="text-gray-500">Ingen (spara i lista)</span>
                          )}
                          <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                        </button>
                      </div>
                      <button
                        onClick={() => { onClose(); onShowCaptures(); }}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
                      >
                        <span className="text-sm">Visa pinningar</span>
                        {captures.length > 0 && (
                          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {captures.length}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* === INSTÄLLNINGAR === */}
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setMenuSettingsExpanded(v => !v)}
              className="w-full flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronDown size={16} className={`text-gray-500 transition-transform ${menuSettingsExpanded ? '' : '-rotate-90'}`} />
              <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Inställningar</span>
            </button>
            {menuSettingsExpanded && (
              <div className="p-2 space-y-2">
                {/* Profile / Nickname */}
                <div className="p-2.5 rounded-lg bg-white/5">
                  {editingName ? (
                    <>
                      <div className="text-xs text-gray-400 mb-1.5">Visningsnamn</div>
                      <input
                        type="text"
                        autoFocus
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onBlur={async () => {
                          if (user) {
                            try {
                              await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
                            } catch (err) {
                              console.error('Error saving displayName:', err);
                            }
                          }
                          setEditingName(false);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        placeholder={user?.email?.split('@')[0] || 'Ditt namn'}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingName(true)}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="text-left">
                        <div className="text-xs text-gray-400">Visningsnamn</div>
                        <div className="text-sm text-white mt-0.5">{displayName || user?.email?.split('@')[0] || 'Ej angivet'}</div>
                      </div>
                      <Pencil size={14} className="text-gray-500" />
                    </button>
                  )}
                </div>

                <ToggleSetting
                  label="Håll skärmen påslagen"
                  value={keepScreenOn}
                  onChange={() => setKeepScreenOn(!keepScreenOn)}
                  color="blue"
                  warning={!('wakeLock' in navigator) ? 'Stöds ej i din webbläsare' : null}
                />

                <ToggleSetting
                  label="Precis GPS"
                  description="±10m noggrannhet, max 15 sek"
                  value={preciseGPS}
                  onChange={() => setPreciseGPS(!preciseGPS)}
                  color="blue"
                />
              </div>
            )}
          </div>

          {/* === HJÄLP === */}
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setMenuHelpExpanded(v => !v)}
              className="w-full flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronDown size={16} className={`text-gray-500 transition-transform ${menuHelpExpanded ? '' : '-rotate-90'}`} />
              <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Hjälp</span>
            </button>
            {menuHelpExpanded && (
              <div className="p-2 space-y-2">
                <ToggleSetting
                  label="Visa demoexempel"
                  value={showDemoObjects}
                  onChange={() => {
                    const newValue = !showDemoObjects;
                    setShowDemoObjects(newValue);
                    if (newValue) {
                      setShowOnlyOwned(false);
                      setShowFavoritesOnly(false);
                    }
                  }}
                  color="blue"
                  activeNote={showDemoObjects ? 'Skrivskyddat läge' : null}
                />
              </div>
            )}
          </div>

          {/* === ADMIN === */}
          {isAdmin && (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setMenuAdminExpanded(v => !v)}
                className="w-full flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ChevronDown size={16} className={`text-gray-500 transition-transform ${menuAdminExpanded ? '' : '-rotate-90'}`} />
                <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Admin</span>
              </button>
              {menuAdminExpanded && (
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => { onShowCategoryAdmin(); if (!window.matchMedia('(min-width: 1024px)').matches) { if (onCloseMenuOnly) onCloseMenuOnly(); else onClose(); } }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                      showCategoryAdmin
                        ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
                    }`}
                  >
                    <Settings size={16} className={showCategoryAdmin ? 'text-blue-400' : 'text-gray-400'} />
                    <span className="text-sm">Hantera kategorier</span>
                    {showCategoryAdmin && <ChevronRight size={14} className="ml-auto text-blue-400/60" />}
                  </button>
                  <button
                    onClick={() => { onShowObjectsAdmin(); if (!window.matchMedia('(min-width: 1024px)').matches) { if (onCloseMenuOnly) onCloseMenuOnly(); else onClose(); } }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                      showObjectsAdmin
                        ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
                    }`}
                  >
                    <List size={16} className={showObjectsAdmin ? 'text-blue-400' : 'text-gray-400'} />
                    <span className="text-sm">Alla objekt</span>
                    {showObjectsAdmin && <ChevronRight size={14} className="ml-auto text-blue-400/60" />}
                  </button>
                  <button
                    onClick={() => { onShowUsersAdmin(); if (!window.matchMedia('(min-width: 1024px)').matches) { if (onCloseMenuOnly) onCloseMenuOnly(); else onClose(); } }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                      showUsersAdmin
                        ? 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
                    }`}
                  >
                    <Users size={16} className={showUsersAdmin ? 'text-purple-400' : 'text-gray-400'} />
                    <span className="text-sm">Användare</span>
                    {showUsersAdmin && <ChevronRight size={14} className="ml-auto text-purple-400/60" />}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with logout + version */}
        {user && (
          <div className="flex-shrink-0 p-4 border-t border-white/10">
            <div className="flex gap-2">
              <button
                onClick={() => { onClose(); handleSwitchAccount(); }}
                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-all"
              >
                <Users size={18} />
                <span className="text-sm font-medium">Byt konto</span>
              </button>
              <button
                onClick={() => { onClose(); handleLogout(); }}
                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">Logga ut</span>
              </button>
            </div>
            <div className="text-center mt-2 text-[10px] text-gray-600">OurSpots v2.9.36as</div>
          </div>
        )}
      </div>
    </>
  );
}

/** Reusable toggle setting row used inside the settings section. */
function ToggleSetting({ label, description, value, onChange, color = 'blue', warning, activeNote }) {
  const colorMap = {
    blue: { bg: 'bg-blue-500', text: 'text-blue-400' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-400' }
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="p-2.5 rounded-lg bg-white/5">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="text-xs text-gray-400 mt-0.5">{description}</div>
        </div>
        <button
          onClick={onChange}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            value ? c.bg : 'bg-white/20'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              value ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {warning && (
        <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
          <AlertTriangle size={12} className="flex-shrink-0" /> {warning}
        </div>
      )}
      {activeNote && (
        <div className={`mt-2 text-xs ${c.text} flex items-center gap-1`}>
          <Check size={12} className="flex-shrink-0" /> {activeNote}
        </div>
      )}
    </div>
  );
}
