import { G, c, solarMass } from "./constants";

export function solarMassToGeometrized(value: number): number {
  const factor = Math.pow(c, 2) * Math.pow(G, -1)
  const siMass = value * solarMass
  return siMass / factor
}
