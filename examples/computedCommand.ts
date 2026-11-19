//@ backend dafny
type Payloads = { capture: number; refund: number };
type Command = { [K in keyof Payloads]: { kind: K; amount: Payloads[K] } }[keyof Payloads];
export function delta(c: Command): number {
  //@ ensures c.kind === "refund" ==> \result === -c.amount
  //@ ensures c.kind === "capture" ==> \result === c.amount
  switch (c.kind) {
    case "capture": return c.amount;
    case "refund": return -c.amount;
  }
}
type Infer<S> = S extends { output: infer V } ? V : never;
declare const schema: { output: { captured: number; refunded: number } };
type Ledger = Infer<typeof schema>;
export function remaining(x: Ledger): number {
  //@ ensures \result === x.captured - x.refunded
  return x.captured - x.refunded;
}

export function readBalance(x: Infer<typeof schema>): number {
  //@ ensures \result === x.captured
  return x.captured;
}

export function captureOf(ledger: Ledger): number {
  //@ ensures \result === ledger.captured
  return readBalance(ledger);
}
