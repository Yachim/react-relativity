type BaseMetricData = Record<"rs" | "r" | "theta", number>
type SchwarzschildMetricData = BaseMetricData & { kerr: false }
type KerrMetricData = BaseMetricData & { kerr: true, a: number }
type MetricData = SchwarzschildMetricData | KerrMetricData

function schwarzschildMetric({ rs, r, theta }: SchwarzschildMetricData): number[][] {
  const metric: number[][] = Array(4).fill(0).map(
    () => Array(4).fill(0)
  )

  metric[0][0] = 1 - rs / r
  metric[1][1] = -1 / (1 - rs / r)
  metric[2][2] = -Math.pow(r, 2)
  metric[3][3] = -Math.pow(r * Math.sin(theta), 2)

  return metric
}

function kerrMetric({ rs, r, theta, a }: KerrMetricData): number[][] {
  const metric: number[][] = Array(4).fill(0).map(
    () => Array(4).fill(0)
  )

  const sigma = Math.pow(r, 2) + Math.pow(a * Math.cos(theta), 2)
  const delta = Math.pow(r, 2) - rs * r + Math.pow(a, 2)
  const sinTheta2 = Math.pow(Math.sin(theta), 2)

  metric[0][0] = -(1 - (rs * r) / sigma)
  metric[1][1] = sigma / delta
  metric[2][2] = sigma
  metric[3][3] = (Math.pow(r, 2) + Math.pow(a, 2) + (rs * r * a) / sigma * sinTheta2) * sinTheta2
  metric[1][3] = (rs * r * a * sinTheta2) / sigma
  metric[3][1] = metric[1][3]

  return metric
}

export function getVectorSizeSquared(vector: [number, number, number, number], metricData: MetricData): number {
  const tensor = metricData.kerr ? kerrMetric(metricData) : schwarzschildMetric(metricData)
  let total = 0
  vector.forEach((vecA, a) =>
    vector.forEach((vecB, b) =>
      total += (tensor[a][b] * vecA * vecB)
    )
  )

  return total
}

export function getVectorSize(vector: [number, number, number, number], metricData: MetricData): number {
  const squared = getVectorSizeSquared(vector, metricData)
  return Math.sqrt(squared)
}

export function getTimeVelocity(vector: [number, number, number], metricData: MetricData): [number, number] {
  const tensor = metricData.kerr ? kerrMetric(metricData) : schwarzschildMetric(metricData)
  let spatialSum = 0
  vector.forEach((vecA, a) =>
    vector.forEach((vecB, b) =>
      spatialSum += (tensor[a + 1][b + 1] * vecA * vecB)
    )
  )

  // U^a g_{ta}
  const gtaSum = vector.reduce((total, value, i) =>
    total + value * tensor[0][i + 1]
    , 0)

  const sqrtD = Math.sqrt(Math.pow(gtaSum, 2) - tensor[0][0] * (spatialSum - 1))
  return [
    (-gtaSum + sqrtD) / tensor[0][0],
    (-gtaSum - sqrtD) / tensor[0][0],
  ]
}
