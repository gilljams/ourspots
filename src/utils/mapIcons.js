import L from 'leaflet';

// Custom colored marker icons per category
export const createColoredIcon = (color) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-marker-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

export const createUserIcon = (heading = null) => {
  // Directional cone (Google Maps style) – shown when heading is available
  const coneHtml = heading !== null ? `
    <div style="
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 70px; height: 70px;
      border-radius: 50%;
      background: conic-gradient(
        from ${heading - 35}deg,
        transparent 0deg,
        rgba(59, 130, 246, 0.08) 8deg,
        rgba(59, 130, 246, 0.22) 35deg,
        rgba(59, 130, 246, 0.08) 62deg,
        transparent 70deg
      );
      -webkit-mask-image: radial-gradient(circle, black 12%, transparent 65%);
      mask-image: radial-gradient(circle, black 12%, transparent 65%);
      pointer-events: none;
      z-index: 0;
    "></div>
  ` : '';

  return L.divIcon({
    html: `<div class="user-position-marker" style="position: relative; width: 20px; height: 20px;">
      ${coneHtml}
      <div style="width: 20px; height: 20px; border-radius: 50%; background: #3B82F6; border: 3px solid white; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.3); position: relative; z-index: 2;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
      </div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(59, 130, 246, 0.4); animation: pulse 2s infinite; z-index: 1;"></div>
    </div>`,
    className: 'user-position-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

export const createAreaIcon = (color) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 35px; height: 35px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); opacity: 0.7; display: flex; align-items: center; justify-content: center;">
      <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px dashed white; opacity: 0.8;"></div>
    </div>`,
    className: 'area-marker-icon',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [0, -35],
  });
};
