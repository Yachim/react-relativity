import { Canvas, Color, extend, useFrame, useLoader, useThree } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { TextureLoader } from "three"
import { OrbitControls } from "three/examples/jsm/Addons.js"
import * as THREE from "three"
import { solarMass } from "./utils/constants"
import { BlockMath, InlineMath } from "react-katex"

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

const scale = 5e30

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
  const [bhWeight, setBhWeight] = useState(1) // solar mass
  const bhWeightKg = useMemo(() => bhWeight * solarMass, [bhWeight])
  const schwarzschildRadius = useMemo(() => bhWeightKg * 2, [bhWeightKg])
  const [bhRadius, setBhRadius] = useState(1)
  const [bhColor, setBhColor] = useState("#505050")

  useEffect(() => {
    if (bhRadius < schwarzschildRadius) setBhRadius(schwarzschildRadius)
  }, [bhRadius, schwarzschildRadius])

  const [orbitingRadius, setOrbitingRadius] = useState(2e30)
  const [initialOrbitingDistance, setInitialOrbitingDistance] = useState(2e31)
  const [initialOrbitingTheta, setInitialOrbitingTheta] = useState(Math.PI / 2)
  const [initialOrbitingPhi, setInitialOrbitingPhi] = useState(0)
  const [orbitingColor, setOrbitingColor] = useState("#ffc0cb")

  const [initialOrbitingTimeVelocity, setInitialOrbitingTimeVelocity] = useState(0)
  const [initialOrbitingDistanceVelocity, setInitialOrbitingDistanceVelocity] = useState(0)
  const [initialOrbitingThetaVelocity, setInitialOrbitingThetaVelocity] = useState(0)
  const initialOrbitingThetaAngularVelocity = useMemo(() => initialOrbitingThetaVelocity / initialOrbitingDistance, [initialOrbitingThetaVelocity, initialOrbitingDistance])
  const [initialOrbitingPhiVelocity, setInitialOrbitingPhiVelocity] = useState(0)
  const initialOrbitingPhiAngularVelocity = useMemo(() => initialOrbitingPhiVelocity / initialOrbitingDistance, [initialOrbitingPhiVelocity, initialOrbitingDistance])

  const [orbitingTimeCoordinate, setOrbitingTimeCoordinate] = useState(0)
  const [orbitingDistance, setOrbitingDistance] = useState(0)
  const [orbitingTheta, setOrbitingTheta] = useState(0)
  const [orbitingPhi, setOrbitingPhi] = useState(0)

  const [orbitingTimeVelocity, setOrbitingTimeVelocity] = useState(0)
  const [orbitingDistanceVelocity, setOrbitingDistanceVelocity] = useState(0)
  const [orbitingThetaAngularVelocity, setOrbitingThetaAngularVelocity] = useState(0)
  const [orbitingPhiAngularVelocity, setOrbitingPhiAngularVelocity] = useState(0)

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

            {/* TODO: show velocity vectors */}
            <p>Initial velocity</p>
            <p><InlineMath math={String.raw`U_0 = (${orbitingTimeVelocity}, ${orbitingDistanceVelocity}, ${orbitingThetaAngularVelocity}, ${orbitingPhiAngularVelocity})`} />, <InlineMath math={String.raw`|U| = \sqrt{U^a U^b g_{ab}} = `} /></p>
            <label>
              Distance:
              <input type="number" value={initialOrbitingDistanceVelocity} onChange={e => setInitialOrbitingDistanceVelocity(+e.target.value)} />
              <InlineMath math="m" />
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
