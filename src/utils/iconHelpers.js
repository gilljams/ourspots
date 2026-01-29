import { 
  MapPin, Home, Coffee, Mountain, Star, Calendar, Folder, Navigation, Plane,
  UtensilsCrossed, Pizza, Wine, Beer, Gamepad2, Music, Film, PartyPopper,
  Bike, Dumbbell, Waves, TreePine, Shell, Sprout, RotateCcw
} from 'lucide-react';

// Helper to get icon component from string name
export const iconMap = {
  MapPin, Home, Coffee, Mountain, Star, Calendar, Folder, Navigation, Plane,
  UtensilsCrossed, Pizza, Wine, Beer, Gamepad2, Music, Film, PartyPopper,
  Bike, Dumbbell, Waves, TreePine, Shell, Sprout, RotateCcw
};

export const getIconComponent = (iconName) => {
  return iconMap[iconName] || Home;
};

// Legacy emoji mapping for backward compatibility (will be phased out)
export const PREDEFINED_ICONS = {
  '🏡': { icon: Home, label: 'Fastighet' },
  '🏠': { icon: Home, label: 'Hus' },
  '☕': { icon: Coffee, label: 'Kafé' },
  '🏞️': { icon: Mountain, label: 'Natur' },
  '⭐': { icon: Star, label: 'Favorit' },
  '✈️': { icon: Calendar, label: 'Resa' },
  // New string-based IDs
  'property': { icon: Home, label: 'Fastighet' },
  'cafe': { icon: Coffee, label: 'Kafé' },
  'nature': { icon: Mountain, label: 'Natur' }
};

// Email key helpers for Firestore (dots are not allowed in object keys)
export const emailToKey = (email) => email.replace(/\./g, '_DOT_');
export const keyToEmail = (key) => key.replace(/_DOT_/g, '.');
