import React from 'react';
import { X, Check, Search, List, Target, Home } from 'lucide-react';
import { getTransformedImageUrl, getFocalPointStyles } from '../utils/imageUtils';
import { getIconComponent, PREDEFINED_ICONS } from '../utils/iconHelpers';

/**
 * Modal for selecting which object Quick Capture GPS positions should be added to.
 */
export default function QuickCaptureObjectPicker({
  objects,
  categories,
  user,
  quickCaptureObjectId,
  quickCaptureSearchQuery,
  onSearchChange,
  onSelect,
  onClose
}) {
  // Filter objects owned by user
  const availableObjects = objects?.filter(obj => obj.ownerId === user?.uid) || [];

  // Apply search filter
  const searchLower = quickCaptureSearchQuery.toLowerCase().trim();
  const filteredObjects = searchLower
    ? availableObjects.filter(obj => {
        const title = obj.blocks?.find(b => b.type === 'title')?.data?.text || '';
        return title.toLowerCase().includes(searchLower);
      })
    : availableObjects;

  // Group by category
  const grouped = {};
  filteredObjects.forEach(obj => {
    const catId = obj.type || 'other';
    if (!grouped[catId]) grouped[catId] = [];
    grouped[catId].push(obj);
  });

  const categoryIds = Object.keys(grouped).sort((a, b) => {
    const catA = categories?.find(c => c.id === a);
    const catB = categories?.find(c => c.id === b);
    return (catA?.label || a).localeCompare(catB?.label || b);
  });

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-white/10 w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-orange-400" />
            <h3 className="font-medium text-white">Välj objekt</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {/* Search field */}
        <div className="px-3 py-2 border-b border-white/5 flex-shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={quickCaptureSearchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Sök objekt..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {/* Option for no object */}
          <button
            onClick={() => onSelect('')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
              !quickCaptureObjectId ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
              <List size={14} className="text-gray-400" />
            </div>
            <span className="flex-1 text-sm">Ingen (spara i lista)</span>
            {!quickCaptureObjectId && <Check size={16} className="text-orange-400" />}
          </button>

          {categoryIds.length === 0 && searchLower ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Inga objekt matchar sökningen
            </div>
          ) : (
            categoryIds.map(catId => {
              const category = categories?.find(c => c.id === catId);
              const CategoryIcon = category ? getIconComponent(category.icon) : (PREDEFINED_ICONS[catId]?.icon || Home);
              const categoryLabel = category?.label || PREDEFINED_ICONS[catId]?.label || catId;
              const objectsInCategory = grouped[catId].sort((a, b) => {
                const titleA = a.blocks?.find(bl => bl.type === 'title')?.data?.text || '';
                const titleB = b.blocks?.find(bl => bl.type === 'title')?.data?.text || '';
                return titleA.localeCompare(titleB);
              });

              return (
                <div key={catId} className="mb-3">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    <CategoryIcon size={12} />
                    {categoryLabel} ({objectsInCategory.length})
                  </div>
                  <div className="space-y-0.5">
                    {objectsInCategory.map(obj => {
                      const objTitle = obj.blocks?.find(b => b.type === 'title')?.data?.text || 'Namnlöst';
                      const objImage = obj.blocks?.find(b => b.type === 'image');
                      const ObjIcon = category ? getIconComponent(category.icon) : (PREDEFINED_ICONS[obj.type]?.icon || Home);
                      const isSelected = quickCaptureObjectId === obj.id;

                      return (
                        <button
                          key={obj.id}
                          onClick={() => onSelect(obj.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                            isSelected ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-white/10 text-gray-300 hover:text-white'
                          }`}
                        >
                          {objImage ? (
                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={getTransformedImageUrl(objImage.data.url, objImage.data.focalPoint ? 'custom' : objImage.data.focalPoint, 64, 64, objImage.data.focalPoint)}
                                alt=""
                                className="w-full h-full object-cover"
                                style={getFocalPointStyles(objImage.data.focalPoint)}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                              <ObjIcon size={14} className="text-gray-400" />
                            </div>
                          )}
                          <span className="flex-1 truncate text-sm">{objTitle}</span>
                          {isSelected && <Check size={16} className="text-orange-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
