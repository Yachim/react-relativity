import { Dispatch, SetStateAction } from "react";

export function setArrayState<T>(f: Dispatch<SetStateAction<T[]>>, value: T, i: number) {
  f(prev => {
    prev[i] = value
    return [...prev]
  })
}
