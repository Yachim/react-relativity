import { useEffect, useMemo, useState } from "react"
import UnitInput, { PlanckUnits, SiUnits, UnitVector, convertValue, makeUnit } from "./UnitInput"
import useCanvas, { Draw } from "./utils/canvas"
import { BlockMath, InlineMath } from 'react-katex'
import { schwarzschild } from "./utils/metrics"
import { setArrayState } from "./utils/utils"

const metric = schwarzschild

const distanceUnitTextSi = makeUnit([["m", 1]] as [SiUnits, number][])
const distanceUnitTextPlanck = makeUnit([["c", -1.5], ["G", 0.5], ["h", 0.5]] as [PlanckUnits, number][])
const distanceVectorPlanck = [-1.5, 0.5, 0.5, 0, 0] as UnitVector

const velocityUnitTextSi = makeUnit([["m", 1], ["s", -1]] as [SiUnits, number][])
const velocityUnitTextPlanck = makeUnit([["c", 1]] as [PlanckUnits, number][])
const velocityVectorPlanck = [1, 0, 0, 0, 0] as UnitVector

const scaleDiff = 10 // divided/multiplied
const particleSize = 10

export default function App() {
  const [weight, setWeight] = useState(0)

  const schwarzschildRadius = useMemo(() => 2 * weight, [weight])
  const schwarzschildRadiusSi = useMemo(() => convertValue(schwarzschildRadius, distanceVectorPlanck, "toSi"), [schwarzschildRadius])

  const [initialCoordinates, setInitialCoordinates] = useState([
    0,
    0,
    Math.PI / 2,
    0,
  ])

  const [initialVelocity, setInitialVelocity] = useState([
    0,
    0,
    0,
    0,
  ])

  const initialVelocitySize = useMemo(() => {
    const metricTensor = metric.metric({
      r: initialCoordinates[1],
      rs: schwarzschildRadius,
      theta: initialCoordinates[2]
    })

    let sum = 0
    initialVelocity.forEach((a, aI) =>
      initialVelocity.forEach((b, bI) =>
        sum += a * b * metricTensor[aI][bI]
      )
    )

    return sum
  }, [initialVelocity, schwarzschildRadius, initialCoordinates])
  const initialVelocitySizeSi = useMemo(() => convertValue(initialVelocitySize, velocityVectorPlanck, "toSi"), [initialVelocitySize])

  const [scaleSi, setScaleSi] = useState(10) // 1 pixel = 1 m
  const scalePlanck = useMemo(() => convertValue(scaleSi, distanceVectorPlanck, "toPlanck"), [scaleSi])

  const [coordinates, setCoordinates] = useState([...initialCoordinates])
  const [velocity, setVelocity] = useState([...initialVelocity])

  useEffect(() => {
    setCoordinates([...initialCoordinates])
  }, [initialCoordinates])

  useEffect(() => {
    setVelocity([...initialVelocity])
  }, [initialVelocity])

  const [playing, setPlaying] = useState(false)

  const [frequency, setFrequency] = useState(30)
  const period = useMemo(() => 1 / frequency, [frequency])

  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      const christoffel = metric.christoffel({
        r: coordinates[1],
        rs: schwarzschildRadius,
        m: weight,
        theta: coordinates[2],
      })

      const newCoordinates = coordinates.map((coord, i) =>
        coord + period * velocity[i])

      const newVelocity = velocity.map((vel, a) => {
        let gammaTotal = 0
        christoffel[a].forEach((cRow, b) =>
          cRow.forEach((gamma, c) => gammaTotal += gamma * velocity[b] * velocity[c])
        )
        return vel - gammaTotal
      })

      setCoordinates([...newCoordinates])
      setVelocity([...newVelocity])
    })

    return () => clearInterval(interval)
  }, [coordinates, velocity, period, playing, schwarzschildRadius, weight])

  // assuming view from top and theta initialCoordinates[2] = pi/2
  // TODO: theta
  const draw: Draw = (ctx, frameCount) => {
    const blackHoleX = ctx.canvas.width / 2
    const blackHoleY = ctx.canvas.height / 2

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(blackHoleX, blackHoleY, schwarzschildRadius / scalePlanck, 0, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()

    const x = (coordinates[1] * Math.cos(coordinates[3])) / scalePlanck
    const y = (coordinates[1] * Math.sin(coordinates[3])) / scalePlanck

    ctx.beginPath()
    ctx.fillStyle = "#6bdb77"
    ctx.arc(blackHoleX + x, blackHoleY + y, particleSize, 0, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()
  }

  const canvasRef = useCanvas(draw)

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

    <p>Weight</p>
    <UnitInput origin="si" si={[["kg", 1]]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={weight} setValue={setWeight} />

    <p>Schwarzschild radius <InlineMath math={`r_s = ${schwarzschildRadius} ${distanceUnitTextPlanck} = ${schwarzschildRadiusSi} ${distanceUnitTextSi}`} /></p>

    <p>Initial coordinates</p>
    <UnitInput origin="si" si={[["m", 1]]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={initialCoordinates[1]} setValue={value => setArrayState(setInitialCoordinates, value, 1)} />
    <UnitInput origin="si" si={[]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={initialCoordinates[2]} setValue={value => setArrayState(setInitialCoordinates, value, 2)} />
    <UnitInput origin="si" si={[]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={initialCoordinates[3]} setValue={value => setArrayState(setInitialCoordinates, value, 3)} />

    {/* TODO: units? */}
    <p>Initial velocity, <InlineMath math={String.raw`|V_0| = V^a_0 V^b_0 g_{ab} = ${initialVelocitySize} ${velocityUnitTextPlanck} = ${initialVelocitySizeSi} ${velocityUnitTextSi}`} /></p>
    <UnitInput origin="si" si={[["m", 1], ["s", -1]]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={initialVelocity[1]} setValue={value => setArrayState(setInitialVelocity, value, 1)} />
    <UnitInput origin="si" si={[["s", -1]]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={initialVelocity[2]} setValue={value => setArrayState(setInitialVelocity, value, 2)} />
    <UnitInput origin="si" si={[["s", -1]]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={initialVelocity[3]} setValue={value => setArrayState(setInitialVelocity, value, 3)} />

    <label>
      Frequency:{" "}
      <input type="number" value={frequency} onChange={e => setFrequency(+e.target.value)} /> Hz
    </label>

    <div>
      <button onClick={() => setPlaying(prev => !prev)}>{playing ? "||" : ">"}</button>
      <button onClick={() => {
        setCoordinates([...initialCoordinates])
        setVelocity([...initialVelocity])
      }}>reset</button>
    </div>

    <div>
      <p>Coordinates: ({coordinates[0]}, {coordinates[1]}, {coordinates[2]}, {coordinates[3]})</p>
      <p>Velocity: ({velocity[0]}, {velocity[1]}, {velocity[2]}, {velocity[3]})</p>
    </div>

    <canvas ref={canvasRef} width="600" height="450" className="border" />
    <button onClick={() => setScaleSi(prev => prev / scaleDiff)}>+</button> <button onClick={() => setScaleSi(prev => prev * scaleDiff)}>-</button>
    <InlineMath math={`1 pixel = ${scalePlanck} ${distanceUnitTextPlanck} = ${scaleSi} ${distanceUnitTextSi}`} />
  </>
}
