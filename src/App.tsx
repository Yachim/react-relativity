import { useEffect, useMemo, useState } from "react"
import UnitInput, { PlanckUnits, SiUnits, UnitVector, convertValue, makeUnit } from "./UnitInput"
import useCanvas, { Draw } from "./utils/canvas"
import { BlockMath, InlineMath } from 'react-katex'
import { schwarzschild } from "./utils/metrics"
import { setArrayState } from "./utils/utils"

const distanceUnitTextSi = makeUnit([["m", 1]] as [SiUnits, number][])
const distanceUnitTextPlanck = makeUnit([["c", -1.5], ["G", 0.5], ["h", 0.5]] as [PlanckUnits, number][])
const distanceVectorPlanck = [-1.5, 0.5, 0.5, 0, 0] as UnitVector

const velocityUnitTextSi = makeUnit([["m", 1], ["s", -1]] as [SiUnits, number][])
const velocityUnitTextPlanck = makeUnit([["c", 1]] as [PlanckUnits, number][])
const velocityVectorPlanck = [1, 0, 0, 0, 0] as UnitVector

const scaleDiff = 10 // divided/multiplied
const scaleDiffSmall = 2 // divided/multiplied
const particleSize = 10

export default function App() {
  const [weight, setWeight] = useState(0)

  const schwarzschildRadius = useMemo(() => 2 * weight, [weight])
  const schwarzschildRadiusSi = useMemo(() => convertValue(schwarzschildRadius, distanceVectorPlanck, "toSi"), [schwarzschildRadius])
  const [radius, setRadius] = useState(0)
  useEffect(() => {
    if (radius < schwarzschildRadius) setRadius(schwarzschildRadius)
  }, [radius, schwarzschildRadius])

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
    const metricTensor = schwarzschild.metric({
      r: initialCoordinates[1],
      rs: schwarzschildRadius,
      theta: initialCoordinates[2]
    })

    let sum = 0
    initialVelocity.forEach((a, aI) =>
      sum += a * a * metricTensor[aI][aI]
    )

    return Math.sqrt(sum)
  }, [initialVelocity, schwarzschildRadius, initialCoordinates])
  const initialVelocitySizeSi = useMemo(() => convertValue(initialVelocitySize, velocityVectorPlanck, "toSi"), [initialVelocitySize])


  const [scaleSi, setScaleSi] = useState(10) // 1 pixel = 1 m
  const scalePlanck = useMemo(() => convertValue(scaleSi, distanceVectorPlanck, "toPlanck"), [scaleSi])

  const [coordinates, setCoordinates] = useState([...initialCoordinates])
  const [velocity, setVelocity] = useState([...initialVelocity])
  const velocitySize = useMemo(() => {
    const metricTensor = schwarzschild.metric({
      r: initialCoordinates[1],
      rs: schwarzschildRadius,
      theta: initialCoordinates[2]
    })

    let sum = 0
    velocity.forEach((a, aI) =>
      velocity.forEach((b, bI) =>
        sum += a * b * metricTensor[aI][bI]
      )
    )

    return Math.sqrt(sum)
  }, [velocity, schwarzschildRadius, initialCoordinates])
  const velocitySizeSi = useMemo(() => convertValue(velocitySize, velocityVectorPlanck, "toSi"), [velocitySize])

  useEffect(() => {
    const metricTensor = schwarzschild.metric({ r: initialCoordinates[1], rs: schwarzschildRadius, theta: initialCoordinates[2] })
    initialVelocity[0] = -Math.sqrt(
      -(
        1 +
        metricTensor[1][1] * initialVelocity[1] * initialVelocity[1] +
        metricTensor[2][2] * initialVelocity[2] * initialVelocity[2] +
        metricTensor[3][3] * initialVelocity[3] * initialVelocity[3]
      )
      / metricTensor[0][0]
    )

    setInitialVelocity([...initialVelocity])
  }, [initialVelocity, initialCoordinates, schwarzschildRadius])

  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (playing) return
    setCoordinates([...initialCoordinates])
  }, [initialCoordinates, playing])

  useEffect(() => {
    if (playing) return
    setVelocity([...initialVelocity])
  }, [initialVelocity, playing])

  const [frequency, setFrequency] = useState(30)
  const period = useMemo(() => 1 / frequency, [frequency])

  const [timeScale, setTimeScale] = useState(1)

  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      const christoffel = schwarzschild.christoffel({
        r: coordinates[1],
        rs: schwarzschildRadius,
        m: weight,
        theta: coordinates[2],
      })

      const newCoordinates = coordinates.map((coord, a) =>
        coord + period * timeScale * velocity[a])

      const newVelocity = velocity.map((vel, a) => {
        let gammaTotal = 0
        christoffel[a].forEach((cRow, b) =>
          cRow.forEach((gamma, c) => gammaTotal += gamma * velocity[b] * velocity[c])
        )
        return vel - gammaTotal * period * timeScale
      })

      setCoordinates([...newCoordinates])
      setVelocity([...newVelocity])
    }, period)

    return () => clearInterval(interval)
  }, [coordinates, velocity, period, playing, schwarzschildRadius, weight, timeScale])

  // assuming view from top and theta initialCoordinates[2] = pi/2
  // TODO: theta
  const draw: Draw = (ctx, frameCount) => {
    const blackHoleX = ctx.canvas.width / 2
    const blackHoleY = ctx.canvas.height / 2

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(blackHoleX, blackHoleY, radius / scalePlanck, 0, 2 * Math.PI)
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
    <BlockMath math={String.raw`\frac{d^2 x^a}{d \lambda^2} + \Gamma^a_{bc} \frac{dx^b}{d \lambda} \frac{dx^c}{d \lambda} = 0`} />
    <BlockMath math={String.raw`\frac{d^2 x^a}{d \lambda^2} = - \Gamma^a_{bc} \frac{dx^b}{d \lambda} \frac{dx^c}{d \lambda}`} />

    <p>
      Setting <InlineMath math={String.raw`V^a = \frac{dx^a}{d\lambda}`} />, we can create system of DEs:
    </p>
    <BlockMath math={String.raw`\frac{dx^a}{d\lambda} = V^a`} />
    <BlockMath math={String.raw`\frac{dV^a}{d\lambda} = - \Gamma^a_{bc} V^b V^c`} />

    <p>Using Euler method we get:</p>
    <BlockMath math={String.raw`x^a_{n+1} = x^a_n + h V^a_n`} />
    <BlockMath math={String.raw`V^a_{n+1} = V^a_n - h \Gamma^a_{bc} V^b_n V^c_n`} />

    <p>Weight</p>
    <UnitInput origin="si" si={[["kg", 1]]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={weight} setValue={setWeight} />

    <br />
    <p>Schwarzschild radius <InlineMath math={`r_s = ${schwarzschildRadius} ${distanceUnitTextPlanck} = ${schwarzschildRadiusSi} ${distanceUnitTextSi}`} /></p>

    <p>Radius</p>
    <UnitInput origin="si" si={[["m", 1]]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={radius} setValue={value => setRadius(+value)} />
    <button onClick={() => setRadius(schwarzschildRadius)}>Set to <InlineMath math="r_s" /></button>

    <br />
    <br />
    <p>Initial coordinates</p>
    <UnitInput origin="si" si={[["m", 1]]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={initialCoordinates[1]} setValue={value => setArrayState(setInitialCoordinates, value, 1)} />
    <UnitInput origin="si" si={[]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={initialCoordinates[2]} setValue={value => setArrayState(setInitialCoordinates, value, 2)} />
    <UnitInput origin="si" si={[]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={initialCoordinates[3]} setValue={value => setArrayState(setInitialCoordinates, value, 3)} />

    <br />
    {/* TODO: units? */}
    <p>Initial velocity: <InlineMath math={String.raw`(${initialVelocity[0]}, ${initialVelocity[1]}, ${initialVelocity[2]}, ${initialVelocity[3]})`} />, <InlineMath math={String.raw`|U| = \sqrt{U^a U^b g_{ab}} = ${initialVelocitySize} ${velocityUnitTextPlanck} = ${initialVelocitySizeSi} ${velocityUnitTextSi}`} /></p>
    {initialVelocitySize > 1 && <p className="text-red-600">Warning: <InlineMath math="v > c" /></p>}
    <UnitInput origin="si" si={[["m", 1], ["s", -1]]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={initialVelocity[1]} setValue={value => setArrayState(setInitialVelocity, value, 1)} />
    <UnitInput origin="si" si={[["m", 1], ["s", -1]]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={initialVelocity[2]} setValue={value => setArrayState(setInitialVelocity, value / initialCoordinates[1], 2)} />
    <UnitInput origin="si" si={[["m", 1], ["s", -1]]} planck={["c", "G", "h", "e", "k"]} valueUnits="planck" value={initialVelocity[3]} setValue={value => setArrayState(setInitialVelocity, value / initialCoordinates[1], 3)} />

    <br />
    <label>
      Frequency:{" "}
      <input type="number" min="0" max="200" value={frequency} onChange={e => setFrequency(+e.target.value)} /> <InlineMath math="Hz" />
    </label>

    <br />

    <label>
      Time scale:{" "}
      <input type="number" value={timeScale} onChange={e => setTimeScale(+e.target.value)} /> x
    </label>

    <div>
      <button onClick={() => setPlaying(prev => !prev)}>{playing ? "||" : ">"}</button>
      <button onClick={() => {
        setCoordinates([...initialCoordinates])
        setVelocity([...initialVelocity])
      }}>reset</button>
    </div>

    <br />
    <div>
      <p>Coordinates: <InlineMath math={String.raw`(${coordinates[0]}, ${coordinates[1]}, ${coordinates[2]}, ${coordinates[3]})`} /></p>
      <p>Velocity: <InlineMath math={String.raw`(${velocity[0]}, ${velocity[1]}, ${velocity[2]}, ${velocity[3]})`} />, <InlineMath math={String.raw`|U| = \sqrt{U^a U^b g_{ab}} = ${velocitySize} ${velocityUnitTextPlanck} = ${velocitySizeSi} ${velocityUnitTextSi}`} /></p>
    </div>

    <br />
    <canvas ref={canvasRef} width="600" height="450" className="border" />
    <br />
    <div className="inline-flex flex-col">
      <span>
        <button onClick={() => setScaleSi(prev => prev / scaleDiffSmall)}>+</button> <button onClick={() => setScaleSi(prev => prev * scaleDiffSmall)}>-</button>
      </span>
      <span>
        <button onClick={() => setScaleSi(prev => prev / scaleDiff)}>++</button> <button onClick={() => setScaleSi(prev => prev * scaleDiff)}>--</button>
      </span>
    </div>
    <InlineMath math={`1 pixel = ${scalePlanck} ${distanceUnitTextPlanck} = ${scaleSi} ${distanceUnitTextSi}`} />
  </>
}

/*
Presets
mercury and sun
 - weight: 4e30 si
 - radius: 7e11 si
 - distance (x^1): 58e15 si
 - angular vel. (v^3): 1224662 si
 - timeScale: 1e32

https://commons.wikimedia.org/wiki/File:Newton_versus_Schwarzschild_trajectories.gif
 - weight: 1e29 si
 - distance (x^1): 1485 si
 - velocity (v^?): 8.9e7 si ?????
 - time scale: 1e34

free fall towards sun
 - weight: 4e30 si
 - radius: 7e11 si
 - distance (x^1): 1e13 si
 - time scale: 1e93
*/
