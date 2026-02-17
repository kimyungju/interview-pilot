import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  throw new Error("SUPABASE_DB_URL environment variable is not set. Check your .env.local file.");
}

const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
