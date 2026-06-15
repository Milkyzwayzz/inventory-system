import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export const useFirestore = (collectionName) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let fallbackUnsub = null;
    const q = query(
      collection(db, collectionName),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setData(
        snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );
      setLoading(false);
    }, () => {
      fallbackUnsub = onSnapshot(collection(db, collectionName), (snapshot) => {
        const rows = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => {
          const at = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
          const bt = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
          return bt - at;
        });
        setData(rows);
        setLoading(false);
      });
    });

    return () => {
      unsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  }, [collectionName]);

  const add = async (data) => {
    return await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),   // ✅ FIXED
      updatedAt: serverTimestamp()
    });
  };

  const update = async (id, data) => {
    return await updateDoc(doc(db, collectionName, id), {
      ...data,
      updatedAt: serverTimestamp()
    });
  };

  const remove = async (id) => {
    return await deleteDoc(doc(db, collectionName, id));
  };

  return { data, loading, add, update, remove };
};
