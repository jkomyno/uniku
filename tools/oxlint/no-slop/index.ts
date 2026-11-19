import { eslintCompatPlugin } from "@oxlint/plugins";

import { noAmbientEnvAccessRule } from "./rules/no-ambient-env-access.ts";
import { noBroadReturnTypesRule } from "./rules/no-broad-return-types.ts";
import { noBroadTypeAliasesRule } from "./rules/no-broad-type-aliases.ts";

/** Project-local additions to the vendored anti-slop rule set. */
const noSlopPlugin = eslintCompatPlugin({
  meta: { name: "no-slop" },
  rules: {
    "no-ambient-env-access": noAmbientEnvAccessRule,
    "no-broad-return-types": noBroadReturnTypesRule,
    "no-broad-type-aliases": noBroadTypeAliasesRule,
  },
});

export default noSlopPlugin;
