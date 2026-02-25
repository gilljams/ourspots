import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

/**
 * useObjects – manages the Firestore objects listener and selected-object state.
 *
 * Returns:
 *   objects, setObjects, loading,
 *   selectedObject, setSelectedObject
 */
export function useObjects(user, showDemoObjects) {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedObject, setSelectedObject] = useState(null);

  // Firestore listener for objects (owned + shared, or demo)
  useEffect(() => {
    if (!user) {
      setObjects([]);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    const userEmail = user.email?.toLowerCase();
    const objectsRef = collection(db, 'objects');

    // Demo mode: only show objects with isDemo == true
    if (showDemoObjects) {
      const demoQuery = query(objectsRef, where('isDemo', '==', true));

      const unsubDemo = onSnapshot(demoQuery, (snap) => {
        if (isCancelled) return;
        const demoObjects = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          isDemoObject: true
        }));
        setObjects(demoObjects);
        setLoading(false);

        setSelectedObject(prev => {
          if (!prev?.id) return prev;
          const updated = demoObjects.find(obj => obj.id === prev.id);
          return updated || null;
        });
      }, (error) => {
        console.error('Error loading demo objects:', error);
        if (isCancelled) return;
        setLoading(false);
      });

      return () => {
        isCancelled = true;
        unsubDemo();
      };
    }

    // Normal mode: owned + shared objects
    const ownedQuery = query(objectsRef, where('ownerId', '==', user.uid));
    const sharedQuery = userEmail
      ? query(objectsRef, where('sharedWithEmails', 'array-contains', userEmail))
      : null;

    let ownedObjects = [];
    let sharedObjects = [];
    let ownedLoaded = false;
    let sharedLoaded = !sharedQuery;

    const combineAndSetObjects = () => {
      if (!ownedLoaded || !sharedLoaded || isCancelled) return;

      const ownedIds = new Set(ownedObjects.map(o => o.id));
      const combined = [
        ...ownedObjects.filter(o => !o.isDemo),
        ...sharedObjects.filter(o => !ownedIds.has(o.id) && !o.isDemo).map(o => ({ ...o, isSharedWithMe: true }))
      ];

      setObjects(combined);
      setLoading(false);

      setSelectedObject(prev => {
        if (!prev?.id) return prev;
        const updated = combined.find(obj => obj.id === prev.id);
        return updated || prev;
      });
    };

    const unsubOwned = onSnapshot(ownedQuery, (snap) => {
      if (isCancelled) return;
      ownedObjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      ownedLoaded = true;
      combineAndSetObjects();
    }, (error) => {
      console.error('Error loading owned objects:', error);
      if (isCancelled) return;
      ownedLoaded = true;
      combineAndSetObjects();
    });

    let unsubShared = () => {};
    if (sharedQuery) {
      unsubShared = onSnapshot(sharedQuery, (snap) => {
        if (isCancelled) return;
        sharedObjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        sharedLoaded = true;
        combineAndSetObjects();
      }, (error) => {
        console.error('Error loading shared objects:', error);
        if (isCancelled) return;
        sharedLoaded = true;
        combineAndSetObjects();
      });
    }

    return () => {
      isCancelled = true;
      unsubOwned();
      unsubShared();
    };
  }, [user, showDemoObjects]);

  // Keep selectedObject in sync when objects array changes
  useEffect(() => {
    if (!selectedObject) return;

    const selectedId = selectedObject.id;
    const fresh = objects.find(o => o.id === selectedId);

    setSelectedObject(current => {
      if (!current || current.id !== selectedId) return current;
      return fresh || null;
    });
  }, [objects, selectedObject?.id]);

  return {
    objects,
    setObjects,
    loading,
    selectedObject,
    setSelectedObject
  };
}
