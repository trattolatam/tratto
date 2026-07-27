'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store'

export function AuthHydrator() {
  const { user, authChecked, fetchMe } = useAuthStore()

  useEffect(() => {
    // Si ya hay un usuario en memoria (no venimos de un reload) o ya se chequeó
    // antes, no hace falta pedir /me de nuevo.
    if (user || authChecked) return
    fetchMe()
  }, [])

  return null
}
