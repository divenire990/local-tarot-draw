#!/usr/bin/env node

import { run } from '../src/cli.mjs';

run(process.argv.slice(2))
  .then((exitCode) => {
    process.exit(exitCode ?? 0);
  })
  .catch((err) => {
    console.error(`\nUnexpected Fatal Error: ${err.message}`);
    process.exit(1);
  });
