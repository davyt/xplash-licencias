import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'

export function useRole() {
  const [role, setRole] = useState(null)
  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user) { setRole('marketing'); return }
      try {
        const result = await user.getIdTokenResult()
        setRole(result.claims.role || 'marketing')
      } catch {
        setRole('marketing')
      }
    })
  }, [])
  return role
}
