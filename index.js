#!/usr/bin/env node
const jsyaml = require('js-yaml');
const eRoR = require('./expected-value');
const fs = require('fs');
const Maker = require('@makerdao/dai');
const McdPlugin = require('@makerdao/dai-plugin-mcd').default;
const {ETH, BAT} = require('@makerdao/dai-plugin-mcd');

async function main() {
  const constants = jsyaml.load(fs.readFileSync('./constants.yml', 'utf8'));
  console.log(constants);
  eRoR.setRiskFree(constants.risk_free_rate);
  const mcdOptions = {
    cdpTypes: [
      {currency: ETH, ilk: "ETH_A"},
      {currency: BAT, ilk: "BAT_A"}
    ]
  };
  const maker = await Maker.create("http", {
    url: process.env.KOVAN_URL,
    plugins: [
      [McdPlugin, mcdOptions]
    ]
  });
  const manager = maker.service('mcd:cdpManager');
  console.log("maker initialized");
}

(async() => {
  console.log('starting...');

  await main().catch(e => {
    console.error("error in main\n", e);
    process.exit(1);
  });

  console.log('done...');
})();