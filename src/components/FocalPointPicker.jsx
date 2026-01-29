import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

function FocalPointPicker({ imageUrl, currentFocalPoint, onSelect, onClose }) {
  const [focalPoint, setFocalPoint] = useState(currentFocalPoint || { x: 50, y: 50, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  
  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    updateFocalPoint(e);
  };
  
  const handlePointerMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    updateFocalPoint(e);
  };
  
  const handlePointerUp = () => {
    setIsDragging(false);
  };
  
  const updateFocalPoint = (e) => {
    if (!containerRef.current || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setFocalPoint(prev => ({ ...prev, x, y }));
  };
  
  const handleZoomChange = (newZoom) => {
    setFocalPoint(prev => ({ ...prev, zoom: newZoom }));
  };
  
  // Get original image URL without transformations for the picker
  const originalImageUrl = imageUrl.includes('/upload/') 
    ? imageUrl.replace(/\/upload\/[^/]+\//, '/upload/q_auto,w_1200/') 
    : imageUrl;
  
  return (
    <div className="fixed inset-0 bg-black/95 z-[2000] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gray-900/80">
        <div>
          <h3 className="text-lg font-bold text-white">Justera bilden</h3>
          <p className="text-xs text-gray-400">Tryck på bilden för att välja fokuspunkt, använd reglaget för zoom</p>
        </div>
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Image picker area */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden p-4 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="relative">
          <img 
            ref={imageRef}
            src={originalImageUrl} 
            alt="Välj fokuspunkt" 
            className="max-w-full max-h-[50vh] rounded-xl shadow-2xl pointer-events-none select-none"
            draggable={false}
          />
          {/* Dimmed overlay except around focal point */}
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            {/* Full dim overlay */}
            <div className="absolute inset-0 bg-black/50"></div>
            {/* Clear circle around focal point */}
            <div 
              className="absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ 
                left: `${focalPoint.x}%`, 
                top: `${focalPoint.y}%`,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                background: 'transparent'
              }}
            ></div>
          </div>
          {/* Focal point crosshair */}
          <div 
            className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
            style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
          >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-white shadow-[0_0_20px_rgba(0,0,0,0.5)]"></div>
            {/* Inner dot */}
            <div className="absolute inset-[26px] rounded-full bg-white shadow-lg"></div>
            {/* Crosshair lines extending outside circle */}
            <div className="absolute left-1/2 -top-4 h-4 w-0.5 bg-white/70 -translate-x-1/2"></div>
            <div className="absolute left-1/2 -bottom-4 h-4 w-0.5 bg-white/70 -translate-x-1/2"></div>
            <div className="absolute top-1/2 -left-4 w-4 h-0.5 bg-white/70 -translate-y-1/2"></div>
            <div className="absolute top-1/2 -right-4 w-4 h-0.5 bg-white/70 -translate-y-1/2"></div>
          </div>
        </div>
      </div>
      
      {/* Bottom controls */}
      <div className="p-4 border-t border-white/10 bg-gray-900/90 space-y-4">
        {/* Zoom slider */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <span className="text-xs w-8">Ut</span>
          </div>
          <input
            type="range"
            min="1"
            max="2"
            step="0.05"
            value={focalPoint.zoom || 1}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-xs w-8 text-right">In</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </div>
        </div>
        
        {/* Preview and actions */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <p className="text-xs text-gray-500 mb-1.5">Resultat</p>
            <div className="w-28 h-20 rounded-lg overflow-hidden border border-white/20 bg-gray-800">
              <img 
                src={originalImageUrl} 
                alt="Preview" 
                className="w-full h-full object-cover"
                style={{ 
                  objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                  transform: `scale(${focalPoint.zoom || 1})`
                }}
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <button
              onClick={() => onSelect(focalPoint)}
              className="w-full px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Använd
            </button>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-sm"
            >
              Avbryt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FocalPointPicker;
