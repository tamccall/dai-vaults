const mathjs = require('mathjs');

let rf = 0;
let t = 1;

function setRiskFree(newRF) {
  rf = newRF;
}

function setT(newT) {
  t = newT
}

function cdfNormal (x) {
  const mean = 0;
  const standardDeviation = 1;
  return (1 - mathjs.erf((mean - x ) / (Math.sqrt(2) * standardDeviation))) / 2
}

function getYield(params) {
  const {k} = params;
  const { marketValueDebt } = merton(params);
  return Math.log(k / marketValueDebt);
}

function merton(params) {
  const {v, k, sigma } = params;
  const d1 = Math.log(v / (k * Math.exp(-rf * t)) / sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);

  const nD1 = cdfNormal(d1, 0, 1);
  const nD2 = cdfNormal(d2, 0, 1);

  const marketValueEquity = v * nD1 - k * Math.exp(-rf * t) * nD2;
  const marketValueDebt = v - marketValueEquity;
  return {nD1, nD2, marketValueDebt};
}

function expectedReturn(params) {
  const { beta, marketRiskPremium} = params;
  const {nD1, marketValueDebt} = merton(params);

  const risklessDebt = k * Math.exp(-rf*t);
  const putPrice =  risklessDebt - marketValueDebt;
  const riskyDebt = k - putPrice;

  const betaDebt = -beta * (nD1 - 1) * v / riskyDebt;
  return rf + marketRiskPremium * betaDebt
 }

exports.setRiskFree = setRiskFree;
exports.setT = setT;
exports.expectedReturn = expectedReturn;
exports.getYeild = getYield;


