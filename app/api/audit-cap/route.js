// ÉCHAFAUDAGE JETABLE — audit 2026-10. À SUPPRIMER avant livraison.
import { writeFile, mkdir } from "fs/promises";
import path from "path";
const ROOT = path.join(process.cwd(), "tools/out/audit-2026-10");
const SCR = "/private/tmp/claude-501/-Users-guillaume-Documents-GitHub-arcardi/0bddd21e-efc9-46b8-83e7-cd3b7cee0369/scratchpad/cap";
export async function POST(req) {
  const { name, data, scratch } = await req.json();
  if (!/^[\w.-]+$/.test(name)) return new Response("bad", { status: 400 });
  const dir = scratch ? SCR : ROOT;
  await mkdir(dir, { recursive: true });
  const b64 = String(data).replace(/^data:image\/\w+;base64,/, "");
  await writeFile(path.join(dir, name), Buffer.from(b64, "base64"));
  return new Response("ok");
}
