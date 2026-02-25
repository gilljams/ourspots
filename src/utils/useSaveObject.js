import { useState, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, updateDoc, doc, Timestamp,
  getDoc, deleteField, arrayUnion, arrayRemove
} from 'firebase/firestore';

/**
 * Hook encapsulating object save/create logic:
 * - Validation (auth check, object-limit check)
 * - Ancestor-path building for breadcrumbs
 * - Share inheritance from parent (includeChildren)
 * - Parent-change handling (re-inheriting shares for descendants)
 * - Firestore persistence with timeout
 * - Post-save: fetches fresh doc and calls setSelectedObject
 *
 * Returns `saving` flag and `saveObject(objectData, editId)`.
 * saveObject resolves to savedObjectId on success, undefined on
 * validation failure, or null on error (toast shown internally).
 */
export function useSaveObject({
  user, isAdmin, userApproved, appSettings,
  objects, showDemoObjects, setToast, setSelectedObject
}) {
  const [saving, setSaving] = useState(false);

  const saveObject = useCallback(async (objectData, editId) => {
    if (!user) {
      setToast({ message: 'Du måste vara inloggad!', type: 'error' });
      return;
    }

    // Check object limit for new objects (not edits) – admins have no limit
    if (!editId && !isAdmin) {
      const ownedObjectsCount = objects.filter(o => o.ownerId === user.uid).length;
      const limit = userApproved ? appSettings.approvedObjectLimit : appSettings.defaultObjectLimit;

      if (ownedObjectsCount >= limit) {
        if (!userApproved) {
          setToast({ message: `Du har nått gränsen på ${limit} objekt. Kontakta en administratör för att få ditt konto godkänt och utökat.`, type: 'error' });
        } else {
          setToast({ message: `Du har nått din gräns på ${limit} objekt.`, type: 'error' });
        }
        return;
      }
    }

    setSaving(true);
    try {
      let savedObjectId = editId;

      // Build parent path for breadcrumb display AND ancestor IDs for fast lookups
      const buildAncestorData = (parentId) => {
        if (!parentId) return { parentPath: [], ancestorIds: [] };
        const path = [];
        const ids = [];
        let currentId = parentId;
        let depth = 0;
        while (currentId && depth < 10) {
          const p = objects.find(o => o.id === currentId);
          if (p) {
            const name = p.blocks?.find(b => b.type === 'title')?.data?.text;
            if (name) path.unshift(name);
            ids.unshift(currentId);
            currentId = p.parentId;
          } else {
            break;
          }
          depth++;
        }
        return { parentPath: path, ancestorIds: ids };
      };

      const { parentPath, ancestorIds } = buildAncestorData(objectData.parentId);
      const dataWithPath = { ...objectData, parentPath, ancestorIds };

      // Check if parent has shares with includeChildren – inherit them for new children
      let inheritedShares = {};
      let inheritedSharedWithEmails = [];
      let inheritedAcceptedShareEmails = [];
      let inheritedEditorEmails = [];
      if (!editId && objectData.parentId) {
        const parent = objects.find(o => o.id === objectData.parentId);
        if (parent?.shares) {
          Object.entries(parent.shares).forEach(([emailKey, shareData]) => {
            if (shareData.includeChildren) {
              inheritedShares[emailKey] = {
                ...shareData,
                status: 'inherited',
                includeChildren: false,
                inheritedFrom: objectData.parentId
              };
              if (shareData.email) {
                const emailLower = shareData.email.toLowerCase();
                inheritedSharedWithEmails.push(emailLower);
                inheritedAcceptedShareEmails.push(emailLower);
                if (shareData.role === 'editor') {
                  inheritedEditorEmails.push(emailLower);
                }
              }
            }
          });
        }
      }

      if (editId) {
        // ── EDIT PATH ──────────────────────────────────────────────
        const existingObj = objects.find(o => o.id === editId);
        const parentChanged = existingObj?.parentId !== objectData.parentId;
        const newParentId = objectData.parentId;

        let sharesUpdateData = {};
        if (parentChanged) {
          // Find old inherited shares that need to be removed
          const oldAncestorIds = existingObj?.ancestorIds || [];
          const sharesToRemove = {};
          const emailsToRemove = [];

          if (existingObj?.shares) {
            Object.entries(existingObj.shares).forEach(([emailKey, shareData]) => {
              if (shareData.status === 'inherited' && oldAncestorIds.includes(shareData.inheritedFrom)) {
                sharesToRemove[emailKey] = deleteField();
                if (shareData.email) {
                  emailsToRemove.push(shareData.email.toLowerCase());
                }
              }
            });
          }

          // Find new inherited shares from new parent
          const newInheritedShares = {};
          const newInheritedEmails = [];
          const newInheritedEditorEmails = [];

          if (newParentId) {
            const newParent = objects.find(o => o.id === newParentId);
            if (newParent?.shares) {
              Object.entries(newParent.shares).forEach(([emailKey, shareData]) => {
                if (shareData.includeChildren && (shareData.status === 'accepted' || shareData.status === 'inherited')) {
                  newInheritedShares[emailKey] = {
                    ...shareData,
                    status: 'inherited',
                    includeChildren: false,
                    inheritedFrom: newParentId
                  };
                  if (shareData.email) {
                    const emailLower = shareData.email.toLowerCase();
                    newInheritedEmails.push(emailLower);
                    if (shareData.role === 'editor') {
                      newInheritedEditorEmails.push(emailLower);
                    }
                  }
                }
              });
            }
          }

          // Build the shares update
          Object.keys(sharesToRemove).forEach(key => {
            sharesUpdateData[`shares.${key}`] = deleteField();
          });
          Object.entries(newInheritedShares).forEach(([key, data]) => {
            sharesUpdateData[`shares.${key}`] = data;
          });

          // Update array fields for removed emails
          if (emailsToRemove.length > 0) {
            sharesUpdateData.sharedWithEmails = arrayRemove(...emailsToRemove);
            sharesUpdateData.acceptedShareEmails = arrayRemove(...emailsToRemove);
            sharesUpdateData.editorEmails = arrayRemove(...emailsToRemove);
          }
        }

        // Update existing object
        const updatePayload = { ...dataWithPath, updatedAt: Timestamp.now(), ...sharesUpdateData };
        await updateDoc(doc(db, 'objects', editId), updatePayload);

        // If new inherited emails, add them (separate update to handle arrayUnion after arrayRemove)
        if (parentChanged && newParentId) {
          const newParent = objects.find(o => o.id === newParentId);
          if (newParent?.shares) {
            const emailsToAdd = [];
            const editorEmailsToAdd = [];
            Object.entries(newParent.shares).forEach(([emailKey, shareData]) => {
              if (shareData.includeChildren && (shareData.status === 'accepted' || shareData.status === 'inherited')) {
                if (shareData.email) {
                  emailsToAdd.push(shareData.email.toLowerCase());
                  if (shareData.role === 'editor') {
                    editorEmailsToAdd.push(shareData.email.toLowerCase());
                  }
                }
              }
            });
            if (emailsToAdd.length > 0) {
              const addPayload = {
                sharedWithEmails: arrayUnion(...emailsToAdd),
                acceptedShareEmails: arrayUnion(...emailsToAdd)
              };
              if (editorEmailsToAdd.length > 0) {
                addPayload.editorEmails = arrayUnion(...editorEmailsToAdd);
              }
              await updateDoc(doc(db, 'objects', editId), addPayload);
            }
          }
        }

        // If parent changed, update all descendants' ancestorIds AND shares
        if (parentChanged) {
          const descendants = objects.filter(o => o.ancestorIds?.includes(editId));
          if (descendants.length > 0) {
            const newAncestorBase = [...ancestorIds, editId];
            const oldAncestorIds = existingObj?.ancestorIds || [];

            // Get new inherited shares from the moved object's new ancestor chain
            const newInheritedSharesForDesc = {};
            const newInheritedEmailsForDesc = [];
            const newInheritedEditorEmailsForDesc = [];

            // Check all new ancestors for shares with includeChildren
            for (const ancId of ancestorIds) {
              const ancestor = objects.find(o => o.id === ancId);
              if (ancestor?.shares) {
                Object.entries(ancestor.shares).forEach(([emailKey, shareData]) => {
                  if (shareData.includeChildren && (shareData.status === 'accepted' || shareData.status === 'inherited')) {
                    if (!newInheritedSharesForDesc[emailKey]) {
                      newInheritedSharesForDesc[emailKey] = {
                        ...shareData,
                        status: 'inherited',
                        includeChildren: false,
                        inheritedFrom: ancId
                      };
                      if (shareData.email) {
                        const emailLower = shareData.email.toLowerCase();
                        if (!newInheritedEmailsForDesc.includes(emailLower)) {
                          newInheritedEmailsForDesc.push(emailLower);
                          if (shareData.role === 'editor') {
                            newInheritedEditorEmailsForDesc.push(emailLower);
                          }
                        }
                      }
                    }
                  }
                });
              }
            }

            await Promise.all(descendants.map(async (desc) => {
              const editIdIndex = desc.ancestorIds.indexOf(editId);
              if (editIdIndex !== -1) {
                const descendantSuffix = desc.ancestorIds.slice(editIdIndex + 1);
                const newDescAncestorIds = [...newAncestorBase, ...descendantSuffix];

                // Also rebuild parentPath names
                const newParentPath = [];
                for (const ancId of newDescAncestorIds) {
                  const anc = objects.find(o => o.id === ancId);
                  if (anc) {
                    const name = anc.blocks?.find(b => b.type === 'title')?.data?.text;
                    if (name) newParentPath.push(name);
                  }
                }

                // Build shares update for descendant
                const descSharesUpdate = {};
                const descEmailsToRemove = [];

                // Remove inherited shares from old ancestors
                if (desc.shares) {
                  Object.entries(desc.shares).forEach(([emailKey, shareData]) => {
                    if (shareData.status === 'inherited' && oldAncestorIds.includes(shareData.inheritedFrom)) {
                      descSharesUpdate[`shares.${emailKey}`] = deleteField();
                      if (shareData.email) {
                        descEmailsToRemove.push(shareData.email.toLowerCase());
                      }
                    }
                  });
                }

                // Add new inherited shares
                Object.entries(newInheritedSharesForDesc).forEach(([key, data]) => {
                  descSharesUpdate[`shares.${key}`] = data;
                });

                const descUpdatePayload = {
                  ancestorIds: newDescAncestorIds,
                  parentPath: newParentPath,
                  ...descSharesUpdate
                };

                if (descEmailsToRemove.length > 0) {
                  descUpdatePayload.sharedWithEmails = arrayRemove(...descEmailsToRemove);
                  descUpdatePayload.acceptedShareEmails = arrayRemove(...descEmailsToRemove);
                  descUpdatePayload.editorEmails = arrayRemove(...descEmailsToRemove);
                }

                await updateDoc(doc(db, 'objects', desc.id), descUpdatePayload);

                // Add new emails (separate update)
                if (newInheritedEmailsForDesc.length > 0) {
                  const addPayload = {
                    sharedWithEmails: arrayUnion(...newInheritedEmailsForDesc),
                    acceptedShareEmails: arrayUnion(...newInheritedEmailsForDesc)
                  };
                  if (newInheritedEditorEmailsForDesc.length > 0) {
                    addPayload.editorEmails = arrayUnion(...newInheritedEditorEmailsForDesc);
                  }
                  await updateDoc(doc(db, 'objects', desc.id), addPayload);
                }
              }
            }));
          }
        }
      } else {
        // ── CREATE PATH ────────────────────────────────────────────
        const newObjectData = {
          ...dataWithPath,
          ownerId: user.uid,
          ownerName: user.displayName,
          ownerEmail: user.email,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isCollection: objectData.isCollection || false,
          linkedObjectIds: objectData.linkedObjectIds || [],
          linkedUrls: objectData.linkedUrls || [],
          linkedOrder: objectData.linkedOrder || [],
          whatsappGroupUrl: objectData.whatsappGroupUrl || null,
          // Demo objects: auto-create as demo when admin is in demo mode
          ...(isAdmin && showDemoObjects ? { isDemo: true } : {})
        };

        // Add inherited shares if any
        if (Object.keys(inheritedShares).length > 0) {
          newObjectData.shares = inheritedShares;
          newObjectData.sharedWithEmails = inheritedSharedWithEmails;
          newObjectData.acceptedShareEmails = inheritedAcceptedShareEmails;
          if (inheritedEditorEmails.length > 0) {
            newObjectData.editorEmails = inheritedEditorEmails;
          }
        }

        const addOperation = addDoc(collection(db, 'objects'), newObjectData);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );

        const docRef = await Promise.race([addOperation, timeoutPromise]);
        savedObjectId = docRef.id;
      }

      // Fetch fresh doc and show the saved object
      if (savedObjectId) {
        try {
          const freshDoc = await getDoc(doc(db, 'objects', savedObjectId));
          if (freshDoc.exists()) {
            setSelectedObject({ id: freshDoc.id, ...freshDoc.data() });
          }
        } catch (fetchErr) {
          console.error('Error fetching saved object:', fetchErr);
          const savedObj = objects.find(o => o.id === savedObjectId);
          if (savedObj) {
            setSelectedObject(savedObj);
          }
        }
      }

      return savedObjectId;
    } catch (err) {
      console.error('Save error:', err);
      setToast({ message: err.message === 'Timeout' ? 'Sparningen tog för lång tid. Försök igen.' : 'Kunde inte spara!', type: 'error' });
      return null;
    } finally {
      setSaving(false);
    }
  }, [user, isAdmin, userApproved, appSettings, objects, showDemoObjects, setToast, setSelectedObject]);

  return { saving, saveObject };
}
