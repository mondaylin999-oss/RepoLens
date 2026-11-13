const isVercelProduction = process.env.VERCEL_ENV === "production";

if (!isVercelProduction) {
  console.log("Production configuration check skipped outside a Vercel production build.");
  process.exit(0);
}

const required = ["AUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "DATABASE_URL"];
const missing = required.filter((name) => !process.env[name]?.trim());
const invalid = [];

if (process.env.AUTH_SECRET?.trim() && process.env.AUTH_SECRET.trim().length < 32) {
  invalid.push("AUTH_SECRET (must contain at least 32 characters)");
}
if (process.env.DATABASE_URL?.trim() && !/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL.trim())) {
  invalid.push("DATABASE_URL (must be a PostgreSQL connection URL)");
}

if (missing.length || invalid.length) {
  console.error("Production configuration check failed.");
  if (missing.length) console.error(`Add these Vercel Production variables: ${missing.join(", ")}.`);
  if (invalid.length) console.error(`Check these Vercel Production variables: ${invalid.join(", ")}.`);
  process.exit(1);
}

console.log("Production configuration check passed.");
