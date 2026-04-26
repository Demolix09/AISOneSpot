const fs = require("node:fs");
const path = require("node:path");

const rawUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const url = rawUrl.trim().replace(/\/+$/, "");

if (!url || !anonKey) {
  console.error("Missing required env vars: SUPABASE_URL and/or SUPABASE_ANON_KEY");
  process.exit(1);
}

if (!/^https:\/\/.+\.supabase\.co$/i.test(url)) {
  console.error("SUPABASE_URL must look like: https://<project-ref>.supabase.co");
  process.exit(1);
}

const outputPath = path.resolve(process.cwd(), "supabase-config.js");
const contents = `window.AIS_SUPABASE_CONFIG = {
  url: "${url}",
  anonKey: "${anonKey}"
};
`;

fs.writeFileSync(outputPath, contents, "utf8");
console.log(`Generated ${outputPath}`);
