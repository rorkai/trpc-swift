import { generateFixture } from "../generate-fixture.ts";

// real-time-wait: spawns the TypeScript 7 checker as a child process.
test("names the procedure the router does not have", { timeout: 60_000 }, async () => {
  await expect(generateFixture(import.meta.dirname)).rejects.toMatchObject({
    name: "ProbeTypeCheckError",
    diagnostics: ["projects.missing: Property 'missing' does not exist"],
  });
});
