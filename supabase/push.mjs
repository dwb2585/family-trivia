// One-shot script: push a SQL migration to Supabase via Management API.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const PROJECT_REF = "mynrkxxmjrfjljeypjay";
const SQL_FILE = process.argv[2] || "./migration.sql";

// Pull token from keychain via `security` command
function getToken() {
  return execSync(
    `security find-generic-password -s "supabase-cli" -a "danielbattersby@me.com" -w`,
    { encoding: "utf8" },
  ).trim();
}

const token = getToken();
const sql = readFileSync(SQL_FILE, "utf8");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);

const text = await res.text();
console.log("Status:", res.status);
console.log("Response:", text.slice(0, 2000));