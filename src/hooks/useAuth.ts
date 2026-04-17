/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fUser.uid));
          if (userDoc.exists()) {
            setUser({ id: fUser.uid, ...userDoc.data() } as User);
          } else {
            // Fallback for the first user or missing profile
            // Especially important for the owner/super admin
            setUser({
              id: fUser.uid,
              email: fUser.email || '',
              nama: fUser.displayName || fUser.email?.split('@')[0] || 'User',
              username: fUser.email?.split('@')[0] || 'user',
              level: fUser.email === 'Bambangnurdiann@gmail.com' ? 'super_admin' : 'pegawai',
              nip: '-'
            } as User);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Still allow entry with basic info on error
          setUser({
            id: fUser.uid,
            email: fUser.email || '',
            nama: fUser.email?.split('@')[0] || 'User',
            username: fUser.email?.split('@')[0] || 'user',
            level: 'pegawai',
            nip: '-'
          } as User);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, firebaseUser, loading };
}
