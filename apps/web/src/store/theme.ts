import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  initTheme: () => void
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  resolvedTheme: 'light',

  setTheme: (theme: Theme) => {
    const resolved = theme === 'system' ? getSystemTheme() : theme
    applyTheme(resolved)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('siteaudit-theme', theme)
    }
    set({ theme, resolvedTheme: resolved })
  },

  initTheme: () => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('siteaudit-theme') as Theme | null
    const theme = stored || 'system'
    const resolved = theme === 'system' ? getSystemTheme() : theme
    applyTheme(resolved)
    set({ theme, resolvedTheme: resolved })

    // Listen for system theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', () => {
      const current = get().theme
      if (current === 'system') {
        const newResolved = getSystemTheme()
        applyTheme(newResolved)
        set({ resolvedTheme: newResolved })
      }
    })
  },
}))
