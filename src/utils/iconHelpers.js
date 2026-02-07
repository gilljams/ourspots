import { 
  MapPin, Home, Coffee, Mountain, Star, Calendar, Folder, Navigation, Plane,
  UtensilsCrossed, Pizza, Wine, Beer, Gamepad2, Music, Film, PartyPopper,
  Bike, Dumbbell, Waves, TreePine, Shell, Sprout, RotateCcw,
  Link, ExternalLink, Globe, FileText, ShoppingCart, CreditCard, Phone, Mail, Instagram, Youtube, Facebook,
  Gift, ClipboardList, Users, UserCircle,
  Wrench, BookOpen, Trophy, CheckSquare,
  MessageCircle, MessagesSquare, Headphones, Radio, FolderOpen, FileSpreadsheet, Video, Image
} from 'lucide-react';

// Helper to get icon component from string name
export const iconMap = {
  MapPin, Home, Coffee, Mountain, Star, Calendar, Folder, Navigation, Plane,
  UtensilsCrossed, Pizza, Wine, Beer, Gamepad2, Music, Film, PartyPopper,
  Bike, Dumbbell, Waves, TreePine, Shell, Sprout, RotateCcw,
  Link, ExternalLink, Globe, FileText, ShoppingCart, CreditCard, Phone, Mail, Instagram, Youtube, Facebook,
  Gift, ClipboardList, Users, UserCircle,
  Wrench, BookOpen, Trophy, CheckSquare,
  MessageCircle, MessagesSquare, Headphones, Radio, FolderOpen, FileSpreadsheet, Video, Image
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
  { name: 'Trophy', label: 'Sport' },
  { name: 'Waves', label: 'Vatten' },
  { name: 'TreePine', label: 'Skog' },
  { name: 'Shell', label: 'Strand' },
  { name: 'Sprout', label: 'Svamp' },
  { name: 'Wrench', label: 'Verktyg' },
  { name: 'BookOpen', label: 'Manual' },
  { name: 'ClipboardList', label: 'Listor' },
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
  { name: 'Music', label: 'Musik/Spotify' },
  { name: 'Headphones', label: 'Spellista' },
  { name: 'MessageCircle', label: 'WhatsApp/Chat' },
  { name: 'MessagesSquare', label: 'Discord/Slack' },
  { name: 'Video', label: 'Video/Zoom' },
  { name: 'FolderOpen', label: 'Drive/Dropbox' },
  { name: 'FileSpreadsheet', label: 'Kalkylblad' },
  { name: 'Image', label: 'Fotoalbum' },
  { name: 'Users', label: 'Grupp' },
];

// Auto-detect icon based on URL
export const detectIconFromUrl = (url) => {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  
  // Chat/messaging
  if (lowerUrl.includes('wa.me') || lowerUrl.includes('whatsapp.com') || lowerUrl.includes('chat.whatsapp')) return 'MessageCircle';
  if (lowerUrl.includes('m.me') || lowerUrl.includes('messenger.com')) return 'MessageCircle';
  if (lowerUrl.includes('discord.com') || lowerUrl.includes('discord.gg')) return 'MessagesSquare';
  if (lowerUrl.includes('slack.com')) return 'MessagesSquare';
  if (lowerUrl.includes('telegram.') || lowerUrl.includes('t.me')) return 'MessageCircle';
  
  // Music/audio
  if (lowerUrl.includes('spotify.com') || lowerUrl.includes('open.spotify')) return 'Headphones';
  if (lowerUrl.includes('music.apple')) return 'Music';
  if (lowerUrl.includes('soundcloud.com')) return 'Music';
  
  // Video
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'Youtube';
  if (lowerUrl.includes('zoom.us') || lowerUrl.includes('zoom.com')) return 'Video';
  if (lowerUrl.includes('meet.google')) return 'Video';
  if (lowerUrl.includes('teams.microsoft')) return 'Video';
  
  // Cloud storage
  if (lowerUrl.includes('drive.google') || lowerUrl.includes('docs.google')) return 'FolderOpen';
  if (lowerUrl.includes('dropbox.com')) return 'FolderOpen';
  if (lowerUrl.includes('onedrive.') || lowerUrl.includes('sharepoint.')) return 'FolderOpen';
  
  // Social
  if (lowerUrl.includes('instagram.com')) return 'Instagram';
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) return 'Facebook';
  
  // Photos
  if (lowerUrl.includes('photos.google') || lowerUrl.includes('photos.app')) return 'Image';
  if (lowerUrl.includes('flickr.com')) return 'Image';
  
  // Booking
  if (lowerUrl.includes('booking.com') || lowerUrl.includes('airbnb.') || lowerUrl.includes('hotels.')) return 'Calendar';
  
  // Food
  if (lowerUrl.includes('thefork') || lowerUrl.includes('opentable') || lowerUrl.includes('resy.com')) return 'UtensilsCrossed';
  
  // Spreadsheets
  if (lowerUrl.includes('sheets.google') || lowerUrl.includes('airtable.')) return 'FileSpreadsheet';
  
  // Maps
  if (lowerUrl.includes('maps.google') || lowerUrl.includes('goo.gl/maps') || lowerUrl.includes('maps.apple')) return 'MapPin';
  
  return null;
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
