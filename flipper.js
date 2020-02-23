const BigNumber = require('bignumber.js');

// Used for iterating
const EVENTS_PER_BLOCK = 0.002835741676158897;
const DESIRED_EVENTS = 1000;
const PAGE = Math.floor( DESIRED_EVENTS / EVENTS_PER_BLOCK );

// Event Topics
const DEAL = "0xc959c42b00000000000000000000000000000000000000000000000000000000";
const DENT = "0x5ff3a38200000000000000000000000000000000000000000000000000000000";
const TEND = "0x4b43ed1200000000000000000000000000000000000000000000000000000000";

const FIRST_BLOCK = 8865649;
const TEN_TO_18 = new BigNumber('1e+18');
const LOT_DIVISOR = TEN_TO_18;
const TAB_DIVISOR = new BigNumber('1e+27').times(TEN_TO_18);
const BID_DIVISOR = TAB_DIVISOR;

const blockDates = new Map();

function Flipper(web3, flipperAddr, osmAddr) {
  const abiFlipper = require('./abi/Flipper');
  const abiOSM = require('./abi/OSM');
  const addr = require('./addresses');

  const flipContract = new web3.eth.Contract(abiFlipper, flipperAddr);
  const osmContract = new web3.eth.Contract(abiOSM, osmAddr);

  this.web3 = web3;
  this.flipContract = flipContract;
  this.osmContract = osmContract;
  this.kicks = new Map();
  this.bids = new Map();
}

Flipper.prototype._getPrice = async function _getPrice(blockNumber) {
  let out = undefined;
  await this.osmContract.getPastEvents("LogValue", {
    fromBlock: blockNumber - 600,
    toBlock: blockNumber
  }, (err, res) => {
    if (err) {
      throw err;
    }

    const mostRecent = res.pop();
    const priceInWei = this.web3.utils.toBN(mostRecent.returnValues[0]);
    const priceString = this.web3.utils.fromWei(priceInWei);
    out =  new BigNumber(priceString);
  });

  return out;
};

Flipper.prototype.getEvents = async function getEvents(f) {
  const lastBlock = await this.web3.eth.getBlockNumber();
  const me = this;
  const readEvents = async (fromBlock, toBlock) => {
    const res = await me.flipContract.getPastEvents("allEvents", {
      fromBlock: fromBlock,
      toBlock: toBlock,
    }, (err) => {
      if (err) {
        throw err;
      }
    });


    for (let i = 0; i < res.length; i++) {
      const event = res[i];
      if (!blockDates.has(event.blockNumber)) {
        await me.web3.eth.getBlock(event.blockNumber).then(function (block) {
          blockDates.set(event.blockNumber, new Date(block.timestamp * 1000))
        });
      }

      if (event.event === "Kick") {
        const flipId = parseInt(event.returnValues.id, 10);
        const gemPrice = await me._getPrice(event.blockNumber);

        let lot = new BigNumber(event.returnValues.lot).dividedBy(LOT_DIVISOR);
        const kick = {
          usr: event.returnValues.usr,
          tab: new BigNumber(event.returnValues.tab).dividedBy(TAB_DIVISOR),
          lot,
          lotPrice: lot.times(gemPrice),
          kickBlock: event.blockNumber,
          kickDate: blockDates.get(event.blockNumber),
        };

        me.kicks.set(flipId, kick);
        continue
      }

      const flipId = parseInt(event.raw.topics[2], 16);
      if (!me.bids.has(flipId)) {
        me.bids.set(flipId, [])
      }

      if (event.raw.topics[0] === TEND) {
        const raw = event.raw.data.slice(289, -248);
        const bid = new BigNumber(raw, 16).dividedBy(BID_DIVISOR);
        const lot = new BigNumber(event.raw.topics[3], 16).dividedBy(TEN_TO_18);

        me.bids.get(flipId).push({
          bid,
          lot,
          bidPrice: bid.dividedBy(lot),
          block: event.blockNumber,
          date: blockDates.get(event.blockNumber)
        })

      } else if (event.raw.topics[0] === DENT) {
        const raw = event.raw.data.slice(289, -248);
        const bid = new BigNumber(raw, 16).dividedBy(BID_DIVISOR);
        const lot = new BigNumber(event.raw.topics[3], 16).dividedBy(TEN_TO_18);

        me.bids.get(flipId).push({
          bid,
          lot,
          bidPrice: bid.dividedBy(lot),
          block: event.blockNumber,
          date: blockDates.get(event.blockNumber)
        })

      } else if (event.raw.topics[0] === DEAL) {
        const flipId = parseInt(event.raw.topics[2], 16);
        const price = await me._getPrice(event.blockNumber);
        const bids = me.bids.get(flipId) || [];
        const deal = {
          gemPrice: price,
          dealBlock: event.blockNumber,
          dealDate: blockDates.get(event.blockNumber),
          kick: me.kicks.get(flipId),
          flipId,
          bids
        };

        f(deal);
      }
    }
  };

  let since = FIRST_BLOCK;
  for (let next = since + PAGE; next < lastBlock; next = next + PAGE) {
    await readEvents(since, next);
    since = next + 1;
  }

  await readEvents(since, lastBlock);
};

exports.Flipper = Flipper;