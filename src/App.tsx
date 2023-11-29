import { Canvas, Color, extend, useFrame, useLoader, useThree } from "@react-three/fiber"
import { useMemo, useRef, useState } from "react"
import { TextureLoader } from "three"
import { OrbitControls } from "three/examples/jsm/Addons.js"
import * as THREE from "three"

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

function Sphere({ radius, r, theta, phi, color }: SphereProps) {
  const { x, y, z } = useMemo(() => radialToCartesian({ r, theta, phi }), [r, theta, phi])

  console.table({ x, y, z })
  return (
    <mesh
      position={[x, y, z]}
    >
      <sphereGeometry args={[radius]} />
      <meshStandardMaterial color={color ?? "#505050"} />
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

// weight in solar mass, distance in meters, speed in lightSpeed, time in seconds
// initial velocity of angles is not in angular velocity, but normal velocity (v = omega * r => omega = v/r)
//  - v: speed
//  - omega: angular velocity
//  - r: radius/distance
export default function App() {
  const [bhWeight, setBhWeight] = useState(0)
  const [bhRadius, setBhRadius] = useState(1)

  const [orbitingRadius, setOrbitingRadius] = useState(0.5)
  const [orbitingDistance, setOrbitingDistance] = useState(3)
  const [orbitingTheta, setOrbitingTheta] = useState(Math.PI / 2)
  const [orbitingPhi, setOrbitingPhi] = useState(0)

  const [panelVisible, setPanelVisible] = useState<"none" | "math" | "values" | "conversion">("values")

  return (
    <div className="w-full h-full">
      <Canvas>
        <CameraControls />
        <Skybox />
        <ambientLight />
        <directionalLight color="white" position={[10, 10, 10]} />
        <Sphere radius={bhRadius} />
        <Sphere radius={orbitingRadius} color={"pink"} r={orbitingDistance} theta={orbitingTheta} phi={orbitingPhi} />
      </Canvas>
      <div className="w-full absolute top-0 flex flex-col">
        <div className="p-2 bg-opacity-90 bg-gray-400 flex gap-2">
          <button onClick={() => setPanelVisible(prev => prev === "math" ? "none" : "math")}>Math</button>
          <button onClick={() => setPanelVisible(prev => prev === "values" ? "none" : "values")}>Values</button>
          <button onClick={() => setPanelVisible(prev => prev === "conversion" ? "none" : "conversion")}>Conversion</button>
        </div>
        {panelVisible === "values" &&
          <div className="p-4 bg-opacity-80 bg-gray-400 flex flex-col gap-2">
            <label>
              Black hole weight:
              <input type="number" value={bhWeight} onChange={e => setBhWeight(+e.target.value)} />
            </label>
            <label>
              Black hole radius:
              <input type="number" value={bhRadius} onChange={e => setBhRadius(+e.target.value)} />
            </label>

            <br />

            <label>
              Orbiting body radius:
              <input type="number" value={orbitingRadius} onChange={e => setOrbitingRadius(+e.target.value)} />
            </label>
            <label>
              Orbiting body distance:
              <input type="number" value={orbitingDistance} onChange={e => setOrbitingDistance(+e.target.value)} />
            </label>
            <label>
              Orbiting body theta:
              <input type="number" value={orbitingTheta} onChange={e => setOrbitingTheta(+e.target.value)} />
            </label>
            <label>
              Orbiting body phi:
              <input type="number" value={orbitingPhi} onChange={e => setOrbitingPhi(+e.target.value)} />
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
