import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { G, c, solarMass } from "./constants";

function solarMassToSi(value: number): number {
  return value * solarMass
}

function siMassToGeometrized(value: number): number {
  const factor = Math.pow(c, 2) * Math.pow(G, -1)
  return value / factor
}

function solarMassToGeometrized(value: number): number {
  return siMassToGeometrized(solarMassToSi(value))
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

// also applies to angular velocity
export function velocityToSI(value: number): number {
  return value * c
}

export type State = "playing" | "paused" | "stopped"
export function useVelocity(initialValue: number, state: State): {
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
    if (state !== "stopped") return;
    setVelocity(initialVelocity)
  }, [state, initialVelocity])

  return {
    initialVelocity,
    setInitialVelocity,
    initialGeometrizedVelocity,
    velocity,
    setVelocity,
    geometrizedVelocity,
  }
}

export function useAngularVelocity(initialValue: number, initialDistance: number, distance: number, state: State): {
  initialVelocity: number
  setInitialVelocity: Dispatch<SetStateAction<number>>
  initialGeometrizedVelocity: number
  initialAngularVelocity: number
  initialGeometrizedAngularVelocity: number
  velocity: number
  geometrizedVelocity: number
  angularVelocity: number
  geometrizedAngularVelocity: number
  setGeometrizedAngularVelocity: Dispatch<SetStateAction<number>>
} {
  const [initialVelocity, setInitialVelocity] = useState(initialValue)
  const initialGeometrizedVelocity = useMemo(() => velocityToGeometrized(initialVelocity), [initialVelocity])
  const initialAngularVelocity = useMemo(() => initialVelocity / initialDistance, [initialVelocity, initialDistance])
  const initialGeometrizedAngularVelocity = useMemo(() => velocityToGeometrized(initialAngularVelocity), [initialAngularVelocity])

  const [geometrizedAngularVelocity, setGeometrizedAngularVelocity] = useState(initialGeometrizedAngularVelocity)
  const angularVelocity = useMemo(() => velocityToSI(geometrizedAngularVelocity), [geometrizedAngularVelocity])
  const velocity = useMemo(() => angularVelocity * distance, [angularVelocity, distance])
  const geometrizedVelocity = useMemo(() => geometrizedAngularVelocity * distance, [geometrizedAngularVelocity, distance])

  useEffect(() => {
    if (state !== "stopped") return;
    setGeometrizedAngularVelocity(initialGeometrizedAngularVelocity)
  }, [state, initialGeometrizedAngularVelocity])

  return {
    initialVelocity,
    setInitialVelocity,
    initialGeometrizedVelocity,
    initialAngularVelocity,
    initialGeometrizedAngularVelocity,
    velocity,
    geometrizedVelocity,
    angularVelocity,
    geometrizedAngularVelocity,
    setGeometrizedAngularVelocity,
  }
}

export function useTimeVelocity(initialValue: number, state: State): {
  initialVelocity: number
  setInitialVelocity: Dispatch<SetStateAction<number>>
  velocity: number
  setVelocity: Dispatch<SetStateAction<number>>
} {
  const [initialVelocity, setInitialVelocity] = useState(initialValue)

  const [velocity, setVelocity] = useState(initialValue)

  useEffect(() => {
    if (state !== "stopped") return;
    setVelocity(initialVelocity)
  }, [state, initialVelocity])

  return {
    initialVelocity,
    setInitialVelocity,
    velocity,
    setVelocity,
  }
}

export function useCoordinate(initialValue: number, state: State): {
  initialCoordinate: number
  setInitialCoordinate: Dispatch<SetStateAction<number>>
  coordinate: number
  setCoordinate: Dispatch<SetStateAction<number>>
} {
  const [initialCoordinate, setInitialCoordinate] = useState(initialValue)

  const [coordinate, setCoordinate] = useState(initialValue)

  useEffect(() => {
    if (state !== "stopped") return;
    setCoordinate(initialCoordinate)
  }, [state, initialCoordinate])

  return {
    initialCoordinate,
    setInitialCoordinate,
    coordinate,
    setCoordinate,
  }
}

function angularMomentumToGeometrized(value: number): number {
  const factor = Math.pow(c, 3) * Math.pow(G, -1)
  return value / factor
}

export function useAngularMomentum(initialValue: number) {
  const [angularMomentum, setAngularMomentum] = useState(initialValue)
  const angularMomentumGeometrized = useMemo(() => angularMomentumToGeometrized(angularMomentum), [angularMomentum])

  return {
    angularMomentum,
    setAngularMomentum,
    angularMomentumGeometrized
  }
}

export let testExports: {
  solarMassToSi: typeof solarMassToSi,
  siMassToGeometrized: typeof siMassToGeometrized,
  solarMassToGeometrized: typeof solarMassToGeometrized,
  velocityToGeometrized: typeof velocityToGeometrized,
} | undefined = undefined
if (process.env.NODE_ENV === "test") {
  testExports = {
    solarMassToSi,
    siMassToGeometrized,
    solarMassToGeometrized,
    velocityToGeometrized
  }
}
