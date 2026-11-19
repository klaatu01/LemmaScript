//@ backend dafny
export function adjusted(intAmount: number, ratio: number): number {
  //@ type ratio real
  //@ ensures intAmount === 10 && ratio === 0.25 ==> \result === 12
  //@ ensures intAmount === -10 && ratio === 0.25 ==> \result === -13
  return Math.floor(intAmount * (1 + ratio));
}
