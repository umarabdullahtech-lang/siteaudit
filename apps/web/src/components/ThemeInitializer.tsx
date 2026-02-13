'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/store/theme'

export function ThemeInitializer() {
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return null
}
