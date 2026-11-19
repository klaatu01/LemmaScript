type ExtractValue<S> = S extends { value: infer V } ? V : never;
export function passthrough<S>(x: ExtractValue<S>): ExtractValue<S> {
  return x;
}
