//@ backend dafny
import { match } from "ts-pattern";

type Account = { captured: number; refunded: number };
type Origin = { site: number };
type Change = { origin: Origin };
type Entry = { kind: string; amount: number; change: Change };

export function reduceEntry(state: Account, event: Entry): Account {
  //@ requires 0 <= state.refunded && state.refunded <= state.captured
  //@ requires event.amount >= 0
  //@ ensures \result.refunded <= \result.captured
  //@ ensures event.kind === "capture" && event.change.origin.site === 0 ==> \result.captured === state.captured
  return match(event)
    .with({kind: "capture", change: {origin: {site: 0}}}, () => state)
    .with({kind: "capture"}, e => ({captured: state.captured + e.amount, refunded: state.refunded}))
    .with({kind: "refund"}, e => {
      if (e.amount > state.captured - state.refunded) return state;
      return {captured: state.captured, refunded: state.refunded + e.amount};
    })
    .with({kind: "close"}, () => ({captured: 0, refunded: 0}))
    .with({kind: "settle"}, () => ({captured: state.captured - state.refunded, refunded: 0}))
    .with({kind: "reserve"}, () => state)
    .with({kind: "release"}, () => state)
    .with({kind: "mark"}, () => state)
    .with({kind: "review"}, () => state)
    .with({kind: "archive"}, () => state)
    .otherwise(() => state);
}

type Signal = {tag: "on"; n: number} | {tag: "off"; n: number};
export const bit = (signal: Signal): number => match(signal)
  .with({tag: "on"}, () => 1)
  .with({tag: "off"}, () => 0)
  .exhaustive();

export function addSignal(signal: Signal, base: number): number {
  //@ ensures signal.tag === "on" ==> \result === base + 2
  return 1 + match(signal).with({tag: "on"}, () => base + 1).otherwise(() => base);
}

export function markZero(amount: number): number {
  //@ ensures amount === 0 ==> \result === 1
  return match({entry: {amount}})
    .with({entry: {amount: 0}}, x => x.entry.amount + 1)
    .otherwise(x => x.entry.amount);
}

type Notice = {tag: "entry"; change: Change} | {tag: "idle"; reason: string};
export function originMarker(event: Notice): number {
  //@ ensures event.tag === "idle" ==> \result === 0
  return match(event).with({change: {origin: {site: 0}}}, () => 1).otherwise(() => 0);
}
