import { useState } from 'react'
import CellularAutomata from './CellularAutomata'
import TerminalTyping from './TerminalTyping'

const DOWNLOAD_URLS = {
  mac: 'https://github.com/YOUR_USERNAME/bridge/releases/latest/download/Bridge_universal.dmg',
  windows: 'https://github.com/YOUR_USERNAME/bridge/releases/latest/download/Bridge_x64_setup.exe',
  linux: 'https://github.com/YOUR_USERNAME/bridge/releases/latest/download/Bridge_amd64.AppImage'
}

function App() {
  const [os, setOs] = useState<'mac' | 'windows' | 'linux'>(() => {
    const platform = navigator.platform.toLowerCase()
    if (platform.includes('mac')) return 'mac'
    if (platform.includes('win')) return 'windows'
    return 'linux'
  })

  const downloadUrl = DOWNLOAD_URLS[os]

  return (
    <div className="h-screen overflow-hidden bg-slate-900 text-white relative flex flex-col">
      <CellularAutomata />
      <nav className="border-b border-slate-700/50 backdrop-blur-sm relative z-10 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Bridge
            </h1>
            <a
              href="https://github.com/YOUR_USERNAME/bridge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex items-center justify-center">
        <section className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Task Management for<br />Parallel Work Streams
            </h2>
            <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed">
              Desktop app for managing multiple tracks of work. Keep your main focus clear while handling side projects, without context-switching chaos.
            </p>

            <div className="flex flex-col items-center gap-6">
              <div className="flex gap-4 items-center">
                <button
                  onClick={() => setOs('mac')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    os === 'mac'
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  macOS
                </button>
                <button
                  onClick={() => setOs('windows')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    os === 'windows'
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Windows
                </button>
                <button
                  onClick={() => setOs('linux')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    os === 'linux'
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Linux
                </button>
              </div>

              <a
                href={downloadUrl}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download for {os === 'mac' ? 'macOS' : os === 'windows' ? 'Windows' : 'Linux'}
              </a>

              <p className="text-sm text-slate-400">
                Free • Open Source • Local-First
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-700/50 relative z-10 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-sm">
            <TerminalTyping />
            <div className="flex gap-6">
              <a href="https://github.com/YOUR_USERNAME/bridge" className="hover:text-white transition-colors">
                GitHub
              </a>
              <a href="https://github.com/YOUR_USERNAME/bridge/releases" className="hover:text-white transition-colors">
                Releases
              </a>
              <a href="https://github.com/YOUR_USERNAME/bridge/issues" className="hover:text-white transition-colors">
                Issues
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
