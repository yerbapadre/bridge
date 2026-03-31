import { useEffect, useState } from 'react'

export default function TerminalTyping() {
  const [displayText, setDisplayText] = useState('')
  const [cursorVisible, setCursorVisible] = useState(true)
  const [phase, setPhase] = useState<'blink1' | 'blink2' | 'typing'>('blink1')
  const [isHovered, setIsHovered] = useState(false)
  const [copied, setCopied] = useState(false)

  const fullText = 'brew tap yerbapadre/bridge && brew install --cask bridge'

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText('brew tap yerbapadre/bridge\nbrew install --cask bridge')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  useEffect(() => {
    let timeout: number

    if (phase === 'blink1') {
      // First blink phase - blink cursor twice
      let blinkCount = 0
      const blinkInterval = setInterval(() => {
        setCursorVisible(v => !v)
        blinkCount++
        if (blinkCount >= 4) { // 2 full blinks (on-off-on-off)
          clearInterval(blinkInterval)
          setCursorVisible(true)
          setPhase('blink2')
        }
      }, 400)
      return () => clearInterval(blinkInterval)
    }

    if (phase === 'blink2') {
      // Short pause before typing
      timeout = setTimeout(() => {
        setPhase('typing')
      }, 300)
      return () => clearTimeout(timeout)
    }

    if (phase === 'typing') {
      // Typing phase
      if (displayText.length < fullText.length) {
        timeout = setTimeout(() => {
          setDisplayText(fullText.slice(0, displayText.length + 1))
        }, 80 + Math.random() * 60) // Random typing speed for natural feel
      } else {
        // After typing is done, blink cursor continuously
        const blinkInterval = setInterval(() => {
          setCursorVisible(v => !v)
        }, 530)
        return () => clearInterval(blinkInterval)
      }
    }

    return () => clearTimeout(timeout)
  }, [phase, displayText, fullText])

  return (
    <>
      <div
        className="font-mono text-sm text-slate-400 flex items-center gap-0 cursor-pointer transition-colors hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-800/50"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        <span className="text-teal-400">$</span>
        <span className="ml-2">{displayText}</span>
        <span
          className={`inline-block w-2 h-4 ml-0.5 bg-teal-400 ${
            cursorVisible || isHovered ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-100`}
        />
      </div>

      {copied && (
        <div className="fixed bottom-6 right-6 bg-slate-800 border border-teal-500/30 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-slide-up z-50">
          <svg
            className="w-5 h-5 text-teal-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm">Copied to clipboard!</span>
        </div>
      )}
    </>
  )
}
