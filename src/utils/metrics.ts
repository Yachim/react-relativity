// using natural units (c, G set = 1)
// using -, +, +, +
type MinkowskiMetricArgs = never
type SchwarzschildMetricArgs = {
  r: number,
  rs: number, // 2M
  theta: number,
}

type MetricArgs = MinkowskiMetricArgs | SchwarzschildMetricArgs

type MinkowskiChristoffelArgs = never
type SchwarzschildChristoffelArgs = {
  r: number,
  m: number,
  rs: number, // 2M
  theta: number,
}

type ChristoffelArgs = MinkowskiChristoffelArgs | SchwarzschildChristoffelArgs

type MetricTensor = [ // g_{ij} = metric[i][j]
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
]

type Christoffel = [ // Gamma^a_{bc} = christoffel[a][b][c]
  [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
  ],
  [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
  ],
  [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
  ],
  [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
  ],
]

export type Metric = {
  description: string;
  coordinates: [string, string, string, string];
  tensorEqation: string;
  christoffelEqations: string[];
  metric: (args: MetricArgs) => MetricTensor;
  christoffel: (args: ChristoffelArgs) => Christoffel;
}

const createZeroMetric: () => MetricTensor = () => Array(4).map(() => Array(4).fill(0)) as MetricTensor
const createZeroChristoffel: () => Christoffel = () => Array(4).map(() => Array(4).map(() => Array(4).fill(0))) as Christoffel

const minkowskiMetric = createZeroMetric()
minkowskiMetric[0][0] = -1
minkowskiMetric[1][1] = 1
minkowskiMetric[2][2] = 1
minkowskiMetric[3][3] = 1

const minkowskiChristoffel = createZeroChristoffel()

export const minkowski: Metric = {
  description: "Metric describing flat space",
  coordinates: ["t", "x", "y", "z"],
  tensorEqation: String.raw`\eta ={\begin{pmatrix}-1&0&0&0\\0&1&0&0\\0&0&1&0\\0&0&0&1\end{pmatrix}}`,
  christoffelEqations: [String.raw`TODO`],
  metric: () => minkowskiMetric,
  christoffel: () => minkowskiChristoffel
}

export const schwarzschild: Metric = {
  description: "Metric describing space near an uncharged, non-rotating mass",
  coordinates: ["t", "r", String.raw`\theta`, String.raw`\phi`],
  tensorEqation: String.raw`g_{\mu \nu }={\begin{bmatrix}-\left(1-{\frac {r_s}{r}}\right)&0&0&0\\0&\left(1-{\frac {r_s}{r}}\right)^{-1}&0&0\\0&0&r^{2}&0\\0&0&0&r^{2}\sin ^{2}\theta \end{bmatrix}}`,
  christoffelEqations: [String.raw`TODO`],
  metric({ rs, r, theta }: SchwarzschildMetricArgs) {
    const metric = createZeroMetric()
    metric[0][0] = -(1 - rs / r)
    metric[1][1] = 1 / (1 - rs / r)
    metric[2][2] = Math.pow(r, 2)
    metric[3][3] = Math.pow(r * Math.sin(theta), 2)

    return metric
  },
  christoffel({ m, r, rs, theta }: SchwarzschildChristoffelArgs) { // https://physics.stackexchange.com/a/733752
    const rMinusRs = r - rs

    const christoffel = createZeroChristoffel()
    christoffel[1][0][0] = (m * rMinusRs) / Math.pow(r, 3) // r t t
    christoffel[1][1][1] = m / (r * rMinusRs) // r r r
    christoffel[1][2][2] = -rMinusRs // r theta theta
    christoffel[1][3][3] = -rMinusRs * Math.pow(Math.sin(theta), 2) // r phi phi
    christoffel[0][1][0] = m / (r * rMinusRs) // t r t
    christoffel[2][1][2] = 1 / r // theta r theta
    christoffel[2][3][3] = -Math.sin(theta) * Math.cos(theta) // theta phi phi
    christoffel[3][1][3] = 1 / r // phi r phi
    christoffel[3][2][3] = Math.cos(theta) / Math.sin(theta) // phi theta phi

    return christoffel
  }
}
