import { useEffect, useRef } from 'react'

export default function CellularAutomata() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const CELL_SIZE = 12
    let cols: number
    let rows: number
    let grid: number[][]
    let nextGrid: number[][]
    let generation = 0
    let lastUpdate = 0
    const UPDATE_INTERVAL = 100 // Update every 100ms for visible animation

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      cols = Math.floor(canvas.width / CELL_SIZE)
      rows = Math.floor(canvas.height / CELL_SIZE)

      // Initialize grids
      grid = Array(rows).fill(null).map(() => Array(cols).fill(0))
      nextGrid = Array(rows).fill(null).map(() => Array(cols).fill(0))

      // Seed the center with a pattern
      const centerX = Math.floor(cols / 2)
      const centerY = Math.floor(rows / 2)

      // Create a better starting pattern - Acorn (grows for 5000+ generations)
      const pattern = [
        [0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0],
        [1, 1, 0, 0, 1, 1, 1],
      ]

      for (let i = 0; i < pattern.length; i++) {
        for (let j = 0; j < pattern[i].length; j++) {
          const row = centerY - Math.floor(pattern.length / 2) + i
          const col = centerX - Math.floor(pattern[0].length / 2) + j
          if (row >= 0 && row < rows && col >= 0 && col < cols) {
            grid[row][col] = pattern[i][j]
          }
        }
      }

      generation = 0
    }

    resize()
    window.addEventListener('resize', resize)

    const countNeighbors = (row: number, col: number): number => {
      let count = 0
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue
          const newRow = (row + i + rows) % rows
          const newCol = (col + j + cols) % cols
          count += grid[newRow][newCol]
        }
      }
      return count
    }

    const update = () => {
      // Conway's Game of Life rules
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const neighbors = countNeighbors(row, col)
          const current = grid[row][col]

          if (current === 1) {
            // Cell is alive
            if (neighbors < 2 || neighbors > 3) {
              nextGrid[row][col] = 0 // Dies
            } else {
              nextGrid[row][col] = 1 // Survives
            }
          } else {
            // Cell is dead
            if (neighbors === 3) {
              nextGrid[row][col] = 1 // Birth
            } else {
              nextGrid[row][col] = 0 // Stays dead
            }
          }
        }
      }

      // Swap grids
      [grid, nextGrid] = [nextGrid, grid]
      generation++

      // Add occasional random seeds to keep it alive
      if (generation % 50 === 0) {
        const centerX = Math.floor(cols / 2) + (Math.random() - 0.5) * 20
        const centerY = Math.floor(rows / 2) + (Math.random() - 0.5) * 20
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const row = Math.floor(centerY + i)
            const col = Math.floor(centerX + j)
            if (row >= 0 && row < rows && col >= 0 && col < cols) {
              if (Math.random() > 0.5) {
                grid[row][col] = 1
              }
            }
          }
        }
      }
    }

    const draw = () => {
      // Clear with page background color
      ctx.fillStyle = 'rgb(15, 23, 42)' // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw cells
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (grid[row][col] === 1) {
            const x = col * CELL_SIZE
            const y = row * CELL_SIZE

            // Calculate distance from center for color gradient
            const centerX = cols / 2
            const centerY = rows / 2
            const dx = col - centerX
            const dy = row - centerY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)
            const distanceRatio = distance / maxDistance

            // Color gradient from teal to cyan to purple
            let r, g, b
            if (distanceRatio < 0.33) {
              // Teal to cyan
              const t = distanceRatio / 0.33
              r = Math.floor(20 + (34 - 20) * t)
              g = Math.floor(184 + (211 - 184) * t)
              b = Math.floor(166 + (238 - 166) * t)
            } else if (distanceRatio < 0.66) {
              // Cyan to indigo
              const t = (distanceRatio - 0.33) / 0.33
              r = Math.floor(34 + (99 - 34) * t)
              g = Math.floor(211 + (102 - 211) * t)
              b = Math.floor(238 + (241 - 238) * t)
            } else {
              // Indigo to purple
              const t = (distanceRatio - 0.66) / 0.34
              r = Math.floor(99 + (168 - 99) * t)
              g = Math.floor(102 + (85 - 102) * t)
              b = Math.floor(241 + (247 - 241) * t)
            }

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`
            ctx.fillRect(x, y, CELL_SIZE - 1, CELL_SIZE - 1)

            // Add glow effect
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`
            ctx.fillRect(x - 2, y - 2, CELL_SIZE + 3, CELL_SIZE + 3)
          }
        }
      }
    }

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdate > UPDATE_INTERVAL) {
        update()
        lastUpdate = timestamp
      }
      draw()
      animationFrameId = requestAnimationFrame(animate)
    }

    // Start animation immediately
    animationFrameId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10"
    />
  )
}
