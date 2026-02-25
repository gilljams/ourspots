import { useCallback } from 'react';
import { db } from '../firebase';
import { updateDoc, doc } from 'firebase/firestore';

/**
 * Hook encapsulating shared-contact management:
 * – addContact: remembers a recently shared-with email
 * – toggleFavoriteContact: stars/unstars a contact
 *
 * Both persist to Firestore users/{uid} and update local state optimistically.
 */
export function useContactActions(user, sharedContacts, setSharedContacts, favoriteContacts, setFavoriteContacts) {
  const addContact = useCallback(async (email) => {
    const newContacts = [...sharedContacts.filter(c => c !== email), email].slice(-20);
    setSharedContacts(newContacts);
    try {
      await updateDoc(doc(db, 'users', user.uid), { sharedContacts: newContacts });
    } catch (err) {
      console.error('Error saving contact:', err);
    }
  }, [user, sharedContacts, setSharedContacts]);

  const toggleFavoriteContact = useCallback(async (email) => {
    const isFavorite = favoriteContacts.includes(email);
    const newFavorites = isFavorite
      ? favoriteContacts.filter(c => c !== email)
      : [...favoriteContacts, email];
    setFavoriteContacts(newFavorites);
    try {
      await updateDoc(doc(db, 'users', user.uid), { favoriteContacts: newFavorites });
    } catch (err) {
      console.error('Error saving favorite contact:', err);
    }
  }, [user, favoriteContacts, setFavoriteContacts]);

  return { addContact, toggleFavoriteContact };
}
