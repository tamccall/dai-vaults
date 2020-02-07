#!/usr/bin/env node

const McdPlugin = require("@makerdao/dai-plugin-mcd").default;
const Maker = require("@makerdao/dai");

async function main() {
  const maker = await Maker.create('http', {
    // the usual configuration options go here...
    plugins: [
      [McdPlugin, {}] // the second argument can be used to pass options to the plugin
    ]
  });


  const manager = maker.service('mcd:cdpManager');
  const proxyAddress = maker.service('proxy').currentProxy();
  const data = await manager.getCdpIds(proxyAddress); // returns list of { id, ilk } objects
  const vault = await manager.getCdp(data[0].id);
  console.log([
    vault.collateralAmount,
    vault.collateralValue, // value in USD given current price feed values
    vault.debtValue,
    vault.collateralizationRatio,
    vault.liquidationPrice
  ].map(x => x.toString()));
}

main().catch(e => console.log("error in main:\n", e));