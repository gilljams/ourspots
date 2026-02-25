import { useState, useEffect, useRef, useCallback } from 'react';
import { db, auth, googleProvider } from '../firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider, getRedirectResult } from 'firebase/auth';

/**
 * useAuth – manages all authentication state and profile data.
 *
 * Returns:
 *   user, isAdmin, userApproved, appSettings,
 *   displayName, setDisplayName, sharedContacts, setSharedContacts,
 *   favoriteContacts, setFavoriteContacts,
 *   handleLogin, handleLogout, handleSwitchAccount
 */
export function useAuth(setToast) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userApproved, setUserApproved] = useState(false);
  const [appSettings, setAppSettings] = useState({
    defaultObjectLimit: 5,
    approvedObjectLimit: 100
  });
  const [displayName, setDisplayName] = useState('');
  const [sharedContacts, setSharedContacts] = useState([]);
  const [favoriteContacts, setFavoriteContacts] = useState([]);

  // Tracks initial favorites loaded from Firestore (passed out via return)
  const [initialFavorites, setInitialFavorites] = useState([]);

  const isMountedRef = useRef(true);

  // Auth listener + check admin status + fetch profile
  useEffect(() => {
    isMountedRef.current = true;

    // Handle redirect result (for mobile login)
    getRedirectResult(auth).catch((err) => {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Redirect login error:', err);
      }
    });

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!isMountedRef.current) return;
      setUser(u);

      if (u) {
        try {
          // Fetch app settings
          const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
          if (settingsDoc.exists()) {
            const settingsData = settingsDoc.data();
            setAppSettings({
              defaultObjectLimit: settingsData.defaultObjectLimit ?? 5,
              approvedObjectLimit: settingsData.approvedObjectLimit ?? 100
            });
          }

          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (!isMountedRef.current) return;

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Check if user is blocked
            if (userData?.blocked) {
              setToast({ message: 'Ditt konto har blivit blockerat. Kontakta administratören.', type: 'error' });
              await signOut(auth);
              return;
            }

            if (!isMountedRef.current) return;

            const adminFlag = userData?.isAdmin === true;
            const userApprovedFlag = userData?.approved === true || adminFlag;

            setIsAdmin(adminFlag);
            setUserApproved(userApprovedFlag);
            setInitialFavorites(userData?.favorites || []);
            setDisplayName(userData?.displayName || '');
            setSharedContacts(userData?.sharedContacts || []);
            setFavoriteContacts(userData?.favoriteContacts || []);
          } else {
            if (!isMountedRef.current) return;

            // Create user doc if it doesn't exist
            await setDoc(doc(db, 'users', u.uid), {
              email: u.email,
              isAdmin: false,
              approved: false,
              favorites: [],
              displayName: '',
              sharedContacts: [],
              favoriteContacts: [],
              createdAt: Timestamp.now()
            });
            if (!isMountedRef.current) return;
            setIsAdmin(false);
            setUserApproved(false);
            setInitialFavorites([]);
            setDisplayName('');
            setSharedContacts([]);
            setFavoriteContacts([]);
          }
        } catch (err) {
          console.error('Error fetching user doc:', err);
          if (!isMountedRef.current) return;
          setIsAdmin(false);
          setUserApproved(false);
          setInitialFavorites([]);
        }
      } else {
        setIsAdmin(false);
        setUserApproved(false);
        setInitialFavorites([]);
        setDisplayName('');
        setSharedContacts([]);
        setFavoriteContacts([]);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubAuth();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        console.error('Login error:', err);
        setToast({ message: 'Kunde inte logga in. Försök igen!', type: 'error' });
      }
    }
  }, [setToast]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      // ignore
    }
  }, []);

  const handleSwitchAccount = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        console.error('Switch account error:', err);
        setToast({ message: 'Kunde inte byta konto. Försök igen!', type: 'error' });
      }
    }
  }, [setToast]);

  return {
    user,
    isAdmin,
    userApproved,
    appSettings,
    displayName,
    setDisplayName,
    sharedContacts,
    setSharedContacts,
    favoriteContacts,
    setFavoriteContacts,
    initialFavorites,
    handleLogin,
    handleLogout,
    handleSwitchAccount
  };
}
