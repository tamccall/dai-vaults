#!/usr/bin/env node
const fs = require('fs');
const Maker = require('@makerdao/dai');
const McdPlugin = require('@makerdao/dai-plugin-mcd').default;
const {ETH, BAT} = require('@makerdao/dai-plugin-mcd');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const fileName = "out.csv";

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

async function main() {
  console.log("deleting old file if exists");
  if (fs.existsSync(fileName)) {
    console.log("file exists deleting...");
    await fs.unlinkSync(fileName);
  }
  const SAI = require("@makerdao/currency").createCurrency('SAI');
  const mcdOptions = {
    cdpTypes: [
      {currency: ETH, ilk: "ETH-A"},
      {currency: BAT, ilk: "BAT-A"},
      {currency: SAI, ilk: "SAI"}
    ]
  };
  const maker = await Maker.create("http", {
    url: process.env.KOVAN_URL,
    plugins: [
      [McdPlugin, mcdOptions]
    ]
  });
  const manager = maker.service('mcd:cdpManager');
  const csvWriter = createCsvWriter({
    path: fileName,
    header: [
      {id: "id", title: "id"},
      {id: "addr", title: "proxy_address"},
      {id: "ilk", title: "ilk"},
      {id: "collateralAmount", title: "collateral_amount"},
      {id: "collateralValue", title: "collateral_value_usd"},
      {id: "debtValue", title: "debt_value"},
    ]
  });

  // TODO: figure out the number of vaults by calling contracts
  const allIds = [...Array(5000).keys()].slice(1).map(x => {
    return {id: x}
  });

  await asyncForEach(allIds, async (cdp) => {
    console.log(`getting cdp id=${cdp.id}`);
    try {
      const vault = await manager.getCdp(cdp.id);
      const row = {
        id: cdp.id,
        ilk: vault.ilk,
        addr: await vault.getOwner(),
        collateralAmount: vault.collateralAmount._amount,
        collateralValue: vault.collateralValue._amount,
        debtValue: vault.debtValue._amount,
      };
      await csvWriter.writeRecords([row]);
    } catch (e) {
      console.error(e)
    }
  });
}

(async() => {
  console.log('starting...');

  await main().catch(e => {
    console.error("error in main\n", e);
    process.exit(1);
  });

  console.log('done...');
  process.exit(0);
})();