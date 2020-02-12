#!/usr/bin/env node
const fs = require('fs');
const Maker = require('@makerdao/dai');
const McdPlugin = require('@makerdao/dai-plugin-mcd').default;
const {ETH, BAT} = require('@makerdao/dai-plugin-mcd');
const addr = require('./addresses');
const api = require('etherscan-api').init(process.env.ETHERSCAN_KEY);
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
    await fs.unlink(fileName);
  }
  const mcdOptions = {
    cdpTypes: [
      {currency: ETH, ilk: "ETH-A"},
      {currency: BAT, ilk: "BAT-A"}
    ]
  };
  const maker = await Maker.create("http", {
    url: process.env.KOVAN_URL,
    plugins: [
      [McdPlugin, mcdOptions]
    ]
  });
  const manager = maker.service('mcd:cdpManager');
  const block  = await maker.service('web3').blockNumber();
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

  console.log("Getting proxies created before block", block);
  // Get the transaction list for the PROXY_REGISTRY contract from etherscan
  let pageNumber = 1;
  const startBlock = 1;
  const offset = 100;
  const sort = "asc";
  let txlist = await api.account.txlist(
    addr.PROXY_REGISTRY,
    startBlock,
    block,
    pageNumber,
    offset,
    sort
  );

  while (txlist.result.length > 0 ) {
    let proxyPromises =  [];

    for (let i = 0; i < txlist.result.length; i++) {
      proxyPromises.push(maker.service('proxy').getProxyAddress(txlist.result[i].from));
    }

    console.log("waiting on proxy addresses. page: ", pageNumber);
    let proxyAddresses = await Promise.all(proxyPromises);
    proxyAddresses = proxyAddresses.filter(e => e != null);

    await asyncForEach(proxyAddresses, async addr => {
      console.log("getting cdps", addr);
      const data = await manager.getCdpIds(addr);
      await asyncForEach(data, async (cdp) => {
        const vault = await manager.getCdp(cdp.id);
        console.log([
          vault.collateralAmount,
          vault.collateralValue, // value in USD given current price feed values
          vault.debtValue,
          vault.collateralizationRatio,
          vault.liquidationPrice
        ].map(x => x.toString()));

        const row = {
          id: cdp.id,
          ilk: cdp.ilk,
          addr: addr,
          collateralAmount: vault.collateralAmount._amount,
          collateralValue: vault.collateralValue._amount,
          debtValue: vault.debtValue._amount,
        };

        await csvWriter.writeRecords([row]);
      })
    });

    proxyPromises = [];
    pageNumber++;
    txlist = await api.account.txlist(
      addr.PROXY_REGISTRY,
      startBlock,
      block,
      pageNumber,
      offset,
      sort
    )
  }
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