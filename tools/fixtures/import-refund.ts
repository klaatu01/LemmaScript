import { refund } from "./refund";

export function applyRequest(a: number, c: number, r: number): number {
  //@ throws RangeError when a > c - r
  //@ ensures \result === r + a
  return refund(a, c, r);
}
