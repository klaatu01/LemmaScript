import { Node, SyntaxKind, type Expression, type Type } from "ts-morph";
import type { RawExpr, RawStmt } from "./rawir.js";
import { freshName } from "./names.js";

interface Arm { pattern: Node; handler: Node }

function patternError(node: Node, message: string): never {
  throw new Error(`ts-pattern at line ${node.getStartLineNumber()}: ${message}`);
}

function importedMatch(node: Node): boolean {
  if (Node.isIdentifier(node)) return node.getSymbol()?.getDeclarations().some(d =>
    Node.isImportSpecifier(d) && d.getName() === "match" &&
    d.getImportDeclaration().getModuleSpecifierValue() === "ts-pattern") ?? false;
  if (Node.isPropertyAccessExpression(node) && node.getName() === "match")
    return node.getExpression().getSymbol()?.getDeclarations().some(d =>
      Node.isNamespaceImport(d) && d.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)?.getModuleSpecifierValue() === "ts-pattern") ?? false;
  return false;
}

export function matchChain(expr: Expression) {
  if (!Node.isCallExpression(expr)) return null;
  const terminal = expr.getExpression();
  if (!Node.isPropertyAccessExpression(terminal) || !["otherwise", "exhaustive"].includes(terminal.getName())) return null;
  let chain = terminal.getExpression();
  const arms: Arm[] = [];
  while (Node.isCallExpression(chain)) {
    const callee = chain.getExpression();
    if (importedMatch(callee)) {
      const args = expr.getArguments();
      if (chain.getArguments().length !== 1 || args.length !== (terminal.getName() === "otherwise" ? 1 : 0))
        patternError(expr, "expected match(value), followed by otherwise(handler) or exhaustive()");
      return { input: chain.getArguments()[0] as Expression, arms: arms.reverse(), fallback: args[0] };
    }
    if (!Node.isPropertyAccessExpression(callee) || callee.getName() !== "with") break;
    const [pattern, handler, ...extra] = chain.getArguments();
    if (!pattern || !handler || extra.length) return null;
    arms.push({ pattern, handler });
    chain = callee.getExpression();
  }
  return null;
}

const variable = (name: string): RawExpr => ({ kind: "var", name });
const and = (left: RawExpr, right: RawExpr): RawExpr => ({ kind: "binop", op: "&&", left, right });

function patternTest(pattern: Node, value: RawExpr, type: Type, extract: (expr: Expression) => RawExpr): RawExpr {
  if (Node.isObjectLiteralExpression(pattern)) {
    const concrete = type.getNonNullableType();
    const members = concrete.isUnion() ? concrete.getUnionTypes() : [concrete];
    if (!members.every(m => m.isObject() || m.isIntersection())) patternError(pattern, "object pattern requires a record or tagged union");
    const tests: RawExpr[] = [];
    if (type.isNullable()) tests.push({ kind: "binop", op: "!==", left: value, right: variable("undefined") });
    for (const prop of pattern.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) patternError(prop, "expected literal property: pattern");
      const key = prop.getNameNode();
      if (!Node.isIdentifier(key) && !Node.isStringLiteral(key)) patternError(key, "computed keys are unsupported");
      const field = Node.isIdentifier(key) ? key.getText() : key.getLiteralValue();
      const decl = members.map(m => m.getProperty(field)).find(p => !!p);
      if (!decl) patternError(prop, `unknown pattern field ${field}`);
      if (!members.every(m => m.getProperty(field))) tests.push({ kind: "binop", op: "in", left: {kind: "str", value: field}, right: value });
      const fieldType = (concrete.getProperty(field) ?? decl).getTypeAtLocation(prop);
      tests.push(patternTest(prop.getInitializerOrThrow(), { kind: "field", obj: value, field }, fieldType, extract));
    }
    return tests.length ? tests.reduce(and) : {kind: "bool", value: true};
  }
  if (pattern.getKind() === SyntaxKind.NullKeyword) {
    if (type.isUnion() && type.getUnionTypes().some(m => m.isUndefined()))
      patternError(pattern, "a null pattern requires a field that distinguishes null from missing or undefined");
    return {kind: "binop", op: "===", left: value, right: variable("undefined")};
  }
  if (!(Node.isStringLiteral(pattern) || Node.isNumericLiteral(pattern) || Node.isBigIntLiteral(pattern)
      || pattern.getKind() === SyntaxKind.TrueKeyword || pattern.getKind() === SyntaxKind.FalseKeyword
      || (Node.isPrefixUnaryExpression(pattern) && pattern.getOperatorToken() === SyntaxKind.MinusToken
        && (Node.isNumericLiteral(pattern.getOperand()) || Node.isBigIntLiteral(pattern.getOperand())))))
    patternError(pattern, "expected a literal value or nested object; P.* helpers and computed patterns are unsupported");
  return { kind: "binop", op: "===", left: value, right: extract(pattern as Expression) };
}

export function lowerMatch(chain: NonNullable<ReturnType<typeof matchChain>>, id: number,
    extract: (expr: Expression) => RawExpr, input?: RawExpr): RawStmt[] {
  const name = freshName("_match" + id);
  const value = variable(name);
  const line = chain.input.getStartLineNumber();
  function handler(node: Node, arity: number): RawStmt[] {
    if (!Node.isArrowFunction(node)) patternError(node, "expected an arrow-function handler");
    const lam = extract(node);
    if (lam.kind !== "lambda" || lam.params.length > arity || lam.params.some(p => p.rest || p.defaultValue))
      patternError(node, "unsupported handler parameter list");
    const params: RawStmt[] = lam.params.map(p => ({ kind: "let", name: p.name, tsType: null, init: value, mutable: false, line }));
    return [...params, ...(Array.isArray(lam.body) ? lam.body : [{kind: "return" as const, value: lam.body, line}])];
  }

  let next: RawStmt[] = chain.fallback ? handler(chain.fallback, 1) : [{ kind: "throw", line }];
  for (const {pattern, handler: arm} of [...chain.arms].reverse()) {
    if (!Node.isObjectLiteralExpression(pattern)) patternError(pattern, "expected an object-literal pattern; P.* helpers are unsupported");
    next = [{ kind: "if", cond: patternTest(pattern, value, chain.input.getType(), extract),
      then: handler(arm, 2), else: next, line }];
  }
  return [{kind: "let", name, mutable: false, tsType: null, init: input ?? extract(chain.input), line}, ...next];
}
