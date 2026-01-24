import React, { useState } from 'react';
import { MapPin, Home, Coffee, Mountain, Star, Calendar, X, Plus, Image, Edit2, Trash2 } from 'lucide-react';

const PREDEFINED_ICONS = {
  '🏡': { icon: Home, label: 'Fastighet' },
  '🏠': { icon: Home, label: 'Hus' },
  '☕': { icon: Coffee, label: 'Kafé' },
  '🏞️': { icon: Mountain, label: 'Natur' },
  '⭐': { icon: Star, label: 'Favorit' },
  '✈️': { icon: Calendar, label: 'Resa' }
};

const initialObjects = [
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

const DeleteConfirmModal = ({ object, onConfirm, onCancel }) => {
  const titleBlock = object.blocks.find(b => b.type === 'title');
  
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-red-500/30 max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 size={24} className="text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Ta bort objekt?</h3>
        </div>
        
        <p className="text-gray-300 mb-6">
          Är du säker på att du vill ta bort <span className="font-semibold text-white">"{titleBlock?.data?.text || 'detta objekt'}"</span>? 
          Detta kan inte ångras.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
          >
            Avbryt
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all"
          >
            Ta bort
          </button>
        </div>
      </div>
    </div>
  );
};

const ObjectDetail = ({ object, onClose, onEdit, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const IconComponent = PREDEFINED_ICONS[object.type]?.icon || Home;
  
  const handleDelete = () => {
    onDelete(object.id);
    onClose();
  };
  
  return (
    <>
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

            <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => onEdit(object)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all"
                >
                  <Edit2 size={18} />
                  <span className="font-medium">Redigera</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
                >
                  <Trash2 size={18} />
                  <span className="font-medium">Ta bort</span>
                </button>
              </div>
              
              <div className="text-xs text-gray-500 space-y-1">
                <div>Objekt-ID: {object.id}</div>
                <div>Layer: {object.layerId}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {showDeleteConfirm && (
        <DeleteConfirmModal
          object={object}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
};

const CreateObjectModal = ({ onClose, onSave, editObject }) => {
  const isEdit = !!editObject;
  
  const [selectedType, setSelectedType] = useState(
    editObject?.type || '🏡'
  );
  const [title, setTitle] = useState(
    editObject?.blocks?.find(b => b.type === 'title')?.data?.text || ''
  );
  const [address, setAddress] = useState(
    editObject?.blocks?.find(b => b.type === 'location')?.data?.address || ''
  );
  const [imageUrl, setImageUrl] = useState(
    editObject?.blocks?.find(b => b.type === 'image')?.data?.url || ''
  );
  const [description, setDescription] = useState(
    editObject?.blocks?.find(b => b.type === 'text')?.data?.content || ''
  );

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('Titel måste fyllas i!');
      return;
    }

    const blocks = [
      { type: 'title', data: { text: title } }
    ];

    if (address.trim()) {
      blocks.push({
        type: 'location',
        data: { lat: 59.33, lng: 18.06, address: address }
      });
    }

    if (imageUrl.trim()) {
      blocks.push({
        type: 'image',
        data: { url: imageUrl }
      });
    }

    if (description.trim()) {
      blocks.push({
        type: 'text',
        data: { content: description }
      });
    }

    const objectData = {
      id: editObject?.id || `obj-${Date.now()}`,
      type: selectedType,
      layerId: 'default',
      blocks: blocks,
      metadata: {
        createdAt: editObject?.metadata?.createdAt || new Date(),
        updatedAt: new Date()
      }
    };

    onSave(objectData, isEdit);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-4 flex items-start justify-center pt-10">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-white/10 max-w-2xl w-full p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {isEdit ? 'Redigera objekt' : 'Skapa nytt objekt'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Välj typ
              </label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(PREDEFINED_ICONS).map(([emoji, { icon: Icon, label }]) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedType(emoji)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedType === emoji
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <Icon size={24} className="mx-auto mb-2 text-blue-400" />
                    <div className="text-xs text-gray-300">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Titel *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="T.ex. Sommarstugan i Dalarna"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Plats/Adress
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="T.ex. Siljan, Dalarna"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bild-URL
              </label>
              <div className="flex gap-2">
                <Image size={20} className="text-gray-400 mt-3" />
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tips: Använd Unsplash för gratis bilder
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Beskrivning
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beskriv platsen..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all"
              >
                {isEdit ? 'Spara ändringar' : 'Skapa objekt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [objects, setObjects] = useState(initialObjects);
  const [selectedObject, setSelectedObject] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingObject, setEditingObject] = useState(null);

  const categories = [
    { id: 'all', label: 'Alla', icon: Star },
    { id: '🏡', label: 'Fastigheter', icon: Home },
    { id: '☕', label: 'Kaféer', icon: Coffee },
    { id: '🏞️', label: 'Natur', icon: Mountain }
  ];

  const filteredObjects = activeCategory === 'all'
    ? objects
    : objects.filter(obj => obj.type === activeCategory);

  const handleSaveObject = (objectData, isEdit) => {
    if (isEdit) {
      setObjects(objects.map(obj => obj.id === objectData.id ? objectData : obj));
    } else {
      setObjects([...objects, objectData]);
    }
    setShowCreateModal(false);
    setEditingObject(null);
    setSelectedObject(null);
  };

  const handleDeleteObject = (id) => {
    setObjects(objects.filter(obj => obj.id !== id));
  };

  const handleEdit = (object) => {
    setEditingObject(object);
    setShowCreateModal(true);
    setSelectedObject(null);
  };

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

      <button
        onClick={() => {
          setEditingObject(null);
          setShowCreateModal(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 z-40"
      >
        <Plus size={28} />
      </button>

      {selectedObject && (
        <ObjectDetail
          object={selectedObject}
          onClose={() => setSelectedObject(null)}
          onEdit={handleEdit}
          onDelete={handleDeleteObject}
        />
      )}

      {showCreateModal && (
        <CreateObjectModal
          onClose={() => {
            setShowCreateModal(false);
            setEditingObject(null);
          }}
          onSave={handleSaveObject}
          editObject={editingObject}
        />
      )}
    </div>
  );
}

export default App;