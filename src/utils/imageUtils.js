// Cloudinary configuration
export const CLOUDINARY_CLOUD_NAME = 'dkpwqradh';
export const CLOUDINARY_UPLOAD_PRESET = 'ourspots_unsigned';

// Helper to transform Cloudinary URLs - only does basic resize, cropping handled by CSS
export const getTransformedImageUrl = (url, cropMode = 'auto', width = 800, height = 600, focalPoint = null) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  // If we have a custom focal point, don't use Cloudinary cropping - we'll handle it with CSS
  if (focalPoint && focalPoint.x !== undefined && focalPoint.y !== undefined) {
    const transformation = `c_limit,w_${width * 2},h_${height * 2},q_auto`;
    return url.replace('/upload/', `/upload/${transformation}/`);
  }
  
  const gravityMap = {
    'auto': 'g_auto',
    'face': 'g_face', 
    'center': 'g_center'
  };
  const gravity = gravityMap[cropMode] || 'g_auto';
  const transformation = `c_fill,${gravity},w_${width},h_${height},q_auto:best`;
  
  return url.replace('/upload/', `/upload/${transformation}/`);
};

// Helper to get CSS styles for focal point positioning
export const getFocalPointStyles = (focalPoint) => {
  if (!focalPoint || focalPoint.x === undefined || focalPoint.y === undefined) {
    return {};
  }
  return {
    objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
    transform: focalPoint.zoom ? `scale(${focalPoint.zoom})` : undefined
  };
};

// Helper to resize image before upload
export const resizeImage = (file, maxSize = 2000, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Only resize if larger than maxSize
        if (width <= maxSize && height <= maxSize) {
          resolve(file);
          return;
        }
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, file.type, quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to extract GPS coordinates from image EXIF data
export const extractGPSFromImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target.result);
        
        // Check for JPEG signature
        if (view.getUint16(0, false) !== 0xFFD8) {
          resolve(null);
          return;
        }
        
        let offset = 2;
        const length = view.byteLength;
        
        // Find EXIF marker
        while (offset < length) {
          if (view.getUint16(offset, false) === 0xFFE1) {
            const exifOffset = offset + 10;
            
            // Check for EXIF signature
            if (view.getUint32(exifOffset - 6, false) !== 0x45786966) {
              break;
            }
            
            const littleEndian = view.getUint16(exifOffset, false) === 0x4949;
            const gpsOffset = findGPSOffset(view, exifOffset, littleEndian);
            
            if (gpsOffset) {
              const coords = parseGPS(view, gpsOffset, exifOffset, littleEndian);
              resolve(coords);
              return;
            }
          }
          offset += 2 + view.getUint16(offset + 2, false);
        }
        resolve(null);
      } catch (err) {
        console.error('EXIF parsing error:', err);
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
};

const findGPSOffset = (view, exifOffset, littleEndian) => {
  const ifdOffset = exifOffset + view.getUint32(exifOffset + 4, littleEndian);
  const tags = view.getUint16(ifdOffset, littleEndian);
  
  for (let i = 0; i < tags; i++) {
    const tagOffset = ifdOffset + 2 + (i * 12);
    const tag = view.getUint16(tagOffset, littleEndian);
    
    // GPS IFD Pointer tag
    if (tag === 0x8825) {
      return exifOffset + view.getUint32(tagOffset + 8, littleEndian);
    }
  }
  return null;
};

const parseGPS = (view, gpsOffset, exifOffset, littleEndian) => {
  const tags = view.getUint16(gpsOffset, littleEndian);
  let latRef, lat, lngRef, lng;
  
  for (let i = 0; i < tags; i++) {
    const tagOffset = gpsOffset + 2 + (i * 12);
    const tag = view.getUint16(tagOffset, littleEndian);
    const valueOffset = exifOffset + view.getUint32(tagOffset + 8, littleEndian);
    
    if (tag === 1) { // GPSLatitudeRef
      latRef = String.fromCharCode(view.getUint8(tagOffset + 8));
    } else if (tag === 2) { // GPSLatitude
      lat = parseGPSCoordinate(view, valueOffset, littleEndian);
    } else if (tag === 3) { // GPSLongitudeRef
      lngRef = String.fromCharCode(view.getUint8(tagOffset + 8));
    } else if (tag === 4) { // GPSLongitude
      lng = parseGPSCoordinate(view, valueOffset, littleEndian);
    }
  }
  
  if (lat && lng) {
    return {
      lat: latRef === 'S' ? -lat : lat,
      lng: lngRef === 'W' ? -lng : lng
    };
  }
  return null;
};

const parseGPSCoordinate = (view, offset, littleEndian) => {
  const deg = view.getUint32(offset, littleEndian) / view.getUint32(offset + 4, littleEndian);
  const min = view.getUint32(offset + 8, littleEndian) / view.getUint32(offset + 12, littleEndian);
  const sec = view.getUint32(offset + 16, littleEndian) / view.getUint32(offset + 20, littleEndian);
  return deg + min / 60 + sec / 3600;
};
