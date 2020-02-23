const Maker = require('@makerdao/dai');
const McdPlugin = require('@makerdao/dai-plugin-mcd').default;
const {ETH, BAT} = require('@makerdao/dai-plugin-mcd');
const BigNumber = require('bignumber.js');
const {Flipper} = require('./flipper');

async function main() {
  const SAI = require("@makerdao/currency").createCurrency('SAI');
  const mcdOptions = {
    cdpTypes: [
      {currency: ETH, ilk: "ETH-A"},
      {currency: BAT, ilk: "BAT-A"},
      {currency: SAI, ilk: "SAI"}
    ]
  };
  const maker = await Maker.create("http", {
    url: process.env.MAINNET_URL,
    plugins: [
      [McdPlugin, mcdOptions]
    ]
  });

  const web3 = maker.service("web3")._web3;
  const addr = require('./addresses');

  const flip = new Flipper(web3, addr.MCD_FLIP_ETH_A, addr.VAL_ETH);
  await flip.getEvents((deal) => {
    const askPricePerEth = deal.kick.tab.dividedBy(deal.kick.lot);
    const winningBid = deal.bids[deal.bids.length - 1];
    if (winningBid) {
      const bidPrice = winningBid.bidPrice;
      const loss = askPricePerEth.minus(bidPrice);
      const lossPercent = loss.dividedBy(askPricePerEth);

      console.log(`Flip ${deal.flipId}. Lost: ${lossPercent.times(100).toFixed(3)}%`)
    } else {
      const lossPercent = new BigNumber(-1);
      console.log(`Flip ${deal.flipId}. Lost: ${lossPercent.times(100).toFixed(3)}%`)
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