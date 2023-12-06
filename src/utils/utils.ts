import { useEffect, useMemo, useState } from "react";

export function useFrequency(initialFrequency: number, initialTimeScale: number) {
  const [frequency, setFrequency] = useState(initialFrequency)
  const [timeScale, setTimeScale] = useState(initialTimeScale)
  // used in nextCoordinates/nextVelocities as iterationCnt
  const [iterationCnt, setIterationCnt] = useState(initialTimeScale)

  // used in setInterval
  const period = useMemo(() => 1 / frequency, [frequency])

  // used in nextCoordinates/nextVelocities as stepSize
  const scaledPeriod = useMemo(() => (period * timeScale) / iterationCnt, [timeScale, period, iterationCnt])

  return {
    frequency,
    setFrequency,
    timeScale,
    setTimeScale,
    iterationCnt,
    setIterationCnt,
    period,
    scaledPeriod
  }
}
