import pg from "pg";

const RAILWAY_URL = process.env.SOURCE_URL;
const NEON_URL = process.env.TARGET_URL;

if (!RAILWAY_URL || !NEON_URL) {
  console.error("Usage: SOURCE_URL=<railway> TARGET_URL=<neon> node scripts/migrate-data.mjs");
  process.exit(1);
}

const source = new pg.Client({ connectionString: RAILWAY_URL });
const target = new pg.Client({ connectionString: NEON_URL });

async function migrate() {
  await source.connect();
  await target.connect();

  const tables = ["Task", "PushSubscription", "EntertainmentItem"];

  for (const table of tables) {
    const { rows } = await source.query(`SELECT * FROM "${table}"`);
    if (rows.length === 0) {
      console.log(`Skipping ${table}: no rows`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const colList = columns.map((c) => `"${c}"`).join(", ");
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const insertSql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

    for (const row of rows) {
      const values = columns.map((c) => row[c]);
      await target.query(insertSql, values);
    }

    console.log(`Migrated ${rows.length} rows from ${table}`);
  }

  await source.end();
  await target.end();
  console.log("Done.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
