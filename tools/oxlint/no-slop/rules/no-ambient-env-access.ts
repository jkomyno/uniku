import { defineRule } from "@oxlint/plugins";
import type { ESTree, Scope, SourceCode } from "@oxlint/plugins";

function isProcessEnv(node: ESTree.MemberExpression): boolean {
  if (node.object.type !== "Identifier" || node.object.name !== "process") return false;
  if (!node.computed && node.property.type === "Identifier") return node.property.name === "env";
  return node.computed && node.property.type === "Literal" && node.property.value === "env";
}

function resolvesToLocalProcess(sourceCode: SourceCode, node: ESTree.Node): boolean {
  let scope: Scope | null = sourceCode.getScope(node);
  while (scope !== null) {
    const variable = scope.set.get("process");
    if (variable !== undefined) return variable.defs.length > 0;
    scope = scope.upper;
  }
  return false;
}

/** Keep ambient environment reads in repository-selected composition-root files. */
export const noAmbientEnvAccessRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct process.env access in files where this scoped rule is enabled.",
    },
    messages: {
      ambientEnv:
        "Read and validate environment variables at the composition root, then pass the owned value explicitly.",
    },
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        if (!isProcessEnv(node) || resolvesToLocalProcess(context.sourceCode, node)) return;
        context.report({ node, messageId: "ambientEnv" });
      },
    };
  },
});
