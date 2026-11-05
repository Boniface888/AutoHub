import "dotenv/config";
import pg from "pg";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run admin:promote -- account@example.com");
  process.exit(2);
}
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL before promoting an account.");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const result = await client.query("UPDATE users SET role='admin' WHERE email=$1 RETURNING email", [email]);
  if (!result.rowCount) {
    console.error("No account with that email was found. Register it first.");
    process.exitCode = 1;
  } else console.log(`${result.rows[0].email} now has administrator access.`);
} finally {
  await client.end();
}
