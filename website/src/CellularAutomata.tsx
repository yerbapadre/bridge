import { useEffect, useRef } from 'react'

export default function CellularAutomata() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const CELL_SIZE = 4
    let cols: number
    let rows: number
    let grid: number[][]
    let nextGrid: number[][]
    let generation = 0
    let lastUpdate = 0
    const UPDATE_INTERVAL = 150 // Update every 150ms for visible animation

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      cols = Math.floor(canvas.width / CELL_SIZE)
      rows = Math.floor(canvas.height / CELL_SIZE)

      console.log(`Canvas initialized: ${canvas.width}x${canvas.height}, Grid: ${cols}x${rows}`)

      // Initialize grids
      grid = Array(rows).fill(null).map(() => Array(cols).fill(0))
      nextGrid = Array(rows).fill(null).map(() => Array(cols).fill(0))

      // Seed patterns in different areas of the screen
      const seedAreas = [
        // Upper left
        { baseX: Math.floor(cols * 0.2), baseY: Math.floor(rows * 0.2) },
        // Middle right
        { baseX: Math.floor(cols * 0.75), baseY: Math.floor(rows * 0.5) },
        // Lower left
        { baseX: Math.floor(cols * 0.25), baseY: Math.floor(rows * 0.75) },
      ]

      const patternTypes = [
        // Acorn pattern
        [[0, 1, 0, 0, 0, 0, 0], [0, 0, 0, 1, 0, 0, 0], [1, 1, 0, 0, 1, 1, 1]],
        // Glider
        [[0, 1, 0], [0, 0, 1], [1, 1, 1]],
        // R-pentomino (very active)
        [[0, 1, 1], [1, 1, 0], [0, 1, 0]],
      ]

      seedAreas.forEach((area, idx) => {
        // Add some randomness to the position within the area
        const randomX = Math.floor((Math.random() - 0.5) * 30)
        const randomY = Math.floor((Math.random() - 0.5) * 30)
        const pattern = patternTypes[idx % patternTypes.length]

        for (let i = 0; i < pattern.length; i++) {
          for (let j = 0; j < pattern[i].length; j++) {
            const row = area.baseY + randomY - Math.floor(pattern.length / 2) + i
            const col = area.baseX + randomX - Math.floor(pattern[0].length / 2) + j
            if (row >= 0 && row < rows && col >= 0 && col < cols) {
              grid[row][col] = pattern[i][j]
            }
          }
        }
      })

      generation = 0
      lastUpdate = 0
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

      // Add occasional random seeds to keep it alive in different areas
      if (generation % 80 === 0) {
        const areas = [
          { x: cols * 0.2, y: rows * 0.2 },
          { x: cols * 0.75, y: rows * 0.5 },
          { x: cols * 0.25, y: rows * 0.75 },
        ]
        const area = areas[Math.floor(Math.random() * areas.length)]
        const seedX = Math.floor(area.x + (Math.random() - 0.5) * 40)
        const seedY = Math.floor(area.y + (Math.random() - 0.5) * 40)

        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const row = seedY + i
            const col = seedX + j
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
      let cellCount = 0
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (grid[row][col] === 1) {
            cellCount++
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

            // Color gradient: teal → cyan → amber → indigo → purple
            let r, g, b
            if (distanceRatio < 0.25) {
              // Teal to cyan
              const t = distanceRatio / 0.25
              r = Math.floor(20 + (34 - 20) * t)
              g = Math.floor(184 + (211 - 184) * t)
              b = Math.floor(166 + (238 - 166) * t)
            } else if (distanceRatio < 0.5) {
              // Cyan to amber/orange
              const t = (distanceRatio - 0.25) / 0.25
              r = Math.floor(34 + (251 - 34) * t)
              g = Math.floor(211 + (191 - 211) * t)
              b = Math.floor(238 + (36 - 238) * t)
            } else if (distanceRatio < 0.75) {
              // Amber to indigo
              const t = (distanceRatio - 0.5) / 0.25
              r = Math.floor(251 + (99 - 251) * t)
              g = Math.floor(191 + (102 - 191) * t)
              b = Math.floor(36 + (241 - 36) * t)
            } else {
              // Indigo to purple
              const t = (distanceRatio - 0.75) / 0.25
              r = Math.floor(99 + (168 - 99) * t)
              g = Math.floor(102 + (85 - 102) * t)
              b = Math.floor(241 + (247 - 241) * t)
            }

            // Add glow effect first
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.08)`
            ctx.fillRect(x - 1, y - 1, CELL_SIZE + 2, CELL_SIZE + 2)

            // Draw main cell
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
          }
        }
      }

      // Debug log every 60 frames
      if (generation % 60 === 0 && cellCount > 0) {
        console.log(`Generation ${generation}: ${cellCount} cells alive`)
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
