import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * useFavorites – manages user favorites (IDs stored on user doc in Firestore).
 *
 * @param {object|null} user  – current Firebase auth user
 * @param {string[]}    initialFavorites – favorites loaded from Firestore by useAuth
 * @param {object[]}    objects – all objects (for validFavoritesCount)
 *
 * Returns:
 *   favorites, setFavorites, handleToggleFavorite, validFavoritesCount
 */
export function useFavorites(user, initialFavorites, objects) {
  const [favorites, setFavorites] = useState([]);

  // Sync from initial load (useAuth reads the user doc once at login)
  useEffect(() => {
    setFavorites(initialFavorites);
  }, [initialFavorites]);

  // Reset when logged out
  useEffect(() => {
    if (!user) setFavorites([]);
  }, [user]);

  const handleToggleFavorite = useCallback(async (objectId) => {
    if (!user) return;

    const isFavorite = favorites.includes(objectId);
    const newFavorites = isFavorite
      ? favorites.filter(id => id !== objectId)
      : [...favorites, objectId];

    setFavorites(newFavorites);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        favorites: newFavorites
      });
    } catch (err) {
      console.error('Error updating favorites:', err);
      // Revert on error
      setFavorites(favorites);
    }
  }, [user, favorites]);

  // Count only favorites that still exist in objects
  const validFavoritesCount = useMemo(() =>
    favorites.filter(fid => objects.some(o => o.id === fid)).length,
    [favorites, objects]
  );

  return {
    favorites,
    setFavorites,
    handleToggleFavorite,
    validFavoritesCount
  };
}
