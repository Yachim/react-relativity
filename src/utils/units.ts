import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { G, c, solarMass } from "./constants";

function solarMassToGeometrized(value: number): number {
  const factor = Math.pow(c, 2) * Math.pow(G, -1)
  const siMass = value * solarMass
  return siMass / factor
}

export function useMass(initialValue: number): {
  solarMass: number
  setSolarMass: Dispatch<SetStateAction<number>>
  geometrizedMass: number
} {
  const [solarMass, setSolarMass] = useState(initialValue)
  const geometrizedMass = useMemo(() => solarMassToGeometrized(solarMass), [solarMass])
  return { solarMass, setSolarMass, geometrizedMass }
}

// also applies to angular velocity
function velocityToGeometrized(value: number): number {
  return value / c
}
//
// also applies to angular velocity
export function velocityToSI(value: number): number {
  return value * c
}

export function useVelocity(initialValue: number, playing: boolean): {
  initialVelocity: number
  setInitialVelocity: Dispatch<SetStateAction<number>>
  initialGeometrizedVelocity: number
  velocity: number
  setVelocity: Dispatch<SetStateAction<number>>
  geometrizedVelocity: number
} {
  const [initialVelocity, setInitialVelocity] = useState(initialValue)
  const initialGeometrizedVelocity = useMemo(() => velocityToGeometrized(initialVelocity), [initialVelocity])

  const [velocity, setVelocity] = useState(initialValue)
  const geometrizedVelocity = useMemo(() => velocityToGeometrized(velocity), [velocity])

  useEffect(() => {
    if (playing) return;
    setVelocity(initialVelocity)
  }, [playing, initialVelocity])

  return {
    initialVelocity,
    setInitialVelocity,
    initialGeometrizedVelocity,
    velocity,
    setVelocity,
    geometrizedVelocity,
  }
}

export function useAngularVelocity(initialValue: number, distance: number, playing: boolean): {
  initialVelocity: number
  setInitialVelocity: Dispatch<SetStateAction<number>>
  initialAngularVelocity: number
  initialGeometrizedAngularVelocity: number
  velocity: number
  angularVelocity: number
  setAngularVelocity: Dispatch<SetStateAction<number>>
  geometrizedAngularVelocity: number
} {
  const [initialVelocity, setInitialVelocity] = useState(initialValue)
  const initialAngularVelocity = useMemo(() => initialVelocity / distance, [initialVelocity, distance])
  const initialGeometrizedAngularVelocity = useMemo(() => velocityToGeometrized(initialVelocity), [initialVelocity])

  const [angularVelocity, setAngularVelocity] = useState(initialAngularVelocity)
  const velocity = useMemo(() => angularVelocity * distance, [angularVelocity, distance])
  const geometrizedAngularVelocity = useMemo(() => velocityToGeometrized(velocity), [velocity])

  useEffect(() => {
    if (playing) return;
    setAngularVelocity(initialAngularVelocity)
  }, [playing, initialAngularVelocity])

  return {
    initialVelocity,
    setInitialVelocity,
    initialAngularVelocity,
    initialGeometrizedAngularVelocity,
    velocity,
    angularVelocity,
    setAngularVelocity,
    geometrizedAngularVelocity,
  }
}

export function useTimeVelocity(initialValue: number, playing: boolean): {
  initialVelocity: number
  setInitialVelocity: Dispatch<SetStateAction<number>>
  velocity: number
  setVelocity: Dispatch<SetStateAction<number>>
} {
  const [initialVelocity, setInitialVelocity] = useState(initialValue)

  const [velocity, setVelocity] = useState(initialValue)

  useEffect(() => {
    if (playing) return;
    setVelocity(initialVelocity)
  }, [playing, initialVelocity])

  return {
    initialVelocity,
    setInitialVelocity,
    velocity,
    setVelocity,
  }
}

export function useCoordinate(initialValue: number, playing: boolean): {
  initialCoordinate: number
  setInitialCoordinate: Dispatch<SetStateAction<number>>
  coordinate: number
  setCoordinate: Dispatch<SetStateAction<number>>
} {
  const [initialCoordinate, setInitialCoordinate] = useState(initialValue)

  const [coordinate, setCoordinate] = useState(initialValue)

  useEffect(() => {
    if (playing) return;
    setCoordinate(initialCoordinate)
  }, [playing, initialCoordinate])

  return {
    initialCoordinate,
    setInitialCoordinate,
    coordinate,
    setCoordinate,
  }
}
