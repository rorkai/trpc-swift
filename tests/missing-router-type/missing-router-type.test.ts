import { generateFixture } from "../generate-fixture.ts";

// real-time-wait: spawns the TypeScript 7 checker as a child process.
test("names the router type that a re-export leaves unresolved", { timeout: 60_000 }, async () => {
  await expect(generateFixture(import.meta.dirname)).rejects.toMatchObject({
    name: "ProbeTypeCheckError",
    diagnostics: ["ApiRouter from missing-router-type/index.ts does not resolve to a type"],
  });
});
