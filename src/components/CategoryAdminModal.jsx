import React, { useState, useRef } from 'react';
import { Settings, ArrowUp, ArrowDown, Edit2, Trash2, ChevronDown, AlertTriangle } from 'lucide-react';
import { doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AVAILABLE_ICONS, getIconComponent } from '../utils/iconHelpers';

function CategoryAdminModal({ categories, onClose, currentUser, objects }) {
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ label: '', icon: 'Home', color: '#6B7280', hideLocation: false });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(null); // 'new' or 'edit'
  
  // Swipe to close state
  const [touchStart, setTouchStart] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null);
  
  const SWIPE_THRESHOLD = 30; // Minimum px before swipe activates
  const CLOSE_THRESHOLD = 150; // px needed to trigger close
  const RESISTANCE = 0.5; // Friction factor (0.5 = moves half as fast as finger)
  
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
    
    // Check if this is a horizontal swipe (not vertical scrolling)
    if (!isSwipeActive) {
      // Only activate if moved past threshold and clearly more horizontal than vertical
      if (deltaX > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
        setIsSwipeActive(true);
        e.preventDefault(); // Only prevent default once we're sure it's a swipe
      } else if (Math.abs(deltaY) > 10) {
        // User is scrolling vertically, don't activate swipe
        setTouchStart(null);
        return;
      } else {
        return; // Not yet determined, allow normal behavior
      }
    }
    
    // Apply resistance and only allow swiping right
    if (deltaX > SWIPE_THRESHOLD) {
      e.preventDefault();
      const adjustedDelta = (deltaX - SWIPE_THRESHOLD) * RESISTANCE;
      setTouchDelta(adjustedDelta);
    }
  };
  
  const handleTouchEnd = () => {
    // If swiped past close threshold, close the modal
    if (touchDelta > CLOSE_THRESHOLD * RESISTANCE) {
      setIsClosing(true);
      setTouchDelta(200); // Animate out
      setTimeout(onClose, 200);
    } else {
      setTouchDelta(0);
    }
    setTouchStart(null);
    setTouchStartY(null);
    setIsSwipeActive(false);
  };

  const handleSaveCategory = async () => {
    if (!newCategory.label.trim()) return;
    setSaving(true);
    try {
      const categoryId = newCategory.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) : 0;
      await setDoc(doc(db, 'categories', categoryId), {
        label: newCategory.label.trim(),
        icon: newCategory.icon,
        color: newCategory.color,
        hideLocation: newCategory.hideLocation || false,
        order: maxOrder + 1,
        createdAt: Timestamp.now(),
        createdBy: currentUser.uid
      });
      setNewCategory({ label: '', icon: 'Home', color: '#6B7280', hideLocation: false });
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Kunde inte spara kategori');
    }
    setSaving(false);
  };

  const handleUpdateCategory = async (categoryId, updates) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'categories', categoryId), updates);
      setEditingCategory(null);
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Kunde inte uppdatera kategori');
    }
    setSaving(false);
  };

  const handleDeleteCategory = async (categoryId) => {
    // Check if any objects use this category
    const objectsWithCategory = objects.filter(obj => obj.type === categoryId);
    
    if (objectsWithCategory.length > 0) {
      if (!confirm(`${objectsWithCategory.length} objekt använder denna kategori. De kommer att ändras till 'Okategoriserad'. Fortsätt?`)) {
        setShowDeleteConfirm(null);
        return;
      }
      
      // Update all objects to have no category (or a default one)
      try {
        for (const obj of objectsWithCategory) {
          await updateDoc(doc(db, 'objects', obj.id), { type: 'uncategorized' });
        }
      } catch (err) {
        console.error('Error updating objects:', err);
        alert('Kunde inte uppdatera objekt');
        setShowDeleteConfirm(null);
        return;
      }
    }

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Kunde inte radera kategori');
    }
    setSaving(false);
  };

  const handleMoveCategory = async (categoryId, direction) => {
    const currentIndex = categories.findIndex(c => c.id === categoryId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
    const currentCat = sortedCategories[currentIndex];
    const swapCat = sortedCategories[newIndex];

    setSaving(true);
    try {
      await updateDoc(doc(db, 'categories', currentCat.id), { order: swapCat.order });
      await updateDoc(doc(db, 'categories', swapCat.id), { order: currentCat.order });
    } catch (err) {
      console.error('Error moving category:', err);
      alert('Kunde inte flytta kategori');
    }
    setSaving(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[2100] flex items-end sm:items-center justify-center lg:justify-start sm:p-8 lg:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl lg:rounded-2xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-lg lg:max-w-md sm:w-[90%] lg:w-[30%] h-full sm:h-auto sm:max-h-[85vh] lg:h-[calc(100dvh-2rem)] lg:max-h-none overflow-hidden flex flex-col transition-transform duration-200 ease-out relative sm:shadow-2xl sm:shadow-black/50"
        style={{ transform: `translateX(${touchDelta}px)`, opacity: touchDelta > 0 ? 1 - (touchDelta / 300) : 1 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-blue-600/8 via-blue-900/5 to-transparent pointer-events-none" />
        
        {/* Fixed header */}
        <div className="sticky top-0 z-10 px-4 lg:px-5 py-4 lg:py-3 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 lg:gap-2">
            <div className="w-10 h-10 lg:w-8 lg:h-8 rounded-xl lg:rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
              <Settings size={20} className="lg:hidden text-blue-400" />
              <Settings size={16} className="hidden lg:block text-blue-400" />
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-lg font-bold text-white">Kategorier</h2>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 lg:w-8 lg:h-8 flex items-center justify-center rounded-xl lg:rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation"
            aria-label="Stäng"
          >
            <svg className="w-6 h-6 lg:w-5 lg:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:p-4 overflow-y-auto overscroll-contain flex-1">
          {/* Add new category */}
          <div className="mb-6 lg:mb-4 p-4 lg:p-3 rounded-xl lg:rounded-lg bg-white/5 border border-white/10">
            <h3 className="text-lg lg:text-sm font-semibold text-white mb-3 lg:mb-2">Skapa ny kategori</h3>
            <div className="space-y-3 lg:space-y-2">
              <div>
                <label className="block text-sm lg:text-xs text-gray-300 mb-1">Namn</label>
                <input
                  type="text"
                  value={newCategory.label}
                  onChange={(e) => setNewCategory({ ...newCategory, label: e.target.value })}
                  placeholder="T.ex. Restauranger"
                  className="w-full px-3 py-2 lg:py-1.5 text-base lg:text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:gap-2">
                <div className="relative">
                  <label className="block text-sm lg:text-xs text-gray-300 mb-1">Ikon</label>
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(showIconPicker === 'new' ? null : 'new')}
                    className="w-full px-3 py-2 lg:py-1.5 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-between hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {React.createElement(getIconComponent(newCategory.icon), { size: 18, className: 'text-gray-300 lg:w-4 lg:h-4' })}
                      <span className="text-sm lg:text-xs">{AVAILABLE_ICONS.find(i => i.name === newCategory.icon)?.label || 'Välj'}</span>
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform lg:w-3 lg:h-3 ${showIconPicker === 'new' ? 'rotate-180' : ''}`} />
                  </button>
                  {showIconPicker === 'new' && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 p-2 rounded-lg bg-gray-800 border border-white/20 shadow-xl max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-4 gap-1">
                        {AVAILABLE_ICONS.map(icon => {
                          const IconComp = getIconComponent(icon.name);
                          const isSelected = newCategory.icon === icon.name;
                          return (
                            <button
                              key={icon.name}
                              type="button"
                              onClick={() => {
                                setNewCategory({ ...newCategory, icon: icon.name });
                                setShowIconPicker(null);
                              }}
                              className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 ${
                                isSelected
                                  ? 'bg-blue-500/30 border border-blue-500'
                                  : 'hover:bg-white/10'
                              }`}
                            >
                              <IconComp size={20} className={isSelected ? 'text-blue-400' : 'text-gray-300'} />
                              <span className="text-[10px] text-gray-400 truncate w-full text-center">{icon.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Färg</label>
                  <input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="w-full h-[42px] rounded-lg bg-white/5 border border-white/10 cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {React.createElement(getIconComponent(newCategory.icon), { size: 20, style: { color: newCategory.color } })}
                <span className="text-gray-300 text-sm">Förhandsgranskning</span>
              </div>
              <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={newCategory.hideLocation}
                  onChange={(e) => setNewCategory({ ...newCategory, hideLocation: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <span className="text-sm text-gray-200">Platsoberoende (listor)</span>
                  <p className="text-xs text-gray-500">Döljer GPS och kartfunktioner</p>
                </div>
              </label>
              <button
                onClick={handleSaveCategory}
                disabled={!newCategory.label.trim() || saving}
                className="w-full px-4 py-2 lg:py-1.5 lg:text-sm rounded-xl lg:rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Sparar...' : 'Skapa kategori'}
              </button>
            </div>
          </div>

          {/* Existing categories */}
          <div className="space-y-2">
            <h3 className="text-lg lg:text-sm font-semibold text-white mb-3 lg:mb-2">Befintliga kategorier</h3>
            {categories.length === 0 ? (
              <p className="text-gray-400 text-sm lg:text-xs">Inga kategorier än</p>
            ) : (
              categories.map((cat, index) => {
                const IconComp = getIconComponent(cat.icon);
                const objectCount = objects.filter(obj => obj.type === cat.id).length;
                return (
                  <div key={cat.id} className="p-4 lg:p-3 rounded-xl lg:rounded-lg bg-white/5 border border-white/10">
                    {editingCategory?.id === cat.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Namn</label>
                          <input
                            type="text"
                            value={editingCategory.label}
                            onChange={(e) => setEditingCategory({ ...editingCategory, label: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <label className="block text-sm text-gray-300 mb-1">Ikon</label>
                            <button
                              type="button"
                              onClick={() => setShowIconPicker(showIconPicker === 'edit' ? null : 'edit')}
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-between hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {React.createElement(getIconComponent(editingCategory.icon), { size: 18, className: 'text-gray-300' })}
                                <span className="text-sm">{AVAILABLE_ICONS.find(i => i.name === editingCategory.icon)?.label || 'Välj'}</span>
                              </div>
                              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showIconPicker === 'edit' ? 'rotate-180' : ''}`} />
                            </button>
                            {showIconPicker === 'edit' && (
                              <div className="absolute z-50 top-full left-0 right-0 mt-1 p-2 rounded-lg bg-gray-800 border border-white/20 shadow-xl max-h-48 overflow-y-auto">
                                <div className="grid grid-cols-4 gap-1">
                                  {AVAILABLE_ICONS.map(icon => {
                                    const IconComp = getIconComponent(icon.name);
                                    const isSelected = editingCategory.icon === icon.name;
                                    return (
                                      <button
                                        key={icon.name}
                                        type="button"
                                        onClick={() => {
                                          setEditingCategory({ ...editingCategory, icon: icon.name });
                                          setShowIconPicker(null);
                                        }}
                                        className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 ${
                                          isSelected
                                            ? 'bg-blue-500/30 border border-blue-500'
                                            : 'hover:bg-white/10'
                                        }`}
                                      >
                                        <IconComp size={20} className={isSelected ? 'text-blue-400' : 'text-gray-300'} />
                                        <span className="text-[10px] text-gray-400 truncate w-full text-center">{icon.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Färg</label>
                            <input
                              type="color"
                              value={editingCategory.color}
                              onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                              className="w-full h-[42px] rounded-lg bg-white/5 border border-white/10 cursor-pointer"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                          <input
                            type="checkbox"
                            checked={editingCategory.hideLocation || false}
                            onChange={(e) => setEditingCategory({ ...editingCategory, hideLocation: e.target.checked })}
                            className="w-4 h-4 rounded"
                          />
                          <div>
                            <span className="text-sm text-gray-200">Platsoberoende (listor)</span>
                            <p className="text-xs text-gray-500">Döljer GPS och kartfunktioner</p>
                          </div>
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateCategory(cat.id, { label: editingCategory.label, icon: editingCategory.icon, color: editingCategory.color, hideLocation: editingCategory.hideLocation || false })}
                            disabled={saving}
                            className="flex-1 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50"
                          >
                            Spara
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            disabled={saving}
                            className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-all"
                          >
                            Avbryt
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                            <IconComp size={20} style={{ color: cat.color }} />
                          </div>
                          <div>
                            <div className="text-white font-medium">{cat.label}</div>
                            <div className="text-xs text-gray-400">{objectCount} objekt</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveCategory(cat.id, 'up')}
                            disabled={index === 0 || saving}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-30"
                            title="Flytta upp"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            onClick={() => handleMoveCategory(cat.id, 'down')}
                            disabled={index === categories.length - 1 || saving}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-30"
                            title="Flytta ner"
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            onClick={() => setEditingCategory(cat)}
                            disabled={saving}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                            title="Redigera"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(cat)}
                            disabled={saving}
                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                            title="Ta bort"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2200] flex items-center justify-center p-4">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-red-500/30 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Ta bort kategori?</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Är du säker på att du vill ta bort kategorin <span className="font-semibold text-white">"{showDeleteConfirm.label}"</span>?
              {objects.filter(obj => obj.type === showDeleteConfirm.id).length > 0 && (
                <span className="mt-2 text-yellow-400 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>{objects.filter(obj => obj.type === showDeleteConfirm.id).length} objekt använder denna kategori.</span>
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
              >
                Avbryt
              </button>
              <button
                onClick={() => handleDeleteCategory(showDeleteConfirm.id)}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all disabled:opacity-50"
              >
                {saving ? 'Raderar...' : 'Ta bort'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryAdminModal;
