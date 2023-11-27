import { useState } from "react"
import UnitInput from "./UnitInput"
import useCanvas, { Draw } from "./utils/canvas"
import { BlockMath, InlineMath } from 'react-katex'

export default function App() {
  const draw: Draw = (ctx, frameCount) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, 15, 0, 2 * Math.PI)
    ctx.fill()
  }

  const canvasRef = useCanvas(draw)

  const [weight, setWeight] = useState(0)

  return <>
    <p>Geodesic equation:</p>
    <BlockMath math={String.raw`\frac{d^2 x^a}{d \lambda} + \Gamma^a_{bc} \frac{dx^b}{d \lambda} \frac{dx^c}{d \lambda} = 0`} />
    <BlockMath math={String.raw`\frac{d^2 x^a}{d \lambda} = - \Gamma^a_{bc} \frac{dx^b}{d \lambda} \frac{dx^c}{d \lambda}`} />

    <p>
      Setting <InlineMath math={String.raw`V^a = \frac{dx^a}{d\lambda}`} />, we can create system of DEs:
    </p>
    <BlockMath math={String.raw`\frac{dx^a}{d\lambda} = V^a`} />
    <BlockMath math={String.raw`\frac{dV^a}{d\lambda} = - \Gamma^a_{bc} V^b V^c`} />

    <p>Using Euler method we get</p>
    <BlockMath math={String.raw`x^a_{n+1} = x^a_n + h V^a_n`} />
    <BlockMath math={String.raw`V^a_{n+1} = V^a_n - h \Gamma^a_{bc(n)} V^b_n V^c_n`} />

    <UnitInput origin="si" si={[["kg", 1]]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={weight} setValue={setWeight} />

    <canvas ref={canvasRef} width="600" height="450" className="border" />
  </>
}
