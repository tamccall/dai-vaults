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
  await this.osmContract.getPastEvents("LogEvent", {
    fromBlock: blockNumber - 600,
    toBlock: blockNumber
  }, (err, res) => {
    if (err) {
      throw err;
    }

    const mostRecent = res.pop();
    const priceInWei = this.web3.utils.toBN(mostRecent.returnValues[0]);
    const priceString = this.web3.utils.fromWei(priceInWei);
    return new BigNumber(priceString);
  })
};

Flipper.prototype.getEvents = async function getEvents(stream) {
  const lastBlock = await this.web3.eth.getBlockNumber();
  let since = FIRST_BLOCK;
  for (let next = since + PAGE; next < lastBlock; next = next + PAGE) {
    await this.flipContract.getPastEvents("allEvents", {
      fromBlock: since,
      toBlock: next,
    }, (err, res) => {
      if (err) {
        throw err;
      }

      console.log("Number of results", res.length);
    });
    since = next;
  }

  await this.flipContract.getPastEvents("allEvents", {
    fromBlock: since,
    toBlock: lastBlock,
  }, (err, res) => {
    if (err) {
      throw err;
    }

    console.log("Number of results", res.length);
  });
};

exports.Flipper = Flipper;