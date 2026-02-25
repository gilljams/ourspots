// Distance calculation using Haversine formula (returns km)
export const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Distance in meters (used by map components for navigation)
export const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  return getDistance(lat1, lng1, lat2, lng2) * 1000;
};

// Format meters for display (e.g. "350 m" or "2.1 km")
export const formatDistanceMeters = (meters) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

// Get distance from user location to an object with location block
export const getObjectDistance = (obj, userLocation) => {
  if (!userLocation) return undefined;
  const locBlock = obj.blocks?.find(b => b.type === 'location');
  if (locBlock?.data?.lat && locBlock?.data?.lng) {
    return getDistance(userLocation.lat, userLocation.lng, locBlock.data.lat, locBlock.data.lng);
  }
  return undefined;
};

// Format distance for display
export const formatDistance = (km) => {
  if (km === undefined || km === null) return '';
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};
