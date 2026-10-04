// ÉCHAFAUDAGE JETABLE — audit 2026-10. À SUPPRIMER avant livraison.
import { writeFile, mkdir } from "fs/promises";
import path from "path";
const ROOT = path.join(process.cwd(), "tools/out/audit-2026-10");
const SCR = "/private/tmp/claude-501/-Users-guillaume-Documents-GitHub-arcardi/d85c8216-5d67-4b2c-9ba1-7ddfb6579bb8/scratchpad/cap";
export async function POST(req) {
  const { name, data, scratch } = await req.json();
  if (!/^[\w.-]+$/.test(name)) return new Response("bad", { status: 400 });
  const dir = scratch ? SCR : ROOT;
  await mkdir(dir, { recursive: true });
  const b64 = String(data).replace(/^data:image\/\w+;base64,/, "");
  await writeFile(path.join(dir, name), Buffer.from(b64, "base64"));
  return new Response("ok");
}
