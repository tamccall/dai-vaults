#!/usr/bin/env node
const jsyaml = require('js-yaml');
const eRoR = require('./expected-value');
const fs = require('fs');

async function main() {
  const constants = jsyaml.load(fs.readFileSync('./constants.yml', 'utf8'));
  console.log(constants);
  eRoR.setRiskFree(constants.risk_free_rate);
}

(async() => {
  console.log('starting...');

  await main().catch(e => {
    console.error("error in main\n", e);
    process.exit(1);
  });

  console.log('done...');
})();