import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader, X } from 'lucide-react';
import { MapContainer, Marker, useMapEvents } from 'react-leaflet';
import { BaseTileLayer, UserLocationMarker } from './map/SharedMapComponents';

function MapPicker({ onSelect, onClose, initialPosition, userLocation }) {
  const [position, setPosition] = useState(initialPosition || [59.33, 18.06]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const mapRef = useRef(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      // Using Photon API (OpenStreetMap-based, CORS-friendly)
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      // Transform Photon format to our format
      const results = data.features.map(f => ({
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        name: f.properties.name || '',
        city: f.properties.city || f.properties.county || '',
        country: f.properties.country || '',
        display_name: [f.properties.name, f.properties.city, f.properties.county, f.properties.country].filter(Boolean).join(', ')
      }));
      setSearchResults(results);
      if (results.length === 0) {
        alert('Inga resultat hittades för "' + searchQuery + '"');
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('Kunde inte söka. Försök igen!');
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition([lat, lng]);
    setSearchResults([]);
    setSearchQuery(result.name || result.display_name.split(',')[0]);
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 14);
    }
  };

  function LocationMarker() {
    const map = useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      },
    });
    
    // Store map reference
    useEffect(() => {
      mapRef.current = map;
    }, [map]);
    
    return position ? <Marker position={position} /> : null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-white/10 max-w-4xl w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Markera plats på kartan</h3>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation"
            aria-label="Stäng"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Search bar */}
        <div className="relative mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Sök ort eller adress..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50"
            >
              {searching ? <Loader size={20} className="animate-spin" /> : <Search size={20} />}
            </button>
          </div>
          
          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-white/10 rounded-xl overflow-hidden z-[1200] shadow-xl">
              {searchResults.map((result, i) => (
                <button
                  key={i}
                  onClick={() => selectSearchResult(result)}
                  className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-white/10 border-b border-white/5 last:border-0"
                >
                  <div className="font-medium">{result.name || result.display_name.split(',')[0]}</div>
                  <div className="text-xs text-gray-400 truncate">{result.display_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="h-[50vh] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-gray-900/80 transition-all duration-300 mb-4 relative">
          <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
            <BaseTileLayer />
            <UserLocationMarker position={userLocation} />
            <LocationMarker />
          </MapContainer>
          
        </div>
        <p className="text-sm text-gray-400 mb-4">Sök efter en plats eller klicka på kartan</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">Avbryt</button>
          <button onClick={() => onSelect(position[0], position[1])} className="flex-1 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all">Använd denna plats</button>
        </div>
      </div>
    </div>
  );
}

export default MapPicker;
