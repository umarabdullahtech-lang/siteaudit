'use client'

import { useEffect } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useThemeStore } from '@/store/theme'

export function ThemeToggle() {
  const { theme, setTheme, initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ]

  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
            theme === opt.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          title={opt.label}
        >
          <opt.icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
