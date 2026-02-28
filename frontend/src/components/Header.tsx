import { Mic, Sun, Moon } from 'lucide-react'
import type { Theme } from '../types'

interface HeaderProps {
  theme: Theme
  onToggle: () => void
}

export default function Header({ theme, onToggle }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">
          <Mic />
        </div>
        <div>
          <div className="header-title">VoiceTrace</div>
          <div className="header-subtitle">AI Transcription</div>
        </div>
      </div>

      <button className="theme-toggle" onClick={onToggle} aria-label="Toggle theme">
        {theme === 'light' ? <Moon /> : <Sun />}
        {theme === 'light' ? 'Dark' : 'Light'}
      </button>
    </header>
  )
}
