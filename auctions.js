const Maker = require('@makerdao/dai');
const fs = require('fs');
const McdPlugin = require('@makerdao/dai-plugin-mcd').default;
const {ETH, BAT} = require('@makerdao/dai-plugin-mcd');
const BigNumber = require('bignumber.js');
const {Flipper} = require('./flipper');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Based on the number of open cdps on 2/23/2020
const PERCENT_CLOSED = 0.4474223284397405;
const addr = require('./addresses');

const fileName = "weekly-auctions.csv";

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

async function getCDPN(web3, firstBlock, lastBlock) {
  const abi = require('./abi/DssCdpManager');
  const cdmManager = new web3.eth.Contract(abi, addr.CDP_MANAGER);
  const events = await cdmManager.getPastEvents("NewCdp", {
    fromBlock: firstBlock,
    toBlock: lastBlock
  }, (err) => {
    if (err) {
      throw err
    }
  });
  return events[0] && parseInt(events[0].returnValues.cdp) || undefined;
}

async function main() {
  console.log("deleting old file if exists");
  if (fs.existsSync(fileName)) {
    console.log("file exists deleting...");
    await fs.unlinkSync(fileName);
  }

  const csvWriter = createCsvWriter({
    path: fileName,
    header: [
      {id: "year", title: "year"},
      {id: "week", title: "week"},
      {id: "cdps", title: "cdps"},
      {id: "auctions", title: "auctions"},
    ]
  });

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

  const flipETH = new Flipper(web3, addr.MCD_FLIP_ETH_A, addr.VAL_ETH);
  const flipBAT = new Flipper(web3, addr.MCD_FLIP_BAT_A, addr.VAL_BAT);
  let totalLoss = new BigNumber(0);
  let n = 0;

  const yearMap = new Map();
  console.info("Getting the deals...");
  const callback = (deal) => {
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
  };

  ethPromise = flipETH.getEvents(callback);
  batPromise = flipBAT.getEvents(callback);

  await Promise.all([ethPromise, batPromise]);
  console.log("Average Loss", totalLoss.dividedBy(n).times(100).toFixed(3));

  const years = Array.from(yearMap.keys()).sort();
  let lastCDPN = 0;
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const weekMap = yearMap.get(year);
    const weeks = Array.from(weekMap.keys()).sort();
    for (let j = 0; j < weeks.length; j++) {
      const weekN = weeks[j];
      const summary = weekMap.get(weekN);
      const blocks = Array.from(summary.blocks).sort();
      const firstBlock = blocks[0];
      const lastBlock = blocks[blocks.length - 1];
      let cdpN = await getCDPN(web3, firstBlock, lastBlock);
      if (!cdpN) {
        cdpN = lastCDPN;
      } else {
        lastCDPN = cdpN;
      }
      const approximateOpenCDPS = Math.round(cdpN * (1 - PERCENT_CLOSED));
      await csvWriter.writeRecords([{
        year,
        week: weekN,
        cdps: Math.max(1, approximateOpenCDPS),
        auctions: summary.defaults,
      }]);
    }
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