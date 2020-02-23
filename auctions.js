const Maker = require('@makerdao/dai');
const McdPlugin = require('@makerdao/dai-plugin-mcd').default;
const {ETH, BAT} = require('@makerdao/dai-plugin-mcd');
const BigNumber = require('bignumber.js');
const {Flipper} = require('./flipper');

function getWeekNumber(d) {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  // Get first day of year
  let yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  // Calculate full weeks to nearest Thursday
  let weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  // Return array of year and week number
  return weekNo;
}

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
  let totalLoss = new BigNumber(0);
  let n = 0;

  const yearMap = new Map();
  console.info("Getting the deals...");
  await flip.getEvents((deal) => {
    n++;
    const winningBid = deal.bids[deal.bids.length - 1];
    let loss = new BigNumber(-1);
    if (winningBid) {
      loss = winningBid.gemPrice.minus(deal.gemPrice).dividedBy(deal.gemPrice);
    }

    if (n % 5 === 0)  {
      console.log(
        "Deal Loss:",
        loss.toFixed(6),
        "Average is:",
        totalLoss.dividedBy(n).toFixed(6),
        "Lot Number:",
        deal.flipId
      )
    }

    let fullYear = deal.dealDate.getFullYear();
    if (!yearMap.has(fullYear)) {
      yearMap.set(fullYear, new Map())
    }

    const year = yearMap.get(fullYear);
    const weekN = getWeekNumber(deal.dealDate);
    if (!year.has(weekN)) {
      year.set(weekN, {
        defaults: 0,
        blocks: new Set(),
      })
    }
    const week = year.get(weekN);
    week.defaults++;
    week.blocks.add(deal.dealBlock);

    totalLoss = totalLoss.plus(loss);
  });

  console.log("Average Loss", totalLoss.dividedBy(n).times(100).toFixed(3));
  console.log("Defaults per week", yearMap)
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