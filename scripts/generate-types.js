#!/usr/bin/env node

/**
 * Generate TypeScript types from Supabase database
 *
 * Usage:
 * 1. Set environment variables in .env.local:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY (from Project Settings → API → service_role key)
 *
 * 2. Run: node scripts/generate-types.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nAdd these to your .env.local file.");
  process.exit(1);
}

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error("❌ Invalid SUPABASE_URL format");
  process.exit(1);
}

// Use the Supabase project's types generation API endpoint
const url = `https://api.supabase.com/v1/projects/${projectRef}/types/typescript`;

console.log("🔄 Generating TypeScript types from Supabase...\n");
console.log("Project ID:", projectRef);

const options = {
  headers: {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  },
};

https
  .get(url, options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      if (res.statusCode === 200) {
        const outputPath = path.join(
          __dirname,
          "..",
          "lib",
          "database.types.ts"
        );
        fs.writeFileSync(outputPath, data);
        console.log("✅ TypeScript types generated successfully!");
        console.log(`📁 Output: ${outputPath}\n`);
      } else {
        console.error("❌ Failed to generate types");
        console.error(`Status: ${res.statusCode}`);
        console.error(`Response: ${data}`);
        process.exit(1);
      }
    });
  })
  .on("error", (err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });
