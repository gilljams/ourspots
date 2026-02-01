import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Settings, ChevronDown, 
  Share2, Users, UserMinus, Home, Link2, Table2, List, LayoutGrid, FileText, Copy, BarChart3
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getIconComponent, PREDEFINED_ICONS, emailToKey } from '../utils/iconHelpers';
import { getTransformedImageUrl, getFocalPointStyles } from '../utils/imageUtils';
import { blockComponents } from './blocks';
import DeleteConfirmModal from './DeleteConfirmModal';

// Folder icon - we'll define it locally since it's only used here
const Folder = ({ size = 24, ...props }) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

function ObjectDetail({ object, onClose, onEdit, onDelete, onDuplicate, onBlockUpdate, currentUser, userDisplayName, allObjects, onNavigate, categories, isAdmin, onShowOnMap, onShare, onLeaveShare }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState(() => {
    // Initialize expanded blocks based on defaultCollapsed setting
    // We need to use the FILTERED index (excluding title) since that's what rendering uses
    const blocks = object?.blocks || [];
    const filteredBlocks = blocks.filter(b => b.type !== 'title');
    const collapsibleTypes = ['text', 'poll'];
    const expandedSet = new Set();
    
    filteredBlocks.forEach((block, filteredIndex) => {
      // For collapsible blocks, check defaultCollapsed
      if (collapsibleTypes.includes(block.type)) {
        if (!block.data?.defaultCollapsed) {
          expandedSet.add(filteredIndex);
        }
      } else if (block.type === 'links' && (block.data?.items?.length || 0) > 1) {
        // Links are collapsible only if they have more than 1 link
        if (!block.data?.defaultCollapsed) {
          expandedSet.add(filteredIndex);
        }
      }
    });
    
    return expandedSet;
  });
  const [showManageSection, setShowManageSection] = useState(false);
  const [childViewMode, setChildViewMode] = useState(() => {
    return localStorage.getItem('ourspots-child-view-mode') || 'grid';
  });
  
  const toggleChildViewMode = () => {
    const newMode = childViewMode === 'grid' ? 'list' : 'grid';
    setChildViewMode(newMode);
    localStorage.setItem('ourspots-child-view-mode', newMode);
  };
  
  // Swipe to close state
  const [touchStart, setTouchStart] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const modalRef = useRef(null);
  const manageSectionRef = useRef(null);
  
  // Scroll manage section into view when opened
  useEffect(() => {
    if (showManageSection && manageSectionRef.current) {
      setTimeout(() => {
        manageSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 50); // Small delay to let the animation start
    }
  }, [showManageSection]);
  
  const SWIPE_THRESHOLD = 30;
  const CLOSE_THRESHOLD = 150;
  const RESISTANCE = 0.5;
  
  const handleTouchStart = (e) => {
    // Don't capture swipe if touching interactive elements
    const target = e.target;
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('[role="button"]')) {
      return;
    }
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
  
  // Find category to get icon
  const category = categories.find(c => c.id === object.type);
  const IconComponent = category ? getIconComponent(category.icon) : (PREDEFINED_ICONS[object.type]?.icon || Home);
  const categoryColor = category?.color || '#3B82F6';
  const isOwner = currentUser && object.ownerId === currentUser.uid;
  const isSharedWithMe = object.isSharedWithMe;
  const userEmailKey = currentUser?.email ? emailToKey(currentUser.email.toLowerCase()) : null;
  const myShareRole = isSharedWithMe && userEmailKey ? object.shares?.[userEmailKey]?.role : null;
  const canEdit = isOwner || isAdmin || myShareRole === 'editor';
  const canManage = isOwner || isAdmin;
  // For UI purposes: show "Delning" only for viewers (readers), editors see "Hantera objekt"
  const showAsSharedView = !isOwner && !isAdmin && isSharedWithMe && myShareRole !== 'editor';
  
  const childObjects = allObjects.filter(o => o.parentId === object.id);
  const parentObject = object.parentId ? allObjects.find(o => o.id === object.parentId) : null;
  
  // Find all descendants (children, grandchildren, etc.) for cascade delete warning
  const allDescendants = allObjects.filter(o => o.ancestorIds?.includes(object.id));
  
  // Inherit location from parent if child doesn't have one
  const hasOwnLocation = object.blocks.some(b => b.type === 'location');
  const parentLocation = parentObject?.blocks?.find(b => b.type === 'location');
  
  // Track original index in object.blocks for each block
  const rawBlocks = object.blocks.map((block, idx) => ({ ...block, objectBlockIndex: idx }));
  
  // Add inherited location if needed (with no objectBlockIndex since it's not in object.blocks)
  if (!hasOwnLocation && parentLocation) {
    rawBlocks.push({ type: 'location', data: parentLocation.data, inherited: true, objectBlockIndex: -1 });
  }
  
  const blocksToRender = rawBlocks.sort((a, b) => {
    // Explicit order for certain block types, others keep their original position
    const order = { 'title': 0, 'image': 1, 'location': 2, 'contact': 2.5 };
    const aOrder = order[a.type];
    const bOrder = order[b.type];
    
    // If both have explicit order, sort by that
    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder;
    }
    // If only one has explicit order, it comes first
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    // If neither has explicit order, maintain original array order
    return a.objectBlockIndex - b.objectBlockIndex;
  });

  // Get first audio block URL (for location block play button)
  const audioBlock = object.blocks.find(b => b.type === 'audio');
  const audioUrl = audioBlock?.data?.url || null;
  
  const handleDelete = async () => {
    await onDelete(object.id);
    onClose();
  };
  
  // Get title for header
  const titleBlock = object.blocks.find(b => b.type === 'title');
  const objectTitle = titleBlock?.data?.text || 'Objekt';
  
  return (
    <>
      <div 
        className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[1000] flex items-end sm:items-center justify-center sm:p-8"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div 
          ref={modalRef}
          className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-lg sm:w-[90%] h-full sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col transition-transform duration-200 ease-out relative sm:shadow-2xl sm:shadow-black/50"
          style={{ transform: `translateX(${touchDelta}px)`, opacity: touchDelta > 0 ? 1 - (touchDelta / 300) : 1, touchAction: 'pan-y' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle decorative gradient using category color */}
          <div 
            className="absolute top-0 left-0 right-0 h-72 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, ${categoryColor}12, ${categoryColor}05 50%, transparent)` }}
          />
          
          {/* Fixed header */}
          <div className="sticky top-0 z-10 px-4 py-4 sm:p-5 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${categoryColor}20` }}
              >
                <IconComponent size={20} style={{ color: categoryColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{objectTitle}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{category?.label || 'Objekt'}</span>
                  {isSharedWithMe && (
                    <span className="text-xs text-purple-400 flex items-center gap-1">
                      <Users size={10} />
                      {myShareRole === 'editor' ? 'Redigerare' : 'Läsare'}
                    </span>
                  )}
                  {isAdmin && !isOwner && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <button 
                  onClick={() => onShare && onShare(object)} 
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation flex-shrink-0"
                  aria-label="Dela"
                  title="Dela"
                >
                  <Share2 size={20} />
                </button>
              )}
              <button 
                onClick={onClose} 
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation flex-shrink-0"
                aria-label="Stäng"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Parent navigation */}
          {parentObject && (
            <div className="px-4 py-2 border-b border-white/5">
              <button
                onClick={() => onNavigate(parentObject)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                <span>Tillbaka till {parentObject.blocks.find(b => b.type === 'title')?.data?.text || 'överordnat objekt'}</span>
              </button>
            </div>
          )}
          
          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 p-4 sm:p-5 pb-8 sm:pb-10">
            <div className="space-y-5">
              {(() => {
                const sorted = blocksToRender
                  .filter(block => blockComponents[block.type] && block.type !== 'title');
                return sorted.map((block, index) => {
                // Use the original index in object.blocks (tracked as objectBlockIndex)
                const actualBlockIndex = block.objectBlockIndex;
                const BlockComponent = blockComponents[block.type];
                const isExpanded = expandedBlocks.has(index);
                const toggleExpanded = () => {
                  const newSet = new Set(expandedBlocks);
                  if (newSet.has(index)) {
                    newSet.delete(index);
                  } else {
                    newSet.add(index);
                  }
                  setExpandedBlocks(newSet);
                };
                
                // Count blocks of same type for labeling
                const sameTypeBlocks = blocksToRender.filter(b => b.type === block.type);
                const blockNumber = sameTypeBlocks.indexOf(block) + 1;
                const showBlockLabel = sameTypeBlocks.length > 1;
                const customTitle = block.data?.title;
                const shouldShowLabel = customTitle || showBlockLabel;
                // Links are collapsible only if they have more than 1 link
                const linksItemCount = block.type === 'links' ? (block.data?.items?.length || 0) : 0;
                // Tables with useCollapse handle their own collapse (all modern table types)
                const tableRowCount = block.type === 'table' ? (block.data?.rows?.length || 0) : 0;
                const tableTemplate = block.type === 'table' ? (block.data?.template || 'tasks') : null;
                // All table templates now use collapse internally
                const tableHandlesOwnCollapse = block.type === 'table';
                // Polls show option count
                const pollOptionCount = block.type === 'poll' ? (block.data?.options?.length || 0) : 0;
                const isCollapsible = ['text', 'poll'].includes(block.type) || (block.type === 'links' && linksItemCount > 1);
                
                // For location blocks, show delete if there are multiple AND user can edit
                const locationBlocks = blocksToRender.filter(b => b.type === 'location' && !b.inherited);
                const canDeleteLocation = canEdit && block.type === 'location' && locationBlocks.length > 1 && !block.inherited;
                const locationIndex = block.type === 'location' && !block.inherited ? locationBlocks.indexOf(block) + 1 : null;
                
                const handleDeleteBlock = async () => {
                  if (!window.confirm('Ta bort denna position?')) return;
                  try {
                    const updatedBlocks = object.blocks.filter((_, i) => i !== actualBlockIndex);
                    await updateDoc(doc(db, 'objects', object.id), {
                      blocks: updatedBlocks
                    });
                  } catch (err) {
                    console.error('Error deleting block:', err);
                    alert('Kunde inte ta bort position');
                  }
                };
                
                return BlockComponent ? (
                  <div key={actualBlockIndex} className="space-y-2">
                    {isCollapsible && (
                      <button
                        onClick={toggleExpanded}
                        className="w-full flex items-center gap-2.5 py-2 group touch-manipulation"
                      >
                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <ChevronDown 
                            size={14} 
                            className={`text-gray-400 group-hover:text-white transition-all ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          {block.type === 'text' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                          )}
                          {block.type === 'links' && (
                            <Link2 size={14} className="text-purple-400" />
                          )}
                          {block.type === 'table' && (
                            <Table2 size={14} className="text-amber-400" />
                          )}
                          {block.type === 'poll' && (
                            <BarChart3 size={14} className="text-indigo-400" />
                          )}
                          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                            {customTitle ? customTitle : (
                              <>
                                {block.type === 'text' && (showBlockLabel ? `Anteckning ${blockNumber}` : 'Anteckning')}
                                {block.type === 'links' && (showBlockLabel ? `Länkar ${blockNumber}` : `Länkar (${linksItemCount})`)}
                                {block.type === 'table' && (showBlockLabel ? `Tabell ${blockNumber}` : `Tabell (${tableRowCount})`)}
                                {block.type === 'poll' && (showBlockLabel ? `Omröstning ${blockNumber}` : `Omröstning (${pollOptionCount})`)}
                              </>
                            )}
                          </span>
                        </div>
                      </button>
                    )}
                    {(!isCollapsible || isExpanded) && (
                      <div>
                        <BlockComponent 
                          key={actualBlockIndex} 
                          data={block.data} 
                          objectId={object.id} 
                          blockIndex={actualBlockIndex} 
                          onUpdate={onBlockUpdate} 
                          inherited={block.inherited}
                          isExpanded={isExpanded}
                          onToggle={toggleExpanded}
                          canDelete={canDeleteLocation}
                          onDelete={handleDeleteBlock}
                          positionNumber={locationBlocks.length > 1 ? locationIndex : null}
                          onShowOnMap={onShowOnMap}
                          audioUrl={block.type === 'location' && !block.inherited ? audioUrl : undefined}
                          // Poll-specific props
                          currentUser={currentUser}
                          userDisplayName={userDisplayName}
                          shares={object.shares || {}}
                          canEdit={canEdit}
                          onVote={block.type === 'poll' ? async (newVotes) => {
                            try {
                              const updatedBlocks = [...object.blocks];
                              updatedBlocks[actualBlockIndex] = {
                                ...updatedBlocks[actualBlockIndex],
                                data: { ...updatedBlocks[actualBlockIndex].data, votes: newVotes }
                              };
                              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
                            } catch (err) {
                              console.error('Error saving vote:', err);
                            }
                          } : undefined}
                          onClosePoll={block.type === 'poll' && canEdit ? async () => {
                            try {
                              const updatedBlocks = [...object.blocks];
                              updatedBlocks[actualBlockIndex] = {
                                ...updatedBlocks[actualBlockIndex],
                                data: { ...updatedBlocks[actualBlockIndex].data, closed: true }
                              };
                              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
                            } catch (err) {
                              console.error('Error closing poll:', err);
                            }
                          } : undefined}
                        />
                      </div>
                    )}
                  </div>
                ) : null;
              });
              })()}
            </div>
            {childObjects.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Folder size={16} className="text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-400">{childObjects.length} objekt</h3>
                  </div>
                  {childObjects.length > 2 && (
                    <button
                      onClick={toggleChildViewMode}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title={childViewMode === 'grid' ? 'Visa som lista' : 'Visa som kort'}
                    >
                      {childViewMode === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
                    </button>
                  )}
                </div>
                {childViewMode === 'list' ? (
                  <div className="space-y-1">
                    {[...childObjects]
                      .sort((a, b) => {
                        const titleA = a.blocks.find(bl => bl.type === 'title')?.data?.text || '';
                        const titleB = b.blocks.find(bl => bl.type === 'title')?.data?.text || '';
                        return titleA.localeCompare(titleB, 'sv');
                      })
                      .map(child => {
                        const childTitle = child.blocks.find(bl => bl.type === 'title');
                        return (
                          <button
                            key={child.id}
                            onClick={() => onNavigate(child)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-400/30 transition-all text-left"
                          >
                            <FileText size={14} className="text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-white truncate">{childTitle?.data?.text || 'Namnlöst'}</span>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 items-end">
                    {childObjects.map(child => {
                      const childTitle = child.blocks.find(bl => bl.type === 'title');
                      const childImage = child.blocks.find(bl => bl.type === 'image');
                      const childCategory = categories?.find(c => c.id === child.type);
                      const ChildIcon = childCategory ? getIconComponent(childCategory.icon) : (PREDEFINED_ICONS[child.type]?.icon || Home);
                      return (
                        <button
                          key={child.id}
                          onClick={() => onNavigate(child)}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-400/50 transition-all text-left col-span-1"
                        >
                          {childImage ? (
                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                              <img 
                                src={getTransformedImageUrl(childImage.data.url, childImage.data.focalPoint ? 'custom' : childImage.data.focalPoint, 64, 64, childImage.data.focalPoint)} 
                                alt="" 
                                className="w-full h-full object-cover"
                                style={getFocalPointStyles(childImage.data.focalPoint)}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                              <ChildIcon size={14} className="text-blue-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-white truncate">{childTitle?.data?.text || 'Namnlöst'}</div>
                            <div className="text-xs text-gray-400 leading-tight">{PREDEFINED_ICONS[child.type]?.label}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {(canManage || canEdit || isSharedWithMe) && (
              <div ref={manageSectionRef} className="mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={() => setShowManageSection(!showManageSection)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Settings size={18} />
                    <span className="font-medium">{showAsSharedView ? 'Delning' : 'Hantera objekt'}</span>
                  </div>
                  <ChevronDown 
                    size={18} 
                    className={`transition-transform ${showManageSection ? 'rotate-180' : ''}`}
                  />
                </button>
                {showManageSection && (
                  <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {(canManage || onDuplicate) && (
                      <div className="flex gap-2">
                        {canManage && (
                          <button
                            onClick={() => onEdit({ parentId: object.id })}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all"
                          >
                            <Plus size={16} />
                            <span className="text-sm">Lägg till objekt</span>
                          </button>
                        )}
                        {onDuplicate && (
                          <button
                            onClick={() => onDuplicate(object)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all"
                          >
                            <Copy size={16} />
                            <span className="text-sm">Kopiera</span>
                          </button>
                        )}
                      </div>
                    )}
                    {canEdit && (
                      <div className="flex gap-2">
                        <button onClick={() => onEdit(object)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                          <Edit2 size={16} />
                          <span className="text-sm">Redigera</span>
                        </button>
                        {canManage && (
                          <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all">
                            <Trash2 size={16} />
                            <span className="text-sm">Ta bort</span>
                          </button>
                        )}
                      </div>
                    )}
                    {isSharedWithMe && !isOwner && (
                      <button 
                        onClick={() => onLeaveShare(object)} 
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/30 transition-all"
                      >
                        <UserMinus size={16} />
                        <span className="text-sm">Lämna delning</span>
                      </button>
                    )}
                    <div className="text-xs text-gray-600 pt-2 border-t border-white/5">
                      ID: {object.id.slice(0, 8)}...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {showDeleteConfirm && <DeleteConfirmModal object={object} onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />}
    </>
  );
}

export default ObjectDetail;
