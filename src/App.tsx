import useCanvas, { Draw } from "./utils/canvas"

export default function App() {
  const draw: Draw = (ctx, frameCount) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(50, 100, 20 * Math.sin(frameCount * 0.05) ** 2, 0, 2 * Math.PI)
    ctx.fill()
  }

  const canvasRef = useCanvas(draw)

  return <>
    <select>
    </select>
    <canvas ref={canvasRef} />
  </>
}
