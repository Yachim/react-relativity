// https://youtu.be/bI-FS7aZJpY
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react"
import { InlineMath } from "react-katex"

const siUnits = ["s", "m", "kg", "A", "K"] as const
const planckUnits = ["c", "G", "h", "e", "k"] as const

type SiUnits = typeof siUnits[number]
type PlanckUnits = typeof planckUnits[number]

const constants = [
  2.998E+08,
  6.674E-11,
  1.054E-34,
  8.854E-12,
  1.381E-23,
]

type UnitInputProps = ({
  origin: "si"
  si: [SiUnits, number][]
  planck: PlanckUnits[]
} | {
  origin: "planck"
  si: SiUnits[]
  planck: [PlanckUnits, number][]
}) & {
  valueUnits: "si" | "planck"
  value: number
  setValue: Dispatch<SetStateAction<number>>
}

const planckToSi = [
  [-1, -2, -1, 4, -2],
  [1, 3, 2, -3, 2],
  [0, -1, 1, -1, 1],
  [0, 0, 0, 2, 0],
  [0, 0, 0, 0, -1],
] as const

const siToPlank = [
  [-2.5, -1.5, 0.5, 3, 2.5],
  [0.5, 0.5, -0.5, -0.5, -0.5],
  [0.5, 0.5, 0.5, 0, 0.5],
  [0, 0, 0, 0.5, 0],
  [0, 0, 0, 0, -1],
] as const

type UnitVector = [number, number, number, number, number]

function convertUnit(
  matrix: typeof siToPlank | typeof planckToSi,
  unit: UnitVector
): UnitVector {
  const result: UnitVector = Array(5).fill(0) as UnitVector;

  for (let i = 0; i < matrix.length; i++) {
    let sum = 0;
    for (let j = 0; j < matrix[i].length; j++) {
      sum += matrix[i][j] * unit[j];
    }
    result[i] = sum
  }

  return result;
}

function makeUnit(
  unit: [SiUnits | PlanckUnits, number][]
) {
  return unit.map(([u, exponent]) => {
    if (exponent == 0) return ""

    let unit: string = u
    switch (unit) {
      case "h":
        unit = String.raw`\hbar`
        break
      case "e":
        unit = String.raw`\epsilon_0`
        break
      case "k":
        unit = "k_B"
        break
    }
    if (exponent != 1) unit += `^{${exponent}}`
    return unit
  }).join(" ")
}

function convertValue(value: number, vector: UnitVector, direction: "toSi" | "fromSi") {
  let constantsUsed = constants
  if (direction === "fromSi") {
    constantsUsed = constantsUsed.map(value => 1 / value)
  }

  const product = vector.reduce((product, exponent, i) => {
    return product * Math.pow(constantsUsed[i], exponent)
  }, 1)
  return value * product
}

export default function UnitInput({ origin, si, planck, valueUnits, value, setValue }: UnitInputProps) {
  const [siVector, planckVector] = useMemo(() => {
    let siVector: UnitVector = Array(5).fill(0) as UnitVector
    let planckVector: UnitVector = Array(5).fill(0) as UnitVector

    if (origin === "si") {
      si.forEach(([unit, exponent]) => {
        const unitIndex = siUnits.indexOf(unit)
        siVector[unitIndex] = exponent
      })
      planckVector = convertUnit(siToPlank, siVector)
    }
    else if (origin === "planck") {
      planck.forEach(([unit, exponent]) => {
        const unitIndex = planckUnits.indexOf(unit)
        planckVector[unitIndex] = exponent
      })
      siVector = convertUnit(planckToSi, planckVector)
    }

    return [siVector, planckVector]
  }, [origin, planck, si])

  const [siData, planckData] = useMemo(() => {
    let siData: [SiUnits, number][] = []
    let planckData: [PlanckUnits, number][] = []

    if (origin === "si") {
      siData = si
      planckData = planck.map(unit => {
        const unitIndex = planckUnits.indexOf(unit)
        return [unit, planckVector[unitIndex]]
      })
    }
    else if (origin === "planck") {
      planckData = planck
      siData = si.map(unit => {
        const unitIndex = siUnits.indexOf(unit)
        return [unit, siVector[unitIndex]]
      })
    }

    return [siData, planckData]
  }, [origin, planck, si, siVector, planckVector])

  const [siText, planckText] = useMemo(() => {
    const siText = makeUnit(siData)
    const planckText = makeUnit(planckData)

    return [siText, planckText]
  }, [siData, planckData])

  const [siValue, setSiValue] = useState<number>(0)
  const [planckValue, setPlanckValue] = useState<number>(0)

  useEffect(() => {
    if (valueUnits === "si") {
      setValue(siValue)
    }
    else if (valueUnits === "planck") {
      setValue(planckValue)
    }
  }, [siValue, planckValue, valueUnits, setValue])

  useEffect(() => {
    if (valueUnits === "si") {
      setSiValue(value)
    }
    else if (valueUnits === "planck") {
      setPlanckValue(value)
    }
  }, [setSiValue, setPlanckValue, valueUnits, value])

  return <div>
    <label>
      <input type="number" value={siValue} onChange={e => {
        const value = +e.target.value
        setSiValue(value)
        setPlanckValue(convertValue(value, planckVector, "fromSi"))
      }} /> <InlineMath math={siText} />
    </label>
    <label>
      <input type="number" value={planckValue} onChange={e => {
        const value = +e.target.value
        setPlanckValue(value)
        setSiValue(convertValue(value, planckVector, "toSi"))
      }} /> <InlineMath math={planckText} />
    </label >
  </div>
}
