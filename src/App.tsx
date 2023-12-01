import { Canvas, Color, extend, useFrame, useLoader, useThree } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { TextureLoader } from "three"
import { OrbitControls } from "three/examples/jsm/Addons.js"
import * as THREE from "three"
import { c, solarMass } from "./utils/constants"
import { BlockMath, InlineMath } from "react-katex"
import { getTimeVelocity, getVectorSize } from "./utils/metric"
import { solarMassToGeometrized } from "./utils/units"

extend({ OrbitControls })

const CameraControls = () => {
  const { camera, gl } = useThree()
  const controlsRef = useRef()

  useFrame(() => {
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

type SphereProps = {
  radius: number
  color?: Color
} & Partial<RadialCoordinates>

function radialToCartesian({ r, theta, phi }: Partial<RadialCoordinates>): CartesianCoordinates {
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

const scale = 5e5

function Sphere({ radius, r, theta, phi, color }: SphereProps) {
  const { x, y, z } = useMemo(() => radialToCartesian({ r, theta, phi }), [r, theta, phi])

  return (
    <mesh
      position={[x / scale, y / scale, z / scale]}
    >
      <sphereGeometry args={[radius / scale]} />
      <meshStandardMaterial color={color} />
    </mesh>
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

// c = G = 1
// weight in solar mass, distance in meters, speed in lightSpeed, time in seconds
// initial velocity of angles is not in angular velocity, but normal velocity (v = omega * r => omega = v/r)
//  - v: speed
//  - omega: angular velocity
//  - r: radius/distance
export default function App() {
  const [bhWeight, setBhWeight] = useState(100) // solar mass
  const bhWeightGeometrized = useMemo(() => solarMassToGeometrized(bhWeight), [bhWeight])
  const schwarzschildRadius = useMemo(() => bhWeightGeometrized * 2, [bhWeightGeometrized])
  const [bhRadius, setBhRadius] = useState(1)
  const [bhColor, setBhColor] = useState("#505050")

  useEffect(() => {
    if (bhRadius < schwarzschildRadius) setBhRadius(schwarzschildRadius)
  }, [bhRadius, schwarzschildRadius])

  const [orbitingRadius, setOrbitingRadius] = useState(2e5)
  const [initialOrbitingDistance, setInitialOrbitingDistance] = useState(3e6)
  const [initialOrbitingTheta, setInitialOrbitingTheta] = useState(Math.PI / 2)
  const [initialOrbitingPhi, setInitialOrbitingPhi] = useState(0)
  const [orbitingColor, setOrbitingColor] = useState("#ffc0cb")

  const [initialOrbitingTimeVelocity, setInitialOrbitingTimeVelocity] = useState(0)
  const [initialOrbitingDistanceVelocity, setInitialOrbitingDistanceVelocity] = useState(0)
  const [initialOrbitingThetaVelocity, setInitialOrbitingThetaVelocity] = useState(0)
  const initialOrbitingThetaAngularVelocity = useMemo(() => initialOrbitingThetaVelocity / initialOrbitingDistance, [initialOrbitingThetaVelocity, initialOrbitingDistance])
  const [initialOrbitingPhiVelocity, setInitialOrbitingPhiVelocity] = useState(0)
  const initialOrbitingPhiAngularVelocity = useMemo(() => initialOrbitingPhiVelocity / initialOrbitingDistance, [initialOrbitingPhiVelocity, initialOrbitingDistance])
  const initialOrbitingVelocitySize = useMemo(() => getVectorSize([
    initialOrbitingTimeVelocity,
    initialOrbitingDistanceVelocity,
    initialOrbitingThetaAngularVelocity,
    initialOrbitingPhiAngularVelocity
  ], {
    r: initialOrbitingDistance,
    rs: schwarzschildRadius,
    theta: initialOrbitingTheta
  }), [
    initialOrbitingTimeVelocity,
    initialOrbitingDistanceVelocity,
    initialOrbitingThetaAngularVelocity,
    initialOrbitingPhiAngularVelocity,
    initialOrbitingDistance,
    schwarzschildRadius,
    initialOrbitingTheta
  ])
  useEffect(() => {
    setInitialOrbitingTimeVelocity(getTimeVelocity([
      initialOrbitingDistanceVelocity,
      initialOrbitingThetaAngularVelocity,
      initialOrbitingPhiAngularVelocity
    ], {
      r: initialOrbitingDistance,
      rs: schwarzschildRadius,
      theta: initialOrbitingTheta
    }))
  }, [
    initialOrbitingDistanceVelocity,
    initialOrbitingThetaAngularVelocity,
    initialOrbitingPhiAngularVelocity,
    initialOrbitingDistance,
    schwarzschildRadius,
    initialOrbitingTheta,
  ])

  const [orbitingTimeCoordinate, setOrbitingTimeCoordinate] = useState(0)
  const [orbitingDistance, setOrbitingDistance] = useState(0)
  const [orbitingTheta, setOrbitingTheta] = useState(0)
  const [orbitingPhi, setOrbitingPhi] = useState(0)

  const [orbitingTimeVelocity, setOrbitingTimeVelocity] = useState(0)
  const [orbitingDistanceVelocity, setOrbitingDistanceVelocity] = useState(0)
  const [orbitingThetaAngularVelocity, setOrbitingThetaAngularVelocity] = useState(0)
  const [orbitingPhiAngularVelocity, setOrbitingPhiAngularVelocity] = useState(0)
  const orbitingVelocitySize = useMemo(() => getVectorSize([
    orbitingTimeVelocity,
    orbitingDistanceVelocity,
    orbitingThetaAngularVelocity,
    orbitingPhiAngularVelocity
  ], {
    r: orbitingDistance,
    rs: schwarzschildRadius,
    theta: orbitingTheta
  }), [
    orbitingTimeVelocity,
    orbitingDistanceVelocity,
    orbitingThetaAngularVelocity,
    orbitingPhiAngularVelocity,
    orbitingDistance,
    schwarzschildRadius,
    orbitingTheta
  ])

  const [playing, setPlaying] = useState(false)

  const reset = useCallback(() => {
    setOrbitingTimeCoordinate(0)
    setOrbitingDistance(initialOrbitingDistance)
    setOrbitingTheta(initialOrbitingTheta)
    setOrbitingPhi(initialOrbitingPhi)

    setOrbitingTimeVelocity(initialOrbitingTimeVelocity)
    setOrbitingDistanceVelocity(initialOrbitingDistanceVelocity)
    setOrbitingThetaAngularVelocity(initialOrbitingThetaAngularVelocity)
    setOrbitingPhiAngularVelocity(initialOrbitingPhiAngularVelocity)
  }, [
    initialOrbitingDistance,
    initialOrbitingTheta,
    initialOrbitingPhi,

    initialOrbitingTimeVelocity,
    initialOrbitingDistanceVelocity,
    initialOrbitingThetaAngularVelocity,
    initialOrbitingPhiAngularVelocity,
  ])

  useEffect(() => {
    if (playing) return
    reset()
  }, [
    reset, playing
  ])

  const [panelVisible, setPanelVisible] = useState<"none" | "math" | "values" | "conversion">("values")

  return (
    <div className="w-full h-full">
      <Canvas>
        <CameraControls />
        <Skybox />
        <ambientLight />
        <directionalLight color="white" position={[10, 10, 10]} />
        <Sphere radius={bhRadius} color={bhColor} />
        <Sphere radius={orbitingRadius} color={orbitingColor} r={orbitingDistance} theta={orbitingTheta} phi={orbitingPhi} />
      </Canvas>
      <div className="w-full absolute top-0 flex flex-col">
        <div className="p-2 bg-opacity-90 bg-gray-400 flex gap-2">
          <button onClick={() => setPanelVisible(prev => prev === "math" ? "none" : "math")}>Math</button>
          <button onClick={() => setPanelVisible(prev => prev === "values" ? "none" : "values")}>Values</button>
          <button onClick={() => setPanelVisible(prev => prev === "conversion" ? "none" : "conversion")}>Conversion</button>
          <button onClick={() => setPlaying(prev => !prev)}>{playing ? "||" : ">"}</button>
        </div>
        {panelVisible === "math" &&
          <div className="p-4 bg-opacity-80 bg-gray-400 flex flex-col gap-2">
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

            <hr />
            <p>Metric tensor</p>
            <BlockMath math="g = diag(-(1 - \frac{r_s}{r}),\ (1 - \frac{r_s}{r})^{-1},\ r^2,\ r^2 \sin^2 \theta)" />

            <hr />

            <p>Vector size</p>
            <BlockMath math={String.raw`|V| = \sqrt{ V^a V^b g_{ab}}`} />

            <p>Since metric tensor <InlineMath math="g" /> has non zero elements only on its diagonals, it can be simplified to:</p>
            <BlockMath math={String.raw`|V| = \sqrt{ (V^a)^2 g_{aa}}`} />

            <hr />

            <p>Time velocity from spatial velocity</p>
            <BlockMath math={String.raw`|U|^2 = (U^t)^2 g_{tt} + (U^i)^2 g_{ii}`} />
            <BlockMath math={String.raw`(U^t)^2 g_{tt} = |U|^2 - (U^i)^2 g_{ii} `} />
            <BlockMath math={String.raw`(U^t)^2 = \frac{|U|^2 - (U^i)^2 g_{ii}}{g_{tt}}`} />
            <BlockMath math={String.raw`U^t = \sqrt{\frac{|U|^2 - (U^i)^2 g_{ii}}{g_{tt}}}`} />

            <p>Where <InlineMath math="i" /> are spatial coordinates, also <InlineMath math={String.raw`|U|^2 = -1?`} />, so we get:</p>
            <BlockMath math={String.raw`U^t = \sqrt{\frac{-1 - (U^i)^2 g_{ii}}{g_{tt}}}`} />
          </div>
        }
        {panelVisible === "values" &&
          <div className="p-4 bg-opacity-80 bg-gray-400 flex flex-col gap-2">
            <p>Massive body</p>
            <label>
              Weight:
              <input type="number" value={bhWeight} onChange={e => setBhWeight(+e.target.value)} />
              <InlineMath math="M_{\odot}" />
            </label>
            <label>
              Radius:
              <input type="number" value={bhRadius} onChange={e => setBhRadius(+e.target.value)} />
              <InlineMath math="m" />
              <button>Set to <InlineMath math="r_s" /></button>
            </label>
            <label>
              Color:
              <input type="color" value={bhColor} onChange={e => setBhColor(e.target.value)} />
            </label>

            <hr />

            <p>Orbiting body</p>
            <label>
              Radius:
              <input type="number" value={orbitingRadius} onChange={e => setOrbitingRadius(+e.target.value)} />
              <InlineMath math="m" />
            </label>
            <label>
              Color:
              <input type="color" value={orbitingColor} onChange={e => setOrbitingColor(e.target.value)} />
            </label>

            <p>Initial coordinates</p>
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

            <p>Initial velocity</p>
            <p><InlineMath math={String.raw`U_0 = (${initialOrbitingTimeVelocity}, ${initialOrbitingDistanceVelocity}, ${initialOrbitingThetaAngularVelocity}, ${initialOrbitingPhiAngularVelocity})`} />, <InlineMath math={String.raw`|U| = \sqrt{(U^a)^2 g_{aa}} = ${initialOrbitingVelocitySize}\ c = ${initialOrbitingVelocitySize * c}\ ms^{-1}`} /></p>
            {initialOrbitingVelocitySize > c && <p className="text-red-600">Warning: <InlineMath math={`|U| > c`} /></p>}
            <label>
              Distance:
              <input type="number" value={initialOrbitingDistanceVelocity} onChange={e => setInitialOrbitingDistanceVelocity(+e.target.value)} />
              <InlineMath math="ms^{-1}" />
            </label>
            <label>
              Theta:
              <input type="number" value={initialOrbitingThetaVelocity} onChange={e => setInitialOrbitingThetaVelocity(+e.target.value)} />
              <InlineMath math="ms^{-1}" />
            </label>
            <label>
              Phi:
              <input type="number" value={initialOrbitingPhiVelocity} onChange={e => setInitialOrbitingPhiVelocity(+e.target.value)} />
              <InlineMath math="ms^{-1}" />
            </label>

            <hr />

            <p><InlineMath math={String.raw`S = (${orbitingTimeCoordinate}, ${orbitingDistance}, ${orbitingTheta}, ${orbitingPhi})`} /></p>
            <p><InlineMath math={String.raw`U = (${orbitingTimeVelocity}, ${orbitingDistanceVelocity}, ${orbitingThetaAngularVelocity}, ${orbitingPhiAngularVelocity})`} />, <InlineMath math={String.raw`|U| = \sqrt{(U^a)^2 g_{aa}} = ${orbitingVelocitySize}\ c = ${orbitingVelocitySize * c}\ ms^{-1}`} /></p>
          </div>
        }
      </div>
    </div>
  )
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
