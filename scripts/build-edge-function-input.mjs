import { readFile, writeFile } from "node:fs/promises";

const entrypoint = await readFile("supabase/functions/school-invite/index.ts", "utf8");

await writeFile(
  "supabase/functions/school-invite/input.json",
  JSON.stringify({
    project_id: "zpmrwdvtchblgntnaloh",
    name: "school-invite",
    verify_jwt: false,
    entrypoint_path: "index.ts",
    files: [
      { name: "index.ts", content: entrypoint },
    ],
  }),
);
