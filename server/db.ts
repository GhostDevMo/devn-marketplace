import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.error("Environment variables loaded:", Object.keys(process.env).filter(key =>
    key.includes('DATABASE') || key.includes('STRIPE') || key.includes('SESSION')
  ));
  throw new Error("DATABASE_URL must be set.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // required for Railway
});

export const db = drizzle(pool, { schema });