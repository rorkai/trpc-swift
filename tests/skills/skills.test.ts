import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import packageJson from "../../package.json" with { type: "json" };

const skillsDir = resolve(import.meta.dirname, "../../skills");
const skills = readdirSync(skillsDir);

test("the package publishes its skills", () => {
  expect(skills.length).toBeGreaterThan(0);
  expect(packageJson.files).toContain("skills");
});

// pnpm links skills/<name>/SKILL.md under the directory's name, which the Agent Skills specification
// (https://agentskills.io/specification) requires to match the frontmatter `name`.
describe.each(skills)("skills/%s", (skill) => {
  const skillPath = join(skillsDir, skill, "SKILL.md");
  const source = readFileSync(skillPath, "utf8");
  const frontmatter = Object.fromEntries(
    (source.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "").split("\n").map((line) => line.split(/:\s*(.*)/s).slice(0, 2)),
  );

  test("its frontmatter follows the Agent Skills specification", () => {
    expect(frontmatter.name).toBe(skill);
    expect(skill).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(skill.length).toBeLessThanOrEqual(64);
    expect(frontmatter.description?.length).toBeGreaterThan(0);
    expect(frontmatter.description?.length).toBeLessThanOrEqual(1024);
  });

  test("every relative link points at a shipped file", () => {
    const links = [...source.matchAll(/\]\((?!https?:)([^)#]+)\)/g)].map((match) => match[1] ?? "");
    expect(links.filter((link) => !existsSync(resolve(dirname(skillPath), link)))).toEqual([]);
  });
});
