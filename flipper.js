const BigNumber = require('bignumber.js');

const EVENTS_PER_BLOCK = 0.002835741676158897;
const DESIRED_EVENTS = 1000;
const PAGE = Math.floor( DESIRED_EVENTS / EVENTS_PER_BLOCK );
const DEAL = "0xc959c42b00000000000000000000000000000000000000000000000000000000";
const FIRST_BLOCK = 8865649;

function Flipper(web3, flipperAddr, osmAddr) {
  const abiFlipper = require('./abi/Flipper');
  const abiOSM = require('./abi/OSM');
  const addr = require('./addresses');

  const flipContract = new web3.eth.Contract(abiFlipper, flipperAddr);
  const osmContract = new web3.eth.Contract(abiOSM, osmAddr);

  this.web3 = web3;
  this.flipContract = flipContract;
  this.osmContract = osmContract;
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

Flipper.prototype.getEvents = async function getEvents(stream) {
  const lastBlock = await this.web3.eth.getBlockNumber();
  const me = this;
  const readEvents = async (flipContract, fromBlock, toBlock) => {
    const res = await flipContract.getPastEvents("allEvents", {
      fromBlock: fromBlock,
      toBlock: toBlock,
    }, (err) => {
      if (err) {
        throw err;
      }
    });

    for (let i = 0; i < res.length; i++) {
      const event = res[i];
      if (event.raw.topics[0] === DEAL) {
        const price = await me._getPrice(event.blockNumber);
        console.info("price", price.toFixed(3))
      }
    }
  };

  let since = FIRST_BLOCK;
  for (let next = since + PAGE; next < lastBlock; next = next + PAGE) {
    await readEvents(this.flipContract, since, next);
    since = next;
  }

  await readEvents(this.flipContract, since, lastBlock);
};

exports.Flipper = Flipper;