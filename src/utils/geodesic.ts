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

type ChristoffelData = Record<"rs" | "r" | "theta", number>

// [t, r, (t)h(eta), p(hi)]
function christoffel({ rs, r, theta }: ChristoffelData): number[][][] {
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

export function nextVelocities(
  velocities: [number, number, number, number],
  christoffelData: ChristoffelData,
  stepSize: number,
  iterationCnt: number,
): [number, number, number, number] {
  const cSymbols = christoffel(christoffelData)

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
