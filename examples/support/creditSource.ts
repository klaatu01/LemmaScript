export function drawBit(): number {
  //@ impure
  //@ ensures \result === 0 || \result === 1
  return Math.random() < 0.5 ? 0 : 1;
}
