import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

import { classifyBroadType } from "../shared/broad-types.ts";

type FunctionWithReturnType =
  | ESTree.ArrowFunctionExpression
  | ESTree.Function
  | ESTree.TSCallSignatureDeclaration
  | ESTree.TSConstructSignatureDeclaration
  | ESTree.TSConstructorType
  | ESTree.TSFunctionType
  | ESTree.TSMethodSignature;

/** Require functions with explicit return contracts to expose more evidence than a broad type. */
export const noBroadReturnTypesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow explicit any, object, and {} function return types.",
    },
    messages: {
      broadReturn:
        "This function returns {{kind}}, which gives callers no useful contract. Return a named domain type or parse the value at its ownership boundary.",
    },
  },
  createOnce(context) {
    const checkFunction = (node: FunctionWithReturnType) => {
      if (node.returnType === null || node.returnType === undefined) return;
      const kind = classifyBroadType(node.returnType.typeAnnotation);
      if (kind === null) return;
      context.report({ node: node.returnType, messageId: "broadReturn", data: { kind } });
    };

    return {
      ArrowFunctionExpression: checkFunction,
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      TSCallSignatureDeclaration: checkFunction,
      TSConstructSignatureDeclaration: checkFunction,
      TSConstructorType: checkFunction,
      TSDeclareFunction: checkFunction,
      TSEmptyBodyFunctionExpression: checkFunction,
      TSFunctionType: checkFunction,
      TSMethodSignature: checkFunction,
    };
  },
});
