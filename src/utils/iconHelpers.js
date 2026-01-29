import { 
  MapPin, Home, Coffee, Mountain, Star, Calendar, Folder, Navigation, Plane,
  UtensilsCrossed, Pizza, Wine, Beer, Gamepad2, Music, Film, PartyPopper,
  Bike, Dumbbell, Waves, TreePine, Shell, Sprout, RotateCcw,
  Link, ExternalLink, Globe, FileText, ShoppingCart, CreditCard, Phone, Mail, Instagram, Youtube, Facebook,
  Gift, ClipboardList, Users, UserCircle
} from 'lucide-react';

// Helper to get icon component from string name
export const iconMap = {
  MapPin, Home, Coffee, Mountain, Star, Calendar, Folder, Navigation, Plane,
  UtensilsCrossed, Pizza, Wine, Beer, Gamepad2, Music, Film, PartyPopper,
  Bike, Dumbbell, Waves, TreePine, Shell, Sprout, RotateCcw,
  Link, ExternalLink, Globe, FileText, ShoppingCart, CreditCard, Phone, Mail, Instagram, Youtube, Facebook,
  Gift, ClipboardList, Users, UserCircle
};

export const getIconComponent = (iconName) => {
  return iconMap[iconName] || Home;
};

// List of available icons for categories
export const AVAILABLE_ICONS = [
  { name: 'Home', label: 'Hem' },
  { name: 'Coffee', label: 'Kafé' },
  { name: 'Mountain', label: 'Berg' },
  { name: 'Star', label: 'Stjärna' },
  { name: 'MapPin', label: 'Plats' },
  { name: 'Calendar', label: 'Kalender' },
  { name: 'Folder', label: 'Mapp' },
  { name: 'Navigation', label: 'Navigation' },
  { name: 'Plane', label: 'Resor' },
  { name: 'UtensilsCrossed', label: 'Mat och dryck' },
  { name: 'Pizza', label: 'Pizza' },
  { name: 'Wine', label: 'Vin' },
  { name: 'Beer', label: 'Öl' },
  { name: 'Gamepad2', label: 'Nöjen' },
  { name: 'Music', label: 'Musik' },
  { name: 'Film', label: 'Film' },
  { name: 'PartyPopper', label: 'Fest' },
  { name: 'Bike', label: 'Aktiviteter' },
  { name: 'Dumbbell', label: 'Träning' },
  { name: 'Waves', label: 'Vatten' },
  { name: 'TreePine', label: 'Skog' },
  { name: 'Shell', label: 'Strand' },
  { name: 'Sprout', label: 'Svamp' },
];

// Icons available for links
export const LINK_ICONS = [
  { name: 'Link', label: 'Länk' },
  { name: 'ExternalLink', label: 'Extern länk' },
  { name: 'Globe', label: 'Webb' },
  { name: 'FileText', label: 'Dokument' },
  { name: 'Calendar', label: 'Bokning' },
  { name: 'ShoppingCart', label: 'Köp' },
  { name: 'CreditCard', label: 'Betala' },
  { name: 'Phone', label: 'Ring' },
  { name: 'Mail', label: 'E-post' },
  { name: 'MapPin', label: 'Karta' },
  { name: 'Instagram', label: 'Instagram' },
  { name: 'Youtube', label: 'YouTube' },
  { name: 'Facebook', label: 'Facebook' },
  { name: 'UtensilsCrossed', label: 'Meny' },
  { name: 'Star', label: 'Recension' },
  { name: 'Music', label: 'Musik' },
];

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
