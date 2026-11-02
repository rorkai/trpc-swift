// The router module has no `MissingRouter`, so the error sits in this re-export rather than in the probe.
// @ts-expect-error -- deliberately broken for the test
export type { MissingRouter as ApiRouter } from "../procedures/router";
