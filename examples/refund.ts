//@ backend dafny
export function refund(amount: number, captured: number, refunded: number): number {
  //@ throws RangeError when amount > captured - refunded
  //@ ensures \result === refunded + amount
  if (amount > captured - refunded) throw new RangeError("refund too large");
  return refunded + amount;
}

export function requestRefund(amount: number, captured: number, refunded: number): number {
  //@ throws RangeError when amount > captured - refunded
  //@ ensures \result === refunded + amount
  return refund(amount, captured, refunded);
}

export function refundRemainder(captured: number, refunded: number): number {
  //@ ensures \result === captured
  return refund(captured - refunded, captured, refunded);
}
