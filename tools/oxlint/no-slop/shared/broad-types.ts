import type { ESTree } from "@oxlint/plugins";

export type BroadType = "`any`" | "`object`" | "empty object";

function unwrapParentheses(type: ESTree.TSType): ESTree.TSType {
  let current = type;
  while (current.type === "TSParenthesizedType") current = current.typeAnnotation;
  return current;
}

export function classifyBroadType(type: ESTree.TSType): BroadType | null {
  const unwrapped = unwrapParentheses(type);
  if (unwrapped.type === "TSAnyKeyword") return "`any`";
  if (unwrapped.type === "TSObjectKeyword") return "`object`";
  if (unwrapped.type === "TSTypeLiteral" && unwrapped.members.length === 0) {
    return "empty object";
  }
  return null;
}
