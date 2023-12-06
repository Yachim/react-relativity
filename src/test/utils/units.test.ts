import { renderHook, act } from "@testing-library/react";
import {
  useMass,
  testExports,
} from "../../utils/units"
const {
  solarMassToSi,
  siMassToGeometrized,
  solarMassToGeometrized,
} = testExports!

describe("utility functions", () => {
  it("calculates solarMassToSi correctly", () => {
    expect(solarMassToSi(1)).toBeCloseTo(1.9891e30, -27)
    expect(solarMassToSi(7)).toBeCloseTo(1.3923e31, -28)
  })

  it("calculates siMassToGeometrized correctly", () => {
    expect(siMassToGeometrized(1.9891e30)).toBeCloseTo(1477.13754, 0)
    expect(siMassToGeometrized(1.3923e31)).toBeCloseTo(10339.4429, 0)
  })

  it("calculates solarMassToGeometrized correctly", () => {
    expect(solarMassToGeometrized(1)).toBeCloseTo(1477.13754, 0)
    expect(solarMassToGeometrized(7)).toBeCloseTo(10339.4429, 0)
  })
})

describe("useMass hook", () => {
  it("should update solarMass and geometrizedMass correctly", () => {
    const { result } = renderHook(() => useMass(1));
    expect(result.current.solarMass).toBe(1);
    expect(result.current.geometrizedMass).toBeCloseTo(
      1477.13754, 0
    );

    act(() => {
      result.current.setSolarMass(7);
    });

    expect(result.current.solarMass).toBe(7);
    expect(result.current.geometrizedMass).toBeCloseTo(
      10339.4429, 0
    );
  });
});
