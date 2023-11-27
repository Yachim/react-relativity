// https://youtu.be/bI-FS7aZJpY
import { useMemo } from "react"
import { InlineMath } from "react-katex"

const siUnits = ["s", "m", "kg", "A", "K"] as const
const planckUnits = ["c", "G", "h", "e", "k"] as const

export type SiUnits = typeof siUnits[number]
export type PlanckUnits = typeof planckUnits[number]

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
  setValue: (val: number) => void
}

export const planckToSi = [
  [-1, -2, -1, 4, -2],
  [1, 3, 2, -3, 2],
  [0, -1, 1, -1, 1],
  [0, 0, 0, 2, 0],
  [0, 0, 0, 0, -1],
] as const

export const siToPlanck = [
  [-2.5, -1.5, 0.5, 3, 2.5],
  [0.5, 0.5, -0.5, -0.5, -0.5],
  [0.5, 0.5, 0.5, 0, 0.5],
  [0, 0, 0, 0.5, 0],
  [0, 0, 0, 0, -1],
] as const

export type UnitVector = [number, number, number, number, number]

export function convertUnit(
  matrix: typeof siToPlanck | typeof planckToSi,
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

export function makeUnit(
  unit: [SiUnits | PlanckUnits, number][]
) {
  return unit.map(([u, exponent]) => {
    if (exponent == 0) return ""

    let unitText: string = u
    switch (unitText) {
      case "h":
        unitText = String.raw`\hbar`
        break
      case "e":
        unitText = String.raw`\epsilon_0`
        break
      case "k":
        unitText = "k_B"
        break
    }
    if (exponent != 1) unitText += `^{${exponent}}`
    return unitText
  }).join(" ")
}

export function convertValue(value: number, vector: UnitVector, direction: "toSi" | "toPlanck") {
  let constantsUsed = constants
  if (direction === "toPlanck") {
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
      planckVector = convertUnit(siToPlanck, siVector)
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

  const planckValue = useMemo(() => {
    if (valueUnits === "planck") {
      return value
    }
    else if (valueUnits === "si") {
      return convertValue(value, planckVector, "toPlanck")
    }
  }, [valueUnits, value, planckVector])

  const siValue = useMemo(() => {
    if (valueUnits === "planck") {
      return convertValue(value, planckVector, "toSi")
    }
    else if (valueUnits === "si") {
      return value
    }
  }, [valueUnits, value, planckVector])

  return <div className="flex gap-6">
    <label>
      <input type="number" value={planckValue} onChange={e => {
        const value = +e.target.value

        if (valueUnits === "planck") {
          setValue(value)
        }
        else if (valueUnits === "si") {
          setValue(convertValue(value, planckVector, "toSi"))
        }
      }} /> <InlineMath math={planckText} />
    </label >
    <label>
      <input type="number" value={siValue} onChange={e => {
        const value = +e.target.value
        if (valueUnits === "planck") {
          setValue(convertValue(value, planckVector, "toPlanck"))
        }
        else if (valueUnits === "si") {
          setValue(value)
        }
      }} /> <InlineMath math={siText} />
    </label>
  </div>
}
