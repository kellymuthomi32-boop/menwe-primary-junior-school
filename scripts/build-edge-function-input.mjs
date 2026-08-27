import { readFile, writeFile } from "node:fs/promises";

const [entrypoint, deno] = await Promise.all([
  readFile("supabase/functions/admin-invite/index.ts", "utf8"),
  readFile("supabase/functions/admin-invite/deno.json", "utf8"),
]);

await writeFile(
  "supabase/functions/admin-invite/input.json",
  JSON.stringify({
    project_id: "zpmrwdvtchblgntnaloh",
    name: "admin-invite",
    verify_jwt: false,
    entrypoint_path: "index.ts",
    files: [
      { name: "index.ts", content: entrypoint },
      { name: "deno.json", content: deno },
    ],
  }),
);
