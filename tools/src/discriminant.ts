import type { Type } from "ts-morph";

export function findDiscriminant(members: Type[]): string | null {
  if (members.length === 0) return null;
  const firstProps = members[0].getProperties();
  for (const prop of firstProps) {
    const name = prop.getName();
    const allHave = members.every(m => {
      const p = m.getProperty(name);
      if (!p) return false;
      const t = p.getDeclarations()[0] ? p.getTypeAtLocation(p.getDeclarations()[0]) : null;
      return (t?.isStringLiteral() || t?.isBooleanLiteral()) ?? false;
    });
    if (allHave) return name;
  }
  return null;
}
