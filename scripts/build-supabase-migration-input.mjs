import { readFile, writeFile } from "node:fs/promises";

const query = await readFile("supabase/migrations/0009_configurable_grading.sql", "utf8");
await writeFile(
  "supabase/migrations/0001_school_platform.input.json",
  JSON.stringify(
    {
      project_id: "zpmrwdvtchblgntnaloh",
      name: "configurable_grading",
      query,
    },
    null,
    2,
  ),
);
