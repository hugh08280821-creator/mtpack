import { useEffect, useState } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
const KEY = 'mtpack:theme'

function read(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

/** 시스템 → 라이트 → 다크 순서로 돈다. index.html의 인라인 스크립트가 첫 화면 깜빡임을 막는다 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(read)

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'system') delete root.dataset.theme
    else root.dataset.theme = mode
    try {
      if (mode === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, mode)
    } catch {
      /* 저장 못 해도 이번 접속 동안은 유지 */
    }
    const sync = () => {
      const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#17171c' : '#ffffff'))
    }
    sync()
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [mode])

  const cycle = () => setMode((m) => (m === 'system' ? 'light' : m === 'light' ? 'dark' : 'system'))
  return { mode, cycle }
}
