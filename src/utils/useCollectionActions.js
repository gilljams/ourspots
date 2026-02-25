import { useCallback } from 'react';
import { db } from '../firebase';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';

/**
 * Hook encapsulating all collection-view CRUD operations
 * (add/remove objects, manage linked URLs, reorder items, update notes).
 *
 * Each handler takes a collectionId and performs the Firestore update,
 * showing a toast on error.
 */
export function useCollectionActions(objects, setToast) {
  const addToCollection = useCallback(async (objectId, collectionId) => {
    try {
      // Prevent circular linking
      if (objectId === collectionId) {
        setToast({ message: 'En samlingsvy kan inte länka till sig själv', type: 'error' });
        return;
      }
      const coll = objects.find(o => o.id === collectionId);
      if (!coll) return;
      const currentLinked = coll.linkedObjectIds || [];
      if (currentLinked.includes(objectId)) {
        setToast({ message: 'Objektet finns redan i samlingsvyn', type: 'info' });
        return;
      }
      const currentOrder = coll.linkedOrder || [];
      await updateDoc(doc(db, 'objects', collectionId), {
        linkedObjectIds: [...currentLinked, objectId],
        linkedOrder: [...currentOrder, { type: 'object', id: objectId }],
        updatedAt: Timestamp.now()
      });
      const collectionTitle = coll.blocks?.find(b => b.type === 'title')?.data?.text || 'samlingsvyn';
      setToast({ message: `Tillagt i "${collectionTitle}"!`, type: 'success' });
    } catch (err) {
      console.error('Error adding to collection:', err);
      setToast({ message: 'Kunde inte lägga till i samlingsvyn', type: 'error' });
    }
  }, [objects, setToast]);

  const removeFromCollection = useCallback(async (collectionId, objectId) => {
    try {
      const coll = objects.find(o => o.id === collectionId);
      if (!coll) return;
      const currentLinked = coll.linkedObjectIds || [];
      const currentOrder = coll.linkedOrder || [];
      await updateDoc(doc(db, 'objects', collectionId), {
        linkedObjectIds: currentLinked.filter(id => id !== objectId),
        linkedOrder: currentOrder.filter(item => !(item.type === 'object' && item.id === objectId)),
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error removing from collection:', err);
      setToast({ message: 'Kunde inte ta bort från samlingsvyn', type: 'error' });
    }
  }, [objects, setToast]);

  const updateLinkedNote = useCallback(async (collectionId, linkedObjectId, note) => {
    try {
      const coll = objects.find(o => o.id === collectionId);
      if (!coll) return;
      const currentNotes = coll.linkedObjectNotes || {};
      const updatedNotes = { ...currentNotes };
      if (note) {
        updatedNotes[linkedObjectId] = note;
      } else {
        delete updatedNotes[linkedObjectId];
      }
      await updateDoc(doc(db, 'objects', collectionId), {
        linkedObjectNotes: updatedNotes,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error updating linked note:', err);
    }
  }, [objects]);

  const addLinkedUrl = useCallback(async (collectionId, urlData) => {
    try {
      const coll = objects.find(o => o.id === collectionId);
      if (!coll) return;
      const newUrl = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        title: urlData.title,
        url: urlData.url,
        note: urlData.note || ''
      };
      const currentUrls = coll.linkedUrls || [];
      const currentOrder = coll.linkedOrder || [];
      await updateDoc(doc(db, 'objects', collectionId), {
        linkedUrls: [...currentUrls, newUrl],
        linkedOrder: [...currentOrder, { type: 'url', id: newUrl.id }],
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error adding linked URL:', err);
      setToast({ message: 'Kunde inte lägga till länken', type: 'error' });
    }
  }, [objects, setToast]);

  const updateLinkedUrl = useCallback(async (collectionId, urlId, urlData) => {
    try {
      const coll = objects.find(o => o.id === collectionId);
      if (!coll) return;
      const currentUrls = coll.linkedUrls || [];
      const updatedUrls = currentUrls.map(u => u.id === urlId ? { ...u, ...urlData } : u);
      await updateDoc(doc(db, 'objects', collectionId), {
        linkedUrls: updatedUrls,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error updating linked URL:', err);
    }
  }, [objects]);

  const removeLinkedUrl = useCallback(async (collectionId, urlId) => {
    try {
      const coll = objects.find(o => o.id === collectionId);
      if (!coll) return;
      const currentUrls = coll.linkedUrls || [];
      const currentOrder = coll.linkedOrder || [];
      await updateDoc(doc(db, 'objects', collectionId), {
        linkedUrls: currentUrls.filter(u => u.id !== urlId),
        linkedOrder: currentOrder.filter(item => !(item.type === 'url' && item.id === urlId)),
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error removing linked URL:', err);
    }
  }, [objects]);

  const reorderLinked = useCallback(async (collectionId, currentIndex, direction) => {
    try {
      const coll = objects.find(o => o.id === collectionId);
      if (!coll) return;

      const currentOrder = [...(coll.linkedOrder || [])];
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (newIndex < 0 || newIndex >= currentOrder.length) return;

      // Swap items
      [currentOrder[currentIndex], currentOrder[newIndex]] = [currentOrder[newIndex], currentOrder[currentIndex]];

      await updateDoc(doc(db, 'objects', collectionId), {
        linkedOrder: currentOrder,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error reordering linked item:', err);
    }
  }, [objects]);

  return {
    addToCollection,
    removeFromCollection,
    updateLinkedNote,
    addLinkedUrl,
    updateLinkedUrl,
    removeLinkedUrl,
    reorderLinked
  };
}
