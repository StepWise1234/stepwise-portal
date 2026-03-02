import { useEffect, useRef } from 'react'

interface AnimatedGridBackgroundProps {
  className?: string
}

export function AnimatedGridBackground({ className = '' }: AnimatedGridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    const squares: { x: number; y: number; opacity: number; fadeIn: boolean; speed: number }[] = []
    const gridSize = 40
    const numSquares = 30

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const initSquares = () => {
      squares.length = 0
      const cols = Math.ceil(canvas.width / gridSize)
      const rows = Math.ceil(canvas.height / gridSize)

      for (let i = 0; i < numSquares; i++) {
        squares.push({
          x: Math.floor(Math.random() * cols) * gridSize,
          y: Math.floor(Math.random() * rows) * gridSize,
          opacity: Math.random() * 0.08,
          fadeIn: Math.random() > 0.5,
          speed: 0.0005 + Math.random() * 0.001
        })
      }
    }

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw grid lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)'
      ctx.lineWidth = 1

      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, canvas.height)
        ctx.stroke()
      }

      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(canvas.width, y + 0.5)
        ctx.stroke()
      }

      // Draw animated squares
      const cols = Math.ceil(canvas.width / gridSize)
      const rows = Math.ceil(canvas.height / gridSize)

      squares.forEach((sq) => {
        // Update opacity
        if (sq.fadeIn) {
          sq.opacity += sq.speed
          if (sq.opacity >= 0.08) {
            sq.fadeIn = false
          }
        } else {
          sq.opacity -= sq.speed
          if (sq.opacity <= 0) {
            sq.fadeIn = true
            sq.x = Math.floor(Math.random() * cols) * gridSize
            sq.y = Math.floor(Math.random() * rows) * gridSize
          }
        }

        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, sq.opacity)})`
        ctx.fillRect(sq.x + 1, sq.y + 1, gridSize - 2, gridSize - 2)
      })

      animationId = requestAnimationFrame(drawGrid)
    }

    resize()
    initSquares()
    drawGrid()

    window.addEventListener('resize', () => {
      resize()
      initSquares()
    })

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
