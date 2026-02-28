/**
 * Application Header Component
 *
 * Displays the VoiceTrace branding, centered tab navigation, and theme toggle.
 */
import { Mic, Sun, Moon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Theme, AppTab } from '../types'

interface TabConfig {
  key: AppTab
  label: string
  icon: LucideIcon
}

interface HeaderProps {
  theme: Theme
  onToggle: () => void
  activeTab: AppTab
  onNavigate: (tab: AppTab) => void
  tabs: TabConfig[]
}

export default function Header({ theme, onToggle, activeTab, onNavigate, tabs }: HeaderProps) {
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

      <nav className="header-nav tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => onNavigate(tab.key)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </nav>

      <button className="theme-toggle" onClick={onToggle} aria-label="Toggle theme">
        {theme === 'light' ? <Moon /> : <Sun />}
        {theme === 'light' ? 'Dark' : 'Light'}
      </button>
    </header>
  )
}
