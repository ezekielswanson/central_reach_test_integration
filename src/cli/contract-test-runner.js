#!/usr/bin/env node
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { loadConfig } = require("../config");
const { createHsToCrSync } = require("../sync/hs-to-cr-sync");

function parseDealIds(argv) {
  const raw = argv.find((arg) => arg.startsWith("--dealIds="));
  if (!raw) {
    return [];
  }
  return raw
    .split("=")[1]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseRuns(argv) {
  const raw = argv.find((arg) => arg.startsWith("--runs="));
  if (!raw) {
    return 1;
  }
  const parsed = Number(raw.split("=")[1]);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
}

function writeRunOutputFile(payload) {
  const outputDir = path.join(process.cwd(), "output_files", "contract_runs");
  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const firstDealId = payload.dealIds[0] || "no_deal";
  const filename = `contract_run_${timestamp}_${firstDealId}.json`;
  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  return outputPath;
}

async function main() {
  const dealIds = parseDealIds(process.argv.slice(2));
  const runs = parseRuns(process.argv.slice(2));

  if (dealIds.length === 0) {
    throw new Error("Provide at least one deal ID using --dealIds=123,456");
  }

  const config = loadConfig();
  const sync = createHsToCrSync(config);
  const startedAt = new Date().toISOString();
  const runResults = [];

  for (let run = 1; run <= runs; run += 1) {
    console.log(`\n=== Contract Run ${run}/${runs} ===`);
    const runEntry = {
      run,
      startedAt: new Date().toISOString(),
      results: [],
    };
    for (const dealId of dealIds) {
      const result = await sync.processDeal(dealId);
      runEntry.results.push(result);
      console.log(
        JSON.stringify(
          {
            dealId: result.dealId,
            crContactId: result.crContactId || null,
            operation: result.operation || result.status,
          },
          null,
          2
        )
      );
    }
    runEntry.completedAt = new Date().toISOString();
    runResults.push(runEntry);
  }

  const filePayload = {
    startedAt,
    completedAt: new Date().toISOString(),
    dealIds,
    runs,
    runResults,
  };
  const outputPath = writeRunOutputFile(filePayload);
  console.log(`\nContract run output written to: ${outputPath}`);
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      level: "error",
      message: err?.message || "contract_runner_failed",
      code: err?.code || err?.response?.status || null,
      timestamp: new Date().toISOString(),
    })
  );
  process.exit(1);
});
