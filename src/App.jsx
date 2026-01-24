import React, { useState } from 'react';
import { MapPin, Home, Coffee, Mountain, Star, Calendar } from 'lucide-react';

const PREDEFINED_ICONS = {
  '🏡': { icon: Home, label: 'Fastighet' },
  '🏠': { icon: Home, label: 'Hus' },
  '☕': { icon: Coffee, label: 'Kafé' },
  '🏞️': { icon: Mountain, label: 'Natur' },
  '⭐': { icon: Star, label: 'Favorit' },
  '✈️': { icon: Calendar, label: 'Resa' }
};

const exampleObjects = [
  {
    id: 'obj-1',
    type: '🏡',
    layerId: 'default',
    blocks: [
      { type: 'title', data: { text: 'Sommarstugan i Dalarna' } },
      { type: 'location', data: { lat: 61.0, lng: 14.5, address: 'Siljan, Dalarna' } },
      { type: 'image', data: { url: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800' } },
      { type: 'text', data: { content: 'Mysig stuga vid sjön med egen brygga och bastu.' } }
    ],
    metadata: { createdAt: new Date(), updatedAt: new Date() }
  },
  {
    id: 'obj-2',
    type: '☕',
    layerId: 'default',
    blocks: [
      { type: 'title', data: { text: 'Café Lyktan' } },
      { type: 'location', data: { lat: 59.33, lng: 18.06, address: 'Södermalm, Stockholm' } },
      { type: 'image', data: { url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800' } },
      { type: 'text', data: { content: 'Underbart fik med bästa kanelbullarna!' } }
    ],
    metadata: { createdAt: new Date(), updatedAt: new Date() }
  },
  {
    id: 'obj-3',
    type: '🏞️',
    layerId: 'default',
    blocks: [
      { type: 'title', data: { text: 'Tyresta Nationalpark' } },
      { type: 'location', data: { lat: 59.18, lng: 18.28, address: 'Tyresta, Stockholm' } },
      { type: 'image', data: { url: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800' } },
      { type: 'text', data: { content: 'Vacker naturreservat perfekt för vandring.' } }
    ],
    metadata: { createdAt: new Date(), updatedAt: new Date() }
  }
];

const TitleBlock = ({ data }) => (
  <h2 className="text-2xl font-bold text-white mb-2">{data.text}</h2>
);

const LocationBlock = ({ data }) => (
  <div className="flex items-center gap-2 text-gray-300 mb-3">
    <MapPin size={18} className="text-blue-400" />
    <span className="text-sm">{data.address}</span>
  </div>
);

const ImageBlock = ({ data }) => (
  <div className="w-full h-48 rounded-xl overflow-hidden mb-4">
    <img src={data.url} alt="" className="w-full h-full object-cover" />
  </div>
);

const TextBlock = ({ data }) => (
  <p className="text-gray-300 text-sm leading-relaxed mb-4">{data.content}</p>
);

const blockComponents = {
  title: TitleBlock,
  location: LocationBlock,
  image: ImageBlock,
  text: TextBlock
};

const ObjectCard = ({ object, onClick }) => {
  const IconComponent = PREDEFINED_ICONS[object.type]?.icon || Home;
  const titleBlock = object.blocks.find(b => b.type === 'title');
  const imageBlock = object.blocks.find(b => b.type === 'image');
  const locationBlock = object.blocks.find(b => b.type === 'location');

  return (
    <div
      onClick={onClick}
      className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 hover:border-blue-400/50 transition-all cursor-pointer transform hover:scale-[1.02]"
    >
      {imageBlock && (
        <div className="w-full h-40 overflow-hidden">
          <img
            src={imageBlock.data.url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <IconComponent size={18} className="text-blue-400" />
          </div>
          {titleBlock && (
            <h3 className="text-lg font-semibold text-white">{titleBlock.data.text}</h3>
          )}
        </div>
        {locationBlock && (
          <div className="flex items-center gap-1 text-gray-400 text-sm">
            <MapPin size={14} />
            <span>{locationBlock.data.address}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ObjectDetail = ({ object, onClose }) => {
  const IconComponent = PREDEFINED_ICONS[object.type]?.icon || Home;
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-4 flex items-start justify-center pt-20">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-white/10 max-w-2xl w-full p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <IconComponent size={24} className="text-blue-400" />
              </div>
              <span className="text-gray-400 text-sm">{PREDEFINED_ICONS[object.type]?.label}</span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {object.blocks.map((block, index) => {
              const BlockComponent = blockComponents[block.type];
              return BlockComponent ? (
                <BlockComponent key={index} data={block.data} />
              ) : null;
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="text-xs text-gray-500 space-y-1">
              <div>Objekt-ID: {object.id}</div>
              <div>Layer: {object.layerId}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [selectedObject, setSelectedObject] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'Alla', icon: Star },
    { id: '🏡', label: 'Fastigheter', icon: Home },
    { id: '☕', label: 'Kaféer', icon: Coffee },
    { id: '🏞️', label: 'Natur', icon: Mountain }
  ];

  const filteredObjects = activeCategory === 'all'
    ? exampleObjects
    : exampleObjects.filter(obj => obj.type === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      <header className="bg-gray-900/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white">OurSpots</h1>
          <p className="text-gray-400 text-sm">Din personliga platsbok</p>
        </div>
      </header>

      <div className="bg-gray-900/30 backdrop-blur-md border-b border-white/10 sticky top-[73px] z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
          {categories.map(cat => {
            const IconComponent = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <IconComponent size={16} />
                <span className="text-sm font-medium">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredObjects.map(obj => (
            <ObjectCard
              key={obj.id}
              object={obj}
              onClick={() => setSelectedObject(obj)}
            />
          ))}
        </div>

        {filteredObjects.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p>Inga objekt hittades i denna kategori</p>
          </div>
        )}
      </main>

      <button className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-full shadow-2xl flex items-center justify-center text-white text-3xl transition-all hover:scale-110 z-40">
        +
      </button>

      {selectedObject && (
        <ObjectDetail
          object={selectedObject}
          onClose={() => setSelectedObject(null)}
        />
      )}
    </div>
  );
}

export default App;