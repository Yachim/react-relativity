import { fa1 } from "@fortawesome/free-solid-svg-icons"

export function nextCoordinates(
  coordinates: [number, number, number, number],
  velocities: [number, number, number, number],
  stepSize: number,
  iterationCnt: number,
): [number, number, number, number] {
  return coordinates.map((coord, a) => {
    let newCoord = coord

    for (let i = 0; i < iterationCnt; i++) {
      newCoord += stepSize * velocities[a]
    }

    return newCoord
  }) as [number, number, number, number]
}

type BaseChristoffelData = Record<"rs" | "r" | "theta", number>
type SchwarzschildChristoffelData = BaseChristoffelData & { kerr: false }
type KerrChristoffelData = BaseChristoffelData & { kerr: true, a: number }
type ChristoffelData = SchwarzschildChristoffelData | KerrChristoffelData

// [t, r, (t)h(eta), p(hi)]
function schwarzschildChristoffel({ rs, r, theta }: SchwarzschildChristoffelData): number[][][] {
  const christoffel: number[][][] = Array(4).fill(0).map(
    () => Array(4).fill(0).map(
      () => Array(4).fill(0)
    )
  )

  const rMinusRs = r - rs
  const rsMinusR = rs - r

  christoffel[0][1][0] = rs / (2 * r * rMinusRs) // trt
  christoffel[1][1][1] = -christoffel[0][1][0] // rrr
  christoffel[1][0][0] = (rs * rMinusRs) / (2 * Math.pow(r, 3)) // rtt
  christoffel[1][3][3] = rsMinusR * Math.pow(Math.sin(theta), 2) // rpp
  christoffel[1][2][2] = rsMinusR // rhh
  christoffel[2][1][2] = 1 / r // hrh
  christoffel[3][1][3] = christoffel[2][1][2] // prp
  christoffel[2][3][3] = -Math.sin(theta) * Math.cos(theta) // hpp
  christoffel[3][2][3] = 1 / Math.tan(theta) // php

  // FIXME: symmetry?
  christoffel[0][0][1] = christoffel[0][1][0]
  christoffel[2][2][1] = christoffel[2][1][2]
  christoffel[3][3][1] = christoffel[3][1][3]
  christoffel[3][3][2] = christoffel[3][2][3]

  return christoffel
}

function kerrChristoffel({ rs, r, theta, a }: KerrChristoffelData): number[][][] {
  const christoffel: number[][][] = Array(4).fill(0).map(
    () => Array(4).fill(0).map(
      () => Array(4).fill(0)
    )
  )

  //const rMinusRs = r - rs
  //const rsMinusR = rs - r

  const sigma = Math.pow(r, 2) + Math.pow(a * Math.cos(theta), 2)
  const delta = Math.pow(r, 2) - rs * r + Math.pow(a, 2)

  const sinTheta = Math.sin(theta)
  const cosTheta = Math.cos(theta)
  const cotTheta = 1 / Math.tan(theta)
  const aCosTheta2 = Math.pow(a * cosTheta, 2)
  const aSinTheta2 = Math.pow(a * sinTheta, 2)
  const r2MinusACosTheta2 = Math.pow(r, 2) - aCosTheta2

  const A = a

  // https://arxiv.org/pdf/0904.4184.pdf
  christoffel[1][0][0] = (rs * delta * r2MinusACosTheta2) / (2 * Math.pow(sigma, 3))
  christoffel[0][0][1] = (rs * (Math.pow(r, 2) + Math.pow(a, 2)) * r2MinusACosTheta2) / (2 * Math.pow(sigma, 2) * delta)
  christoffel[0][0][2] = -(rs * Math.pow(a, 2) * r * sinTheta * cosTheta) / (Math.pow(sigma, 2))
  christoffel[1][0][3] = -(delta * rs * a * Math.pow(sinTheta, 2) * r2MinusACosTheta2) / (2 * Math.pow(sigma, 3))
  christoffel[1][1][1] = (2 * r * aSinTheta2 - rs * r2MinusACosTheta2) / (2 * sigma * delta)
  christoffel[1][1][2] = -(Math.pow(a, 2) * sinTheta * cosTheta) / sigma
  christoffel[1][2][2] = -(r * delta) / sigma
  christoffel[3][2][3] = cotTheta / Math.pow(sigma, 2) * (Math.pow(sigma, 2) + rs * r * aSinTheta2)

  christoffel[2][0][0] = -(rs * Math.pow(a, 2) * r * sinTheta * cosTheta) / Math.pow(sigma, 3)
  christoffel[3][0][1] = (rs * a * r2MinusACosTheta2) / (2 * Math.pow(sigma, 2) * delta)
  christoffel[3][0][2] = -(rs * a * r * cotTheta) / (Math.pow(sigma, 2))
  christoffel[2][0][3] = (rs * a * r * (Math.pow(r, 2) + Math.pow(a, 2)) * sinTheta * cosTheta) / Math.pow(sigma, 3)
  christoffel[2][1][1] = (Math.pow(a, 2) * sinTheta * cosTheta) / (sigma * delta)
  christoffel[2][1][2] = r / sigma
  christoffel[2][2][2] = -(Math.pow(a, 2) * sinTheta * cosTheta) / sigma
  christoffel[0][2][3] = (rs * Math.pow(a, 3) * r * Math.pow(sinTheta, 3) * cosTheta) / Math.pow(sigma, 2)

  christoffel[0][1][3] = rs * a * Math.pow(sinTheta, 2) * (aCosTheta2 * (Math.pow(a, 2) - Math.pow(r, 2)) - Math.pow(r, 2) * (Math.pow(a, 2) + 3 * Math.pow(r, 2))) / 2 * Math.pow(sigma, 2) * delta
  christoffel[3][1][3] = (2 * r * Math.pow(sigma, 2) + rs * (Math.pow(a, 4) * Math.pow(sinTheta, 2) * Math.pow(cosTheta, 2) - Math.pow(r, 2) * (sigma + Math.pow(r, 2) + Math.pow(a, 2)))) / 2 * Math.pow(sigma, 2) * delta
  christoffel[1][3][3] = delta * Math.pow(sinTheta, 2) / (2 * Math.pow(sigma, 3)) * (-2 * r * Math.pow(sigma, 2) + rs * aSinTheta2 * (Math.pow(r, 2) - aCosTheta2))
  christoffel[2][3][3] = -sinTheta * cosTheta / Math.pow(sigma, 3) * (A * sigma + (Math.pow(r, 2) + Math.pow(a, 2)) * rs * r * aSinTheta2)

  // FIXME: symmetry?
  christoffel[0][1][0] = christoffel[0][0][1]
  christoffel[0][2][0] = christoffel[0][0][2]
  christoffel[1][3][0] = christoffel[1][0][3]
  christoffel[1][2][1] = christoffel[1][1][2]
  christoffel[3][3][2] = christoffel[3][2][3]

  christoffel[3][1][0] = christoffel[3][0][1]
  christoffel[3][2][0] = christoffel[3][0][2]
  christoffel[2][3][0] = christoffel[2][0][3]
  christoffel[2][2][1] = christoffel[2][1][2]
  christoffel[0][3][2] = christoffel[0][2][3]

  christoffel[0][3][1] = christoffel[0][1][3]
  christoffel[3][3][1] = christoffel[3][1][3]

  return christoffel
}

export function nextVelocities(
  velocities: [number, number, number, number],
  christoffelData: ChristoffelData,
  stepSize: number,
  iterationCnt: number,
): [number, number, number, number] {
  const cSymbols = christoffelData.kerr ? kerrChristoffel(christoffelData) : schwarzschildChristoffel(christoffelData)

  return velocities.map((va, a) => {
    let newVelocity = va

    for (let i = 0; i < iterationCnt; i++) {
      newVelocity -= stepSize * velocities.reduce((sumB, vb, b) =>
        sumB + velocities.reduce((sumC, vc, c) =>
          sumC + vc * vb * cSymbols[a][b][c]
          , 0)
        , 0)
    }

    return newVelocity
  }) as [number, number, number, number]
}
