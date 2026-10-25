import { useEffect, useRef, useState } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme ?? 'dark',
  )
  const explicit = useRef(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    try {
      const saved = localStorage.getItem('verzel-theme')
      explicit.current = saved === 'light' || saved === 'dark'
    } catch {
      // Keep the system fallback when storage is unavailable.
    }
    const followSystem = () => {
      if (!explicit.current) {
        const next = media.matches ? 'dark' : 'light'
        document.documentElement.dataset.theme = next
        setTheme(next)
      }
    }
    media.addEventListener('change', followSystem)
    return () => {
      media.removeEventListener('change', followSystem)
    }
  }, [])

  function toggle() {
    explicit.current = true
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    setTheme(next)
    try {
      localStorage.setItem('verzel-theme', next)
    } catch {
      // The selection remains usable for this page even without storage.
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Tema escuro"
      aria-pressed={theme === 'dark'}
      onClick={toggle}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        {theme === 'dark' ? (
          <path d="M20.5 14a8.5 8.5 0 0 1-10.5-10.5A8.5 8.5 0 1 0 20.5 14Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
          </>
        )}
      </svg>
    </button>
  )
}
