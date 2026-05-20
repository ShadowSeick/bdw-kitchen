import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

const SQLITE_DATABASE_NAME = "waifus-kitchen.db";

type DB = ReturnType<typeof drizzle>;
let db: DB | null = null;

function getDatabase() {
  if (!db) {
    const expoDb = openDatabaseSync(SQLITE_DATABASE_NAME);

    expoDb.execSync("PRAGMA foreign_keys = ON");

    db = drizzle(expoDb, { schema });
  }

  return db;
}

let drizzleStudioDB: any;

function getDrizzleStudioDatabase() {
  if (!drizzleStudioDB) {
    drizzleStudioDB = openDatabaseSync(SQLITE_DATABASE_NAME);
  }

  return drizzleStudioDB;
}

export { schema, getDatabase, getDrizzleStudioDatabase, DB };
