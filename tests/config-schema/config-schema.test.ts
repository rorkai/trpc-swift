import { configJsonSchema } from "../../src/config.ts";

test("the committed config-schema.json matches the config schema", async () => {
  await expect(`${JSON.stringify(configJsonSchema(), null, 2)}\n`).toMatchFileSnapshot("../../config-schema.json");
});
