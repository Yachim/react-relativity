// https://medium.com/@pdx.lucasm/canvas-with-react-js-32e133c05258
import { useRef, useEffect } from 'react'

export type Draw = (ctx: CanvasRenderingContext2D, frameCnt: number) => void

const useCanvas = (draw: Draw) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas!.getContext('2d')!
    let frameCount = 0
    let animationFrameId: number

    const render = () => {
      frameCount++
      draw(context, frameCount)
      animationFrameId = window.requestAnimationFrame(render)
    }
    render()

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [draw])

  return canvasRef
}

export default useCanvas
