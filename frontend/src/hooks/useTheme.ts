/**
 * Custom Hook: useTheme
 * 
 * Manages application theme state with persistence:
 * - Reads from localStorage if previously saved
 * - Falls back to system preference (prefers-color-scheme)
 * - Applies theme to document root element
 * - Provides toggle function to switch themes
 * 
 * Usage: const { theme, toggle } = useTheme()
 */
import { useState, useEffect } from 'react'
import type { Theme } from '../types'

export function useTheme() {
  /**
   * Initialize theme from localStorage or system preference
   * Priority: saved preference > system preference > default to light
   */
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('hte-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    localStorage.setItem('hte-theme', theme)
  }, [theme])

  /** Toggle between light and dark themes */
  const toggle = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))

  return { theme, toggle }
}
