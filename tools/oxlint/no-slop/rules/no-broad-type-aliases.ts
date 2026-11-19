import { defineRule } from "@oxlint/plugins";

import { classifyBroadType } from "../shared/broad-types.ts";

/** Disallow aliases that only rename an uninformative top-level type. */
export const noBroadTypeAliasesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow type aliases whose entire contract is any, object, or {}.",
    },
    messages: {
      broadAlias:
        "This alias only hides the {{kind}} type. Name a concrete contract, or keep the uncertainty visible where the value enters.",
    },
  },
  createOnce(context) {
    return {
      TSTypeAliasDeclaration(node) {
        const kind = classifyBroadType(node.typeAnnotation);
        if (kind === null) return;
        context.report({ node, messageId: "broadAlias", data: { kind } });
      },
    };
  },
});
