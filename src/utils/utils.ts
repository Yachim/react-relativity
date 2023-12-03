import { useMemo, useState } from "react";

export function useFrequency(initialFrequency: number, initialTimeScale: number) {
  const [frequency, setFrequency] = useState(initialFrequency)
  const [timeScale, setTimeScale] = useState(initialTimeScale)
  const period = useMemo(() => 1 / frequency, [frequency])
  const scaledPeriod = useMemo(() => period * timeScale, [period, timeScale])

  return {
    frequency,
    setFrequency,
    timeScale,
    setTimeScale,
    period,
    scaledPeriod
  }
}
