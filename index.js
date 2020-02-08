#!/usr/bin/env node
const McdPlugin = require("@makerdao/dai-plugin-mcd").default;
const {ETH, BAT} = require("@makerdao/dai-plugin-mcd");
const Maker = require("@makerdao/dai");

async function main() {
  // synchronous
  const maker = await Maker.create('http', {
    privateKey: process.env.PRIVATE_KEY,
    // the usual configuration options go here...
    url: process.env.KOVAN_URL,
    plugins: [
      [
        McdPlugin, {
          network: 'kovan',

          cdpTypes: [
            { currency: ETH, ilk: 'ETH-A' },
            { currency: BAT, ilk: 'BAT-A' },
          ]
        }
      ] // the second argument can be used to pass options to the plugin
    ]
  });

  await maker.authenticate();

  const manager = maker.service('mcd:cdpManager');
  const proxyAddress = await maker.service('proxy').currentProxy();
  const data = await manager.getCdpIds(proxyAddress); // returns list of { id, ilk } objects
  const vault = await manager.getCdp(data[0].id);

  console.log("got the vault", vault);
  console.log([
    vault.collateralAmount,
    vault.collateralValue, // value in USD given current price feed values
    vault.debtValue,
    vault.collateralizationRatio,
    vault.liquidationPrice
  ].map(x => x.toString()));

}


(async() => {
  console.log('starting...');

  await main().catch(e => {
    console.error("error in main\n", e);
    process.exit(1);
  });

  console.log('done...');
})();