'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store'

export function AuthHydrator() {
  const { user, fetchMe } = useAuthStore()

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tratto_token') : null
    if (token && !user) fetchMe()
  }, [])

  return null
}
