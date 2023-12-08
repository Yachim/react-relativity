import { Canvas, Color, extend, useFrame, useLoader, useThree, ReactThreeFiber } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { TextureLoader } from "three"
import { OrbitControls } from "three/examples/jsm/Addons.js"
import * as THREE from "three"
import { BlockMath, InlineMath } from "react-katex"
import { getTimeVelocity, getVectorSize } from "./utils/metric"
import { State, useAngularMomentum, useAngularVelocity, useCoordinate, useMass, useTimeVelocity, useVelocity, velocityToSI } from "./utils/units"
import { useFrequency } from "./utils/utils"
import { nextCoordinates, nextVelocities } from "./utils/geodesic"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faForwardFast, faForwardStep, faPause, faPlay, faStop } from "@fortawesome/free-solid-svg-icons"
import { Line } from "@react-three/drei"

extend({ OrbitControls })

declare global {
  export namespace JSX {
    interface IntrinsicElements {
      'orbitControls': ReactThreeFiber.Object3DNode<OrbitControls, typeof OrbitControls>;
    }
  }
}

const CameraControls = () => {
  const { camera, gl } = useThree()
  const controlsRef = useRef<OrbitControls>(null)

  useFrame(() => {
    if (!controlsRef || !controlsRef.current) return
    controlsRef.current.update()
  })

  return <orbitControls ref={controlsRef} args={[camera, gl.domElement]} />
}

type RadialCoordinates = {
  r: number
  theta: number // angle from north
  phi: number // angle around z axis
}

type CartesianCoordinates = {
  x: number
  y: number
  z: number
}

type TrailProps = {
  color: THREE.ColorRepresentation
  width: number
  decayTime: number
}

type SphereProps = {
  radius: number
  color: Color
  scale: number
  trail?: TrailProps
} & Partial<RadialCoordinates>

function schwarzschildToCartesian({ r, theta, phi }: Partial<RadialCoordinates>): CartesianCoordinates {
  const sinTheta = Math.sin(theta ?? 0)
  const cosTheta = Math.cos(theta ?? 0)
  const sinPhi = Math.sin(phi ?? 0)
  const cosPhi = Math.cos(phi ?? 0)

  // this is z-up, threejs uses y-up
  const x = (r ?? 0) * sinTheta * cosPhi
  const z = (r ?? 0) * sinTheta * sinPhi
  const y = (r ?? 0) * cosTheta

  return { x, y, z }
}

function Sphere({ radius, r, theta, phi, color, scale, trail }: SphereProps) {
  const { x, y, z } = useMemo(() => schwarzschildToCartesian({ r, theta, phi }), [r, theta, phi])

  const [pointsData, setPointsData] = useState<{
    point: [number, number, number]
    time: number
  }[]>([
    {
      point: [x / scale, y / scale, z / scale],
      time: Date.now()
    },
    {
      point: [x / scale, y / scale, z / scale],
      time: Date.now()
    }
  ])

  useFrame(() => {
    if (!trail) return
    setPointsData(prev =>
      [...prev.filter(val => Date.now() - val.time < trail.decayTime * 1000),
      {
        point: [x / scale, y / scale, z / scale],
        time: Date.now()
      }
      ]
    )
  })

  const points = useMemo(() => pointsData.map(({ point }) => point), [pointsData])

  return (
    <>
      {trail &&
        <Line
          points={points}
          color={trail.color}
          lineWidth={trail.width}
        />
      }
      <mesh
        position={[x / scale, y / scale, z / scale]}
      >
        <sphereGeometry args={[radius / scale]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  )
}

const Skybox = () => {
  // https://www.google.com/search?q=starfield%20texture&tbm=isch&hl=cs&tbs=il:ol&client=firefox-b-d&sa=X&ved=0CAAQ1vwEahcKEwjY1Z_S7OiCAxUAAAAAHQAAAAAQAw&biw=1876&bih=881#imgrc=_DPEDA10Axo3UM
  // https://stock.adobe.com/cz/license-terms
  const starfieldTexture = useLoader(TextureLoader, 'https://t3.ftcdn.net/jpg/03/29/54/94/360_F_329549476_gEdfUOnqJFOUYizc9FGQjtBqvuatNgqt.jpg');

  const skyMaterial = new THREE.MeshBasicMaterial({ map: starfieldTexture, side: THREE.BackSide });

  return (
    <mesh>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial {...skyMaterial} />
    </mesh>
  );
};

// used in stepMore
const stepCount = 100

type PresetValueName =
  "bhWeight" |
  "bhRadius" |
  "orbitingRadius" |
  "timeScale" |
  "initialOrbitingDistance" |
  "initialOrbitingTheta" |
  "initialOrbitingPhi" |
  "initialOrbitingDistanceVelocity" |
  "initialOrbitingThetaVelocity" |
  "initialOrbitingPhiVelocity" |
  "orbitingTrailWidth" |
  "orbitingTrailDecay"
// TODO: bodies colors, trail colors

const presets: {
  name: string
  description?: string
  values: {
    recommended?: boolean
    name: PresetValueName
    value: number
  }[]
}[] = [
    {
      name: "Wikipedia Schwarzschild geodesics",
      description: "https://commons.wikimedia.org/wiki/File:Newton_versus_Schwarzschild_trajectories.gif",
      values: [
        {
          name: "bhWeight",
          value: 10,
        },
        {
          name: "initialOrbitingDistance",
          value: 295414,
        },
        {
          name: "initialOrbitingTheta",
          value: Math.PI / 2,
        },
        {
          name: "initialOrbitingPhiVelocity",
          value: 8.9e7,
        },
        {
          name: "bhRadius",
          value: 5e4,
          recommended: true,
        },
        {
          name: "orbitingRadius",
          value: 5e4,
          recommended: true,
        },
        {
          name: "timeScale",
          value: 5e6,
          recommended: true,
        },
        {
          name: "orbitingTrailDecay",
          value: 8,
          recommended: true,
        },
      ]
    },
    {
      name: "Mercury and Sun",
      values: [
        {
          name: "bhWeight",
          value: 1,
        },
        {
          name: "initialOrbitingDistance",
          value: 58e9,
        },
        {
          name: "initialOrbitingTheta",
          value: Math.PI / 2,
        },
        {
          name: "initialOrbitingPhiVelocity",
          value: 47e3,
        },
        {
          name: "bhRadius",
          value: 1e9,
          recommended: true,
        },
        {
          name: "orbitingRadius",
          value: 1e9,
          recommended: true,
        },
        {
          name: "timeScale",
          value: 760320000000000,
          recommended: true,
        },
        {
          name: "orbitingTrailDecay",
          value: 100,
          recommended: true,
        },
      ]
    },
    {
      name: "Time dilation on ISS",
      description: "Just look at initial time velocity. It should be around 1.000000001.",
      values: [
        {
          name: "bhWeight",
          value: 2.985e-6,
        },
        {
          name: "initialOrbitingDistance",
          value: 6.78e6,
        },
        {
          name: "initialOrbitingTheta",
          value: Math.PI / 2,
        },
        {
          name: "initialOrbitingPhiVelocity",
          value: 7660,
        },
      ]
    },
  ]

// FIXME: stop when r < r_s

// c = G = 1
// weight in solar mass, distance in meters, speed in ms^-1, time in seconds
// initial velocity of angles is not in angular velocity, but normal velocity (v = omega * r => omega = v/r)
//  - v: speed
//  - omega: angular velocity
//  - r: radius/distance
export default function App() {
  const [kerr, setKerr] = useState(false)
  const {
    solarMass: bhWeight,
    setSolarMass: setBhWeight,
    geometrizedMass: bhWeightGeometrized
  } = useMass(100) // solar mass
  const schwarzschildRadius = useMemo(() => bhWeightGeometrized * 2, [bhWeightGeometrized])
  const [bhRadius, setBhRadius] = useState(1)
  const [bhColor, setBhColor] = useState("#505050")
  const {
    angularMomentum: bhAngularMomentum,
    setAngularMomentum: setBhAngularMomentum,
    angularMomentumGeometrized: bhAngularMomentumGeometrized,
  } = useAngularMomentum(0)
  const a = useMemo(() => bhAngularMomentumGeometrized / bhWeight, [bhAngularMomentumGeometrized, bhWeight])

  useEffect(() => {
    if (bhRadius < schwarzschildRadius) setBhRadius(schwarzschildRadius)
  }, [bhRadius, schwarzschildRadius])

  const [orbitingRadius, setOrbitingRadius] = useState(2e5)
  const [playState, setPlayState] = useState<State>("stopped")
  const [orbitingTimeCoordinate, setOrbitingTimeCoordinate] = useState(0)
  const [orbitingColor, setOrbitingColor] = useState("#80ff00")
  const [orbitingTrailEnabled, setOrbitingTrailEnabled] = useState(true)
  const [orbitingTrailColor, setOrbitingTrailColor] = useState(orbitingColor)
  const [orbitingTrailWidth, setOrbitingTrailWidth] = useState(5)
  const [orbitingTrailDecay, setOrbitingTrailDecay] = useState(4)

  useEffect(() => {
    if (playState !== "stopped") return;
    setOrbitingTimeCoordinate(0)
  }, [playState])

  const {
    initialCoordinate: initialOrbitingDistance,
    setInitialCoordinate: setInitialOrbitingDistance,
    coordinate: orbitingDistance,
    setCoordinate: setOrbitingDistance,
  } = useCoordinate(3e6, playState)

  const {
    initialCoordinate: initialOrbitingTheta,
    setInitialCoordinate: setInitialOrbitingTheta,
    coordinate: orbitingTheta,
    setCoordinate: setOrbitingTheta,
  } = useCoordinate(Math.PI / 2, playState)

  const {
    initialCoordinate: initialOrbitingPhi,
    setInitialCoordinate: setInitialOrbitingPhi,
    coordinate: orbitingPhi,
    setCoordinate: setOrbitingPhi,
  } = useCoordinate(0, playState)

  const {
    initialVelocity: initialOrbitingTimeVelocity,
    setInitialVelocity: setInitialOrbitingTimeVelocity,
    velocity: orbitingTimeVelocity,
    setVelocity: setOrbitingTimeVelocity
  } = useTimeVelocity(0, playState)

  const {
    initialVelocity: initialOrbitingDistanceVelocity,
    setInitialVelocity: setInitialOrbitingDistanceVelocity,
    initialGeometrizedVelocity: initialOrbitingDistanceGeometrizedVelocity,
    velocity: orbitingDistanceVelocity,
    setVelocity: setOrbitingDistanceVelocity,
    geometrizedVelocity: orbitingDistanceGeometrizedVelocity,
  } = useVelocity(0, playState)

  const {
    initialVelocity: initialOrbitingThetaVelocity,
    setInitialVelocity: setInitialOrbitingThetaVelocity,
    initialGeometrizedVelocity: initialOrbitingThetaGeometrizedVelocity,
    initialAngularVelocity: initialOrbitingThetaAngularVelocity,
    initialGeometrizedAngularVelocity: initialOrbitingThetaGeometrizedAngularVelocity,
    velocity: orbitingThetaVelocity,
    geometrizedVelocity: orbitingThetaGeometrizedVelocity,
    angularVelocity: orbitingThetaAngularVelocity,
    geometrizedAngularVelocity: orbitingThetaGeometrizedAngularVelocity,
    setGeometrizedAngularVelocity: setOrbitingThetaGeometrizedAngularVelocity,
  } = useAngularVelocity(0, initialOrbitingDistance, orbitingDistance, playState)

  const {
    initialVelocity: initialOrbitingPhiVelocity,
    setInitialVelocity: setInitialOrbitingPhiVelocity,
    initialGeometrizedVelocity: initialOrbitingPhiGeometrizedVelocity,
    initialAngularVelocity: initialOrbitingPhiAngularVelocity,
    initialGeometrizedAngularVelocity: initialOrbitingPhiGeometrizedAngularVelocity,
    velocity: orbitingPhiVelocity,
    geometrizedVelocity: orbitingPhiGeometrizedVelocity,
    angularVelocity: orbitingPhiAngularVelocity,
    geometrizedAngularVelocity: orbitingPhiGeometrizedAngularVelocity,
    setGeometrizedAngularVelocity: setOrbitingPhiGeometrizedAngularVelocity,
  } = useAngularVelocity(0, initialOrbitingDistance, orbitingDistance, playState)

  const initialOrbitingVelocitySize = useMemo(() => getVectorSize([
    initialOrbitingTimeVelocity,
    initialOrbitingDistanceVelocity,
    initialOrbitingThetaAngularVelocity,
    initialOrbitingPhiAngularVelocity
  ], {
    r: initialOrbitingDistance,
    rs: schwarzschildRadius,
    theta: initialOrbitingTheta,
    kerr,
    a,
  }), [
    initialOrbitingTimeVelocity,
    initialOrbitingDistanceVelocity,
    initialOrbitingThetaAngularVelocity,
    initialOrbitingPhiAngularVelocity,
    initialOrbitingDistance,
    schwarzschildRadius,
    initialOrbitingTheta,
    kerr,
    a,
  ])

  useEffect(() => {
    if (playState !== "stopped") return;
    setInitialOrbitingTimeVelocity(getTimeVelocity([
      initialOrbitingDistanceVelocity,
      initialOrbitingThetaGeometrizedAngularVelocity,
      initialOrbitingPhiGeometrizedAngularVelocity,
    ], {
      r: initialOrbitingDistance,
      rs: schwarzschildRadius,
      theta: initialOrbitingTheta,
      kerr,
      a,
    })[0])
  }, [
    playState,
    initialOrbitingDistanceVelocity,
    initialOrbitingThetaGeometrizedAngularVelocity,
    initialOrbitingPhiGeometrizedAngularVelocity,
    initialOrbitingDistance,
    schwarzschildRadius,
    initialOrbitingTheta,
    setInitialOrbitingTimeVelocity,
    kerr,
    a,
  ])

  // FIXME: nan
  const orbitingVelocitySize = useMemo(() => getVectorSize([
    orbitingTimeVelocity,
    orbitingDistanceVelocity,
    orbitingThetaAngularVelocity,
    orbitingPhiAngularVelocity
  ], {
    r: orbitingDistance,
    rs: schwarzschildRadius,
    theta: orbitingTheta,
    kerr,
    a,
  }), [
    orbitingTimeVelocity,
    orbitingDistanceVelocity,
    orbitingThetaAngularVelocity,
    orbitingPhiAngularVelocity,
    orbitingDistance,
    schwarzschildRadius,
    orbitingTheta,
    kerr,
    a,
  ])

  const [panelVisible, setPanelVisible] = useState<"none" | "math" | "inputs" | "values" | "presets">("none")

  const {
    timeScale,
    setTimeScale,
    frequency,
    setFrequency,
    iterationCnt,
    setIterationCnt,
    period,
    scaledPeriod
  } = useFrequency(30, 1)

  const step = useCallback(() => {
    const coordinates: [number, number, number, number] = [
      orbitingTimeCoordinate,
      orbitingDistance,
      orbitingTheta,
      orbitingPhi,
    ]
    const velocities: [number, number, number, number] = [
      orbitingTimeVelocity,
      orbitingDistanceVelocity,
      orbitingThetaGeometrizedAngularVelocity,
      orbitingPhiGeometrizedAngularVelocity
    ]
    const [newT, newR, newTheta, newPhi] = nextCoordinates(
      coordinates,
      velocities,
      scaledPeriod,
      iterationCnt,
    )

    const [newTU, newRU, newThetaU, newPhiU] = nextVelocities(
      velocities,
      {
        rs: schwarzschildRadius,
        r: orbitingDistance,
        theta: orbitingTheta,
        kerr,
        a,
      },
      scaledPeriod,
      iterationCnt,
    )

    setOrbitingTimeCoordinate(newT)
    setOrbitingDistance(newR)
    setOrbitingTheta(newTheta)
    setOrbitingPhi(newPhi)

    setOrbitingTimeVelocity(newTU)
    setOrbitingDistanceVelocity(newRU)
    setOrbitingThetaGeometrizedAngularVelocity(newThetaU)
    setOrbitingPhiGeometrizedAngularVelocity(newPhiU)
  }, [
    orbitingDistance,
    orbitingDistanceVelocity,
    orbitingPhi,
    orbitingPhiGeometrizedAngularVelocity,
    orbitingTheta,
    orbitingThetaGeometrizedAngularVelocity,
    orbitingTimeCoordinate,
    orbitingTimeVelocity,
    scaledPeriod,
    iterationCnt,
    schwarzschildRadius,
    setOrbitingDistance,
    setOrbitingDistanceVelocity,
    setOrbitingPhi,
    setOrbitingPhiGeometrizedAngularVelocity,
    setOrbitingTheta,
    setOrbitingThetaGeometrizedAngularVelocity,
    setOrbitingTimeVelocity,
    kerr,
    a,
  ])

  const stepMore = useCallback(() => {
    for (let i = 0; i < stepCount; i++) {
      step()
    }
  }, [step])

  useEffect(() => {
    if (playState !== "playing") return
    const interval = setInterval(step, period * 1000)

    return () => clearInterval(interval)
  }, [
    period,
    playState,
    step,
  ])

  const scale = useMemo(() =>
    (orbitingRadius + bhRadius + initialOrbitingDistance) / 5
    , [orbitingRadius, bhRadius, initialOrbitingDistance])

  const [selectedPreset, setSelectedPreset] = useState(-1)

  const setValue = useCallback((name: PresetValueName, value: number) => {
    switch (name) {
      case "bhWeight":
        setBhWeight(value)
        break
      case "bhRadius":
        setBhRadius(value)
        break
      case "orbitingRadius":
        setOrbitingRadius(value)
        break
      case "timeScale":
        setTimeScale(value)
        break
      case "initialOrbitingDistance":
        setInitialOrbitingDistance(value)
        break
      case "initialOrbitingTheta":
        setInitialOrbitingTheta(value)
        break
      case "initialOrbitingPhi":
        setInitialOrbitingPhi(value)
        break
      case "initialOrbitingDistanceVelocity":
        setInitialOrbitingDistanceVelocity(value)
        break
      case "initialOrbitingThetaVelocity":
        setInitialOrbitingThetaVelocity(value)
        break
      case "initialOrbitingPhiVelocity":
        setInitialOrbitingPhiVelocity(value)
        break
      case "orbitingTrailWidth":
        setOrbitingTrailWidth(value)
        break
      case "orbitingTrailDecay":
        setOrbitingTrailDecay(value)
        break
    }
  }, [
    setBhWeight,
    setBhRadius,
    setOrbitingRadius,
    setTimeScale,
    setInitialOrbitingDistance,
    setInitialOrbitingTheta,
    setInitialOrbitingPhi,
    setInitialOrbitingDistanceVelocity,
    setInitialOrbitingThetaVelocity,
    setInitialOrbitingPhiVelocity,
    setOrbitingTrailWidth,
    setOrbitingTrailDecay,
  ])

  useEffect(() => {
    if (selectedPreset > presets.length || selectedPreset < 0) return
    presets[selectedPreset].values.forEach(({ name, value, recommended }) => {
      if (recommended) return
      setValue(name, value)
    })
  }, [
    selectedPreset,
    setValue
  ])

  const recommendedValues = useMemo(() => {
    if (selectedPreset > presets.length || selectedPreset < 0) return []
    return presets[selectedPreset].values.filter(({ recommended }) => recommended)
  }, [selectedPreset])

  return (
    <div className="w-full h-full">
      <Canvas>
        <CameraControls />
        <Skybox />
        <ambientLight />
        <directionalLight color="white" position={[10, 10, 10]} />
        <Sphere radius={bhRadius} color={bhColor} scale={scale} />
        <Sphere
          radius={orbitingRadius}
          color={orbitingColor}
          r={orbitingDistance}
          theta={orbitingTheta}
          phi={orbitingPhi}
          scale={scale}
          trail={orbitingTrailEnabled ? {
            color: orbitingTrailColor,
            width: orbitingTrailWidth,
            decayTime: orbitingTrailDecay,
          } : undefined}
        />
      </Canvas>
      <div className="w-full absolute top-0 flex flex-col max-h-screen">
        <div className="p-2 bg-opacity-90 bg-gray-400 flex gap-2">
          <button onClick={() => setPanelVisible(prev => prev === "math" ? "none" : "math")}>Math</button>
          <button onClick={() => setPanelVisible(prev => prev === "inputs" ? "none" : "inputs")}>Inputs</button>
          <button onClick={() => setPanelVisible(prev => prev === "values" ? "none" : "values")}>Values</button>
          <button onClick={() => setPanelVisible(prev => prev === "presets" ? "none" : "presets")}>Presets</button>
          <button onClick={() => setPlayState(prev => {
            if (prev == "playing") return "paused"
            return "playing"
          })}>
            {playState === "playing" ?
              (<FontAwesomeIcon icon={faPause} />) :
              (<FontAwesomeIcon icon={faPlay} />)
            }
          </button>
          <button disabled={playState === "stopped"} onClick={() => setPlayState("stopped")} > <FontAwesomeIcon icon={faStop} /></button>
          <button disabled={playState !== "paused"} onClick={step} > <FontAwesomeIcon icon={faForwardStep} /></button>
          <button disabled={playState !== "paused"} onClick={stepMore} > <FontAwesomeIcon icon={faForwardFast} /></button>
          <label>
            <input type="number" min="0" max="200" value={frequency} onChange={e => setFrequency(+e.target.value)} />
            <InlineMath math="Hz" />
          </label>
          <label>
            Iteration count:
            <input type="number" min="0" value={iterationCnt} onChange={e => setIterationCnt(+e.target.value)} />
          </label>
          <label>
            <input type="number" min="0" value={timeScale} onChange={e => setTimeScale(+e.target.value)} />
            x
          </label>
        </div>
        {panelVisible === "math" &&
          <div className="p-4 bg-opacity-80 bg-gray-400 flex flex-col gap-2 h-full overflow-y-auto">
            <h2><a href="https://www.seas.upenn.edu/~amyers/NaturalUnits.pdf">Units and conversion</a></h2>
            <p>Geometrized units are used for calculations (<InlineMath math="c = G = 1" />). For mass, the solar mass (<InlineMath math="M_{\odot}" />) is used. The <InlineMath math="si, g" /> subscripts are for SI and geometrized units respectively.</p>
            <h3>Length</h3>
            <BlockMath math="l_{si} = l_g" />

            <h3>Mass</h3>
            <p><InlineMath math="m" /> is the number of solar masses, <InlineMath math="M_{\odot}" /> is one solar mass.</p>
            <BlockMath math="
              m_{si} = m\, M_{\odot} \newline
              m_g = \frac{m_{si}}{c^2 G^{-1}} = \frac{m\, M_{\odot}}{c^2 G^{-1}}
            " />

            <h3>Velocity, including angular velocity</h3>
            <BlockMath math="u_g = \frac{u_{si}}{c}" />

            <h3>Angular momentum</h3>
            <BlockMath math="J_g = \frac{J_{si}}{c^3 G^{-1}}" />

            <hr />

            <h2>Metric and sign convention</h2>
            <p>Using Schwarzschild metric with the sign convention <InlineMath math="+, -, -, -" /></p>

            <h3>Metric tensor</h3>
            <BlockMath math="g = diag(1 - \frac{r_s}{r},\ -\left(1 - \frac{r_s}{r}\right)^{-1},\ -r^2,\ -r^2 \sin^2 \theta)" />

            <hr />

            <h2>Geodesic equation</h2>
            <BlockMath math={String.raw`\frac{d^2 x^a}{d \lambda^2} + \Gamma^a_{bc} \frac{dx^b}{d \lambda} \frac{dx^c}{d \lambda} = 0`} />
            <BlockMath math={String.raw`\frac{d^2 x^a}{d \lambda^2} = - \Gamma^a_{bc} \frac{dx^b}{d \lambda} \frac{dx^c}{d \lambda}`} />

            <p>
              Setting <InlineMath math={String.raw`U^a = \frac{dx^a}{d\lambda}`} />, we can create system of DEs:
            </p>
            <BlockMath math={String.raw`\frac{dx^a}{d\lambda} = U^a`} />
            <BlockMath math={String.raw`\frac{dU^a}{d\lambda} = - \Gamma^a_{bc} U^b U^c`} />

            <p>Using Euler method, we get:</p>
            <BlockMath math={String.raw`x^a_{n+1} = x^a_n + h U^a_n`} />
            <BlockMath math={String.raw`U^a_{n+1} = U^a_n - h \Gamma^a_{bc} U^b_n U^c_n`} />

            {/*TODO:
            <p>Or using Runge Kutta method, we get:</p>
            <BlockMath math={String.raw`x^a_{n+1} = x^a_n + \frac{h}{6} U^a_n`} />
            <BlockMath math={String.raw`U^a_{n+1} = U^a_n - h \Gamma^a_{bc} U^b_n U^c_n`} />*/}

            <BlockMath math="h = \frac{s}{fn}" />

            <p>Where <InlineMath math="f" /> is frequency, <InlineMath math="s" /> is the time scale and <InlineMath math="n" /> is the iteration count. <InlineMath math="n" /> calculations are done <InlineMath math="f" /> times per second.</p>

            <hr />

            <h2>Vector size</h2>
            <BlockMath math={String.raw`|V| = \sqrt{ V^a V^b g_{ab}}`} />

            <p>Since metric tensor <InlineMath math="g" /> has non zero elements only on its diagonals, it can be simplified to:</p>
            <BlockMath math={String.raw`|V| = \sqrt{ (V^a)^2 g_{aa}}`} />

            <hr />

            <h2>Time velocity from spatial velocity</h2>
            <BlockMath math={String.raw`|U|^2 = (U^t)^2 g_{tt} + (U^i)^2 g_{ii}`} />
            <BlockMath math={String.raw`(U^t)^2 g_{tt} = |U|^2 - (U^i)^2 g_{ii} `} />
            <BlockMath math={String.raw`(U^t)^2 = \frac{|U|^2 - (U^i)^2 g_{ii}}{g_{tt}}`} />
            <BlockMath math={String.raw`U^t = \sqrt{\frac{|U|^2 - (U^i)^2 g_{ii}}{g_{tt}}}`} />

            <p>Where <InlineMath math="i" /> are spatial coordinates, also <InlineMath math={String.raw`|U|^2 = 1`} />, so we get:</p>
            <BlockMath math={String.raw`U^t = \sqrt{\frac{1 - (U^i)^2 g_{ii}}{g_{tt}}}`} />
          </div>
        }
        {panelVisible === "inputs" &&
          <div className="p-4 bg-opacity-80 bg-gray-400 flex flex-col gap-2 overflow-y-auto">
            <label>
              Metric:
              <select value={kerr ? "k" : "s"} onChange={e => {
                if (e.target.value === "k") setKerr(true)
                else setKerr(false)
              }}>
                <option value="s">Schwarzschild</option>
                <option value="k">Kerr</option>
              </select>
            </label>

            <h2>Massive body</h2>
            <label>
              Weight:
              <input type="number" value={bhWeight} onChange={e => setBhWeight(+e.target.value)} />
              <InlineMath math="M_{\odot}" />
            </label>
            <label>
              Radius:
              <input type="number" value={bhRadius} onChange={e => setBhRadius(+e.target.value)} />
              <InlineMath math="m" />
              <button onClick={() => setBhRadius(schwarzschildRadius)}>Set to <InlineMath math="r_s" /></button>
            </label>
            <label>
              Color:
              <input type="color" value={bhColor} onChange={e => setBhColor(e.target.value)} />
            </label>
            {kerr &&
              <label>
                Angular momentum:
                <input type="number" value={bhAngularMomentum} onChange={e => setBhAngularMomentum(+e.target.value)} />
                <InlineMath math="kg\ m^2\ s^{-1}" />
              </label>
            }

            <hr />

            <h2>Orbiting body</h2>
            <label>
              Radius:
              <input type="number" value={orbitingRadius} onChange={e => setOrbitingRadius(+e.target.value)} />
              <InlineMath math="m" />
            </label>
            <label>
              Color:
              <input type="color" value={orbitingColor} onChange={e => setOrbitingColor(e.target.value)} />
            </label>

            <h3>Trail</h3>

            <label>
              Enabled
              <input type="checkbox" checked={orbitingTrailEnabled} onChange={() => setOrbitingTrailEnabled(prev => !prev)} />
            </label>

            {orbitingTrailEnabled &&
              <>
                <label>
                  Color:
                  <input type="color" value={orbitingTrailColor} onChange={e => setOrbitingTrailColor(e.target.value)} />
                </label>

                <label>
                  Width:
                  <input type="number" value={orbitingTrailWidth} onChange={e => setOrbitingTrailWidth(+e.target.value)} />
                  px
                </label>

                <label>
                  Decay:
                  <input type="number" value={orbitingTrailDecay} onChange={e => setOrbitingTrailDecay(+e.target.value)} />
                  <InlineMath math="s" />
                </label>
              </>
            }

            <h3>Initial coordinates</h3>
            <label>
              Distance:
              <input type="number" value={initialOrbitingDistance} onChange={e => setInitialOrbitingDistance(+e.target.value)} />
              <InlineMath math="m" />
            </label>
            <label>
              Theta:
              <input type="number" value={initialOrbitingTheta} onChange={e => setInitialOrbitingTheta(+e.target.value)} />
            </label>
            <label>
              Phi:
              <input type="number" value={initialOrbitingPhi} onChange={e => setInitialOrbitingPhi(+e.target.value)} />
            </label>

            <h3>Initial velocity</h3>
            <label>
              Distance:
              <input type="number" value={initialOrbitingDistanceVelocity} onChange={e => setInitialOrbitingDistanceVelocity(+e.target.value)} />
              <InlineMath math="m\ s^{-1}" />
            </label>
            <label>
              Theta:
              <input type="number" value={initialOrbitingThetaVelocity} onChange={e => setInitialOrbitingThetaVelocity(+e.target.value)} />
              <InlineMath math="m\ s^{-1}" />
            </label>
            <label>
              Phi:
              <input type="number" value={initialOrbitingPhiVelocity} onChange={e => setInitialOrbitingPhiVelocity(+e.target.value)} />
              <InlineMath math="m\ s^{-1}" />
            </label>
          </div>
        }
        {panelVisible === "values" &&
          <div className="p-4 bg-opacity-80 bg-gray-400 flex flex-col gap-2 overflow-y-auto">
            <InlineMath math={String.raw`S_0^t = 0\ s`} />
            <InlineMath math={String.raw`S_0^r = ${initialOrbitingDistance}\ m`} />
            <InlineMath math={String.raw`S_0^{\theta} = ${initialOrbitingTheta}`} />
            <InlineMath math={String.raw`S_0^{\phi} = ${initialOrbitingPhi}`} />

            <br />

            <InlineMath math={`U_0^t = ${initialOrbitingTimeVelocity}`} />
            <InlineMath math={String.raw`U_0^r = ${initialOrbitingDistanceVelocity}\ m\ s^{-1} = ${initialOrbitingDistanceGeometrizedVelocity}\ c`} />
            <InlineMath math={String.raw`U_0^{\theta} = ${initialOrbitingThetaVelocity}\ m\ s^{-1} = ${initialOrbitingThetaGeometrizedVelocity}\ c\ \hat{=}\ ${initialOrbitingThetaAngularVelocity}\ s^{-1} = ${initialOrbitingThetaGeometrizedAngularVelocity}\ c`} />
            <InlineMath math={String.raw`U_0^{\phi} = ${initialOrbitingPhiVelocity}\ m\ s^{-1} = ${initialOrbitingPhiGeometrizedVelocity}\ c\ \hat{=}\ ${initialOrbitingPhiAngularVelocity}\ s^{-1} = ${initialOrbitingPhiGeometrizedAngularVelocity}\ c`} />

            <InlineMath math={String.raw`|U_0| = \sqrt{(U^a)^2 g_{aa}} = ${velocityToSI(initialOrbitingVelocitySize)}\ m\ s^{-1} = ${initialOrbitingVelocitySize}\ c`} />
            {initialOrbitingVelocitySize > 1 && <p className="text-red-600">Warning: <InlineMath math={`|U_0| > c`} /></p>}

            <hr />

            <InlineMath math={String.raw`S^t = ${orbitingTimeCoordinate}\ s`} />
            <InlineMath math={String.raw`S^r = ${orbitingDistance}\ m`} />
            <InlineMath math={String.raw`S^{\theta} = ${orbitingTheta}`} />
            <InlineMath math={String.raw`S^{\phi} = ${orbitingPhi}`} />

            <br />

            <InlineMath math={`U^t = ${orbitingTimeVelocity}`} />
            <InlineMath math={String.raw`U^r = ${orbitingDistanceVelocity}\ m\ s^{-1} = ${orbitingDistanceGeometrizedVelocity}\ c`} />
            <InlineMath math={String.raw`U^{\theta} = ${orbitingThetaVelocity}\ m\ s^{-1} = ${orbitingThetaGeometrizedVelocity}\ c\ \hat{=}\ ${orbitingThetaAngularVelocity}\ s^{-1} = ${orbitingThetaGeometrizedAngularVelocity}\ c`} />
            <InlineMath math={String.raw`U^{\phi} = ${orbitingPhiVelocity}\ m\ s^{-1} = ${orbitingPhiGeometrizedVelocity}\ c\ \hat{=}\ ${orbitingPhiAngularVelocity}\ s^{-1} = ${orbitingPhiGeometrizedAngularVelocity}\ c`} />

            <InlineMath math={String.raw`|U| = \sqrt{(U^a)^2 g_{aa}} = ${velocityToSI(orbitingVelocitySize)}\ m\ s^{-1} = ${orbitingVelocitySize}\ c`} />
            {orbitingVelocitySize > 1 && <p className="text-red-600">Warning: <InlineMath math={`|U| > c`} /></p>}
          </div>
        }
        {panelVisible === "presets" &&
          <div className="p-4 bg-opacity-80 bg-gray-400 flex flex-col gap-2 h-full overflow-y-auto items-start">
            <select value={selectedPreset} onChange={(e) => setSelectedPreset(+e.target.value)}>
              <option value={-1} disabled>--select--</option>
              {presets.map(({ name }, i) => <option key={i} value={i}>{name}</option>)}
            </select>
            {selectedPreset !== -1 && presets[selectedPreset].description &&
              <p>{presets[selectedPreset].description}</p>
            }
            {recommendedValues.length > 0 &&
              <>
                <h2>Recommended values</h2>
                <button
                  onClick={() => recommendedValues.forEach(({ name, value }) => setValue(name, value))}
                >Use all</button>
                {recommendedValues.map(({ name, value }, i) =>
                  <p key={i}>{name} = {value} <button onClick={() => setValue(name, value)}>Use</button></p>
                )}
              </>
            }
          </div>
        }
      </div>
    </div >
  )
}

