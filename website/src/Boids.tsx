import { useEffect, useRef } from 'react'

interface Boid {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  track: number
}

const COLORS = [
  'rgba(20, 184, 166, 0.8)',  // teal (main track)
  'rgba(34, 211, 238, 0.7)',   // cyan
  'rgba(99, 102, 241, 0.7)',   // indigo
  'rgba(168, 85, 247, 0.6)',   // purple
]

export default function Boids() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const boids: Boid[] = []
    const NUM_BOIDS = 80
    const BOID_SIZE = 3
    const MAX_SPEED = 1.5
    const PERCEPTION_RADIUS = 60
    const SEPARATION_RADIUS = 25

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Initialize boids in clusters (different tracks)
    for (let i = 0; i < NUM_BOIDS; i++) {
      const track = Math.floor(i / (NUM_BOIDS / 4))
      const clusterX = (track % 2) * canvas.width * 0.6 + canvas.width * 0.2
      const clusterY = Math.floor(track / 2) * canvas.height * 0.6 + canvas.height * 0.2

      boids.push({
        x: clusterX + (Math.random() - 0.5) * 100,
        y: clusterY + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * MAX_SPEED,
        vy: (Math.random() - 0.5) * MAX_SPEED,
        color: COLORS[track],
        track
      })
    }

    const distance = (b1: Boid, b2: Boid) => {
      const dx = b1.x - b2.x
      const dy = b1.y - b2.y
      return Math.sqrt(dx * dx + dy * dy)
    }

    const updateBoid = (boid: Boid) => {
      let separationX = 0
      let separationY = 0
      let alignmentX = 0
      let alignmentY = 0
      let cohesionX = 0
      let cohesionY = 0
      let nearbyCount = 0
      let separationCount = 0

      // Check neighbors
      for (const other of boids) {
        if (other === boid) continue

        const dist = distance(boid, other)

        // Separation - avoid crowding
        if (dist < SEPARATION_RADIUS && dist > 0) {
          separationX += (boid.x - other.x) / dist
          separationY += (boid.y - other.y) / dist
          separationCount++
        }

        // Alignment and cohesion - only with same track
        if (dist < PERCEPTION_RADIUS && boid.track === other.track) {
          alignmentX += other.vx
          alignmentY += other.vy
          cohesionX += other.x
          cohesionY += other.y
          nearbyCount++
        }
      }

      // Apply forces
      if (separationCount > 0) {
        boid.vx += separationX * 0.05
        boid.vy += separationY * 0.05
      }

      if (nearbyCount > 0) {
        alignmentX /= nearbyCount
        alignmentY /= nearbyCount
        boid.vx += (alignmentX - boid.vx) * 0.03
        boid.vy += (alignmentY - boid.vy) * 0.03

        cohesionX /= nearbyCount
        cohesionY /= nearbyCount
        boid.vx += (cohesionX - boid.x) * 0.005
        boid.vy += (cohesionY - boid.y) * 0.005
      }

      // Limit speed
      const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy)
      if (speed > MAX_SPEED) {
        boid.vx = (boid.vx / speed) * MAX_SPEED
        boid.vy = (boid.vy / speed) * MAX_SPEED
      }

      // Update position
      boid.x += boid.vx
      boid.y += boid.vy

      // Wrap around edges
      if (boid.x < 0) boid.x = canvas.width
      if (boid.x > canvas.width) boid.x = 0
      if (boid.y < 0) boid.y = canvas.height
      if (boid.y > canvas.height) boid.y = 0
    }

    const drawBoid = (boid: Boid) => {
      const angle = Math.atan2(boid.vy, boid.vx)

      ctx.save()
      ctx.translate(boid.x, boid.y)
      ctx.rotate(angle)

      // Draw triangle pointing in direction of movement
      ctx.fillStyle = boid.color
      ctx.beginPath()
      ctx.moveTo(BOID_SIZE * 2, 0)
      ctx.lineTo(-BOID_SIZE, BOID_SIZE)
      ctx.lineTo(-BOID_SIZE, -BOID_SIZE)
      ctx.closePath()
      ctx.fill()

      // Draw trail
      ctx.strokeStyle = boid.color
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-boid.vx * 3, -boid.vy * 3)
      ctx.stroke()

      ctx.restore()
    }

    const drawConnections = () => {
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.1)'
      ctx.lineWidth = 0.5

      for (let i = 0; i < boids.length; i++) {
        for (let j = i + 1; j < boids.length; j++) {
          const dist = distance(boids[i], boids[j])
          if (dist < PERCEPTION_RADIUS && boids[i].track === boids[j].track) {
            const alpha = (1 - dist / PERCEPTION_RADIUS) * 0.15
            ctx.strokeStyle = `rgba(20, 184, 166, ${alpha})`
            ctx.beginPath()
            ctx.moveTo(boids[i].x, boids[i].y)
            ctx.lineTo(boids[j].x, boids[j].y)
            ctx.stroke()
          }
        }
      }
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      drawConnections()

      for (const boid of boids) {
        updateBoid(boid)
        drawBoid(boid)
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    // Initial clear
    ctx.fillStyle = 'rgb(15, 23, 42)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="relative -my-32 z-0">
      <canvas
        ref={canvasRef}
        className="w-full h-[600px] opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-transparent to-slate-900 pointer-events-none" />
    </div>
  )
}
