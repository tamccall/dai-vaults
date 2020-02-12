#!/usr/bin/env node
const jsyaml = require('js-yaml');
const eRoR = require('./expected-value');
const fs = require('fs');
const Maker = require('@makerdao/dai');
const McdPlugin = require('@makerdao/dai-plugin-mcd').default;
const {ETH, BAT} = require('@makerdao/dai-plugin-mcd');
const addr = require('./addresses');
const api = require('etherscan-api').init(process.env.ETHERSCAN_KEY);

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

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
  const block  = await maker.service('web3').blockNumber();
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