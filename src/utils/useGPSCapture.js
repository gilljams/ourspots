import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook for capturing GPS position with accuracy feedback.
 * Supports both precise mode (watchPosition) and quick mode (getCurrentPosition).
 * 
 * @param {Object} options
 * @param {boolean} options.preciseGPS - Use high accuracy watchPosition mode
 * @param {number} options.accuracyThreshold - Stop when accuracy reaches this (default: 10m)
 * @param {number} options.timeout - Max time to wait for position (default: 15000ms)
 * @returns {Object} { capture, cancel, position, accuracy, isCapturing, error }
 */
export function useGPSCapture({ 
  preciseGPS = true, 
  accuracyThreshold = 10, 
  timeout = 15000 
} = {}) {
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);
  
  const watchIdRef = useRef(null);
  const timeoutIdRef = useRef(null);
  const bestPositionRef = useRef(null);
  const bestAccuracyRef = useRef(Infinity);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  const cancel = useCallback(() => {
    cleanup();
    setIsCapturing(false);
    setAccuracy(null);
  }, [cleanup]);
  
  const capture = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = new Error('GPS stöds inte av din enhet');
        setError(err.message);
        reject(err);
        return;
      }
      
      // If already capturing, reject immediately to prevent hanging promises
      if (isCapturing) {
        reject(new Error('En GPS-läsning pågår redan'));
        return;
      }
      
      setIsCapturing(true);
      setError(null);
      setAccuracy(null);
      bestPositionRef.current = null;
      bestAccuracyRef.current = Infinity;
      
      const handleSuccess = (pos) => {
        const result = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp
        };
        setPosition(result);
        setIsCapturing(false);
        setAccuracy(null);
        cleanup();
        resolve(result);
      };
      
      const handleError = (err) => {
        // If we have a best position from watching, use it
        if (bestPositionRef.current) {
          const result = {
            lat: bestPositionRef.current.coords.latitude,
            lng: bestPositionRef.current.coords.longitude,
            accuracy: Math.round(bestAccuracyRef.current),
            timestamp: bestPositionRef.current.timestamp
          };
          setPosition(result);
          cleanup();
          setIsCapturing(false);
          setAccuracy(null);
          resolve(result);
        } else {
          const errMsg = 'Kunde inte hämta position: ' + err.message;
          setError(errMsg);
          cleanup();
          setIsCapturing(false);
          setAccuracy(null);
          reject(new Error(errMsg));
        }
      };
      
      if (preciseGPS) {
        // Use watchPosition for better accuracy
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const acc = pos.coords.accuracy;
            setAccuracy(Math.round(acc));
            
            // Track best position
            if (acc < bestAccuracyRef.current) {
              bestAccuracyRef.current = acc;
              bestPositionRef.current = pos;
            }
            
            // If accuracy is good enough, we're done
            if (acc <= accuracyThreshold) {
              handleSuccess(pos);
            }
          },
          handleError,
          { 
            enableHighAccuracy: true, 
            timeout: timeout + 5000, // Give a bit more than our timeout
            maximumAge: 0 
          }
        );
        
        // Timeout: use best position we got
        timeoutIdRef.current = setTimeout(() => {
          if (bestPositionRef.current) {
            const result = {
              lat: bestPositionRef.current.coords.latitude,
              lng: bestPositionRef.current.coords.longitude,
              accuracy: Math.round(bestAccuracyRef.current),
              timestamp: bestPositionRef.current.timestamp
            };
            setPosition(result);
            cleanup();
            setIsCapturing(false);
            setAccuracy(null);
            resolve(result);
          } else {
            handleError({ message: 'Timeout' });
          }
        }, timeout);
        
      } else {
        // Quick mode: single position
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          handleError,
          { 
            enableHighAccuracy: false, 
            timeout: 10000 
          }
        );
      }
    });
  }, [preciseGPS, accuracyThreshold, timeout, isCapturing, cleanup]);
  
  return {
    capture,
    cancel,
    position,
    accuracy,
    isCapturing,
    error
  };
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula.
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => deg * (Math.PI / 180);
  
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return Math.round(R * c);
}

export default useGPSCapture;
