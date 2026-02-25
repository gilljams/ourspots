import { useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, deleteField, Timestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { emailToKey } from './iconHelpers';

/**
 * Hook for sharing-related state and handlers.
 * Manages pending invitations, accept/reject/leave share operations.
 */
export function useSharing(user, objects, displayName, setToast, setSelectedObject) {
  const userEmailLower = user?.email?.toLowerCase();
  const userEmailKey = userEmailLower ? emailToKey(userEmailLower) : null;

  // Pending invitations where user's share status is 'pending'
  const pendingInvitations = useMemo(() => {
    if (!userEmailKey) return [];
    return objects.filter(obj => {
      if (!obj.shares) return false;
      return obj.shares[userEmailKey]?.status === 'pending';
    });
  }, [objects, userEmailKey]);

  // Accept a share invitation
  const handleAcceptInvitation = useCallback(async (obj) => {
    if (!user) return false;
    try {
      const emailKey = emailToKey(user.email.toLowerCase());
      const userEmail = user.email.toLowerCase();
      const userDisplayName = displayName || user.email.split('@')[0];
      const shareInfo = obj.shares?.[emailKey];

      const updateData = {
        [`shares.${emailKey}.status`]: 'accepted',
        [`shares.${emailKey}.respondedAt`]: Timestamp.now(),
        [`shares.${emailKey}.displayName`]: userDisplayName,
        acceptedShareEmails: arrayUnion(userEmail)
      };
      // Add to editorEmails if editor role (for Firestore security rules)
      if (shareInfo?.role === 'editor') {
        updateData.editorEmails = arrayUnion(userEmail);
      }
      await updateDoc(doc(db, 'objects', obj.id), updateData);

      // If includeChildren, also update all descendants that have inherited share
      if (shareInfo?.includeChildren) {
        const descendants = objects.filter(o =>
          o.ancestorIds?.includes(obj.id) &&
          o.shares?.[emailKey]?.status === 'inherited'
        );
        if (descendants.length > 0) {
          await Promise.all(descendants.map(desc => {
            const descUpdateData = {
              [`shares.${emailKey}.displayName`]: userDisplayName,
              acceptedShareEmails: arrayUnion(userEmail)
            };
            if (shareInfo?.role === 'editor') {
              descUpdateData.editorEmails = arrayUnion(userEmail);
            }
            return updateDoc(doc(db, 'objects', desc.id), descUpdateData);
          }));
        }
      }

      return true;
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setToast({ message: 'Kunde inte acceptera', type: 'error' });
      return false;
    }
  }, [user, objects, displayName, setToast]);

  // Reject a share invitation
  const handleRejectInvitation = useCallback(async (obj) => {
    if (!user) return false;
    try {
      const emailKey = emailToKey(user.email.toLowerCase());
      const userEmail = user.email.toLowerCase();
      const shareInfo = obj.shares?.[emailKey];

      await updateDoc(doc(db, 'objects', obj.id), {
        [`shares.${emailKey}`]: deleteField(),
        sharedWithEmails: arrayRemove(userEmail),
        acceptedShareEmails: arrayRemove(userEmail),
        editorEmails: arrayRemove(userEmail)
      });

      // If includeChildren, remove from all descendants with inherited share
      if (shareInfo?.includeChildren) {
        const descendants = objects.filter(o =>
          o.ancestorIds?.includes(obj.id) &&
          o.shares?.[emailKey]?.inheritedFrom === obj.id
        );
        if (descendants.length > 0) {
          await Promise.all(descendants.map(desc =>
            updateDoc(doc(db, 'objects', desc.id), {
              [`shares.${emailKey}`]: deleteField(),
              sharedWithEmails: arrayRemove(userEmail),
              acceptedShareEmails: arrayRemove(userEmail),
              editorEmails: arrayRemove(userEmail)
            })
          ));
        }
      }

      return true;
    } catch (err) {
      console.error('Error declining invitation:', err);
      setToast({ message: 'Kunde inte neka', type: 'error' });
      return false;
    }
  }, [user, objects, setToast]);

  // Leave a shared object
  const handleLeaveShare = useCallback(async (obj) => {
    if (!user) return;

    if (!confirm('Är du säker på att du vill lämna denna delning? Du kommer inte längre ha tillgång till objektet.')) {
      return;
    }

    try {
      const userEmail = user.email.toLowerCase();
      const emailKey = emailToKey(userEmail);
      const shareData = obj.shares?.[emailKey];

      await updateDoc(doc(db, 'objects', obj.id), {
        [`shares.${emailKey}`]: deleteField(),
        sharedWithEmails: arrayRemove(userEmail),
        acceptedShareEmails: arrayRemove(userEmail),
        editorEmails: arrayRemove(userEmail)
      });

      // If this was the original share with includeChildren (not inherited),
      // also remove from all descendants
      if (shareData?.includeChildren && shareData?.status !== 'inherited') {
        const descendants = objects.filter(o =>
          o.ancestorIds?.includes(obj.id) &&
          o.shares?.[emailKey]?.inheritedFrom === obj.id
        );
        if (descendants.length > 0) {
          await Promise.all(descendants.map(desc =>
            updateDoc(doc(db, 'objects', desc.id), {
              [`shares.${emailKey}`]: deleteField(),
              sharedWithEmails: arrayRemove(userEmail),
              acceptedShareEmails: arrayRemove(userEmail),
              editorEmails: arrayRemove(userEmail)
            })
          ));
        }
      }

      setSelectedObject(null);
    } catch (err) {
      console.error('Error leaving share:', err);
      setToast({ message: 'Kunde inte lämna delningen!', type: 'error' });
    }
  }, [user, objects, setToast, setSelectedObject]);

  return {
    pendingInvitations,
    userEmailKey,
    userEmailLower,
    handleAcceptInvitation,
    handleRejectInvitation,
    handleLeaveShare
  };
}
