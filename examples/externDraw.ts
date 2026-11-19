//@ backend lean

//@ extern
//@ impure
declare function drawCredit(): number;
import { drawBit } from "./support/creditSource.js";

export function sumDraws(): number {
  //@ ensures 0 <= \result && \result <= 2
  const a = drawBit();
  return a + drawBit();
}

export function sameSavedDraw(): boolean {
  //@ ensures \result === true
  const a = drawCredit();
  return a === a;
}
