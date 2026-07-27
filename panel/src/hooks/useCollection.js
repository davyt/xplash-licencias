import { useState, useEffect, useRef } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export function useCollection(collectionName, constraints) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const constraintsRef = useRef(constraints)

  useEffect(() => {
    const ref = constraintsRef.current?.length
      ? query(collection(db, collectionName), ...constraintsRef.current)
      : collection(db, collectionName)
    return onSnapshot(
      ref,
      snap => { setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      err  => { console.error(`useCollection(${collectionName}):`, err); setLoading(false) }
    )
  }, [collectionName])

  return [docs, loading]
}
