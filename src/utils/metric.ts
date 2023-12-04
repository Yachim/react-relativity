type MetricData = Record<"rs" | "r" | "theta", number>

export function metric({ rs, r, theta }: MetricData): [number, number, number, number] {
  return [
    1 - rs / r,
    -1 / (1 - rs / r),
    -Math.pow(r, 2),
    -Math.pow(r * Math.sin(theta), 2),
  ]
}

export function getVectorSizeSquared(vector: [number, number, number, number], metricData: MetricData): number {
  const tensor = metric(metricData)
  return vector.reduce((total, v, i) => total + (Math.pow(v, 2) * tensor[i]), 0)
}

export function getVectorSize(vector: [number, number, number, number], metricData: MetricData): number {
  const squared = getVectorSizeSquared(vector, metricData)
  return Math.sqrt(squared)
}

export function getTimeVelocity(vector: [number, number, number], metricData: MetricData): number {
  const tensor = metric(metricData)
  const spatialSizeSquared = vector.reduce((total, v, i) => total + Math.pow(v, 2) * tensor[i + 1])

  return Math.sqrt((1 - spatialSizeSquared) / tensor[0])
}
