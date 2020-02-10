const mathjs = require('mathjs');

var rf = 0;
var t = 0;

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

function expectedReturn(params) {
  // =LN(V_ETH/(K_ETH*EXP(-rf_ETH*T_ETH))/(SIGMA_ETH*SQRT(T_ETH)))
  const {v, k, sigma, beta, marketRiskPremium} = params;
  const d1 = Math.log(v / (k * Math.exp(-rf*t))/sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);

  const nD1 = cdfNormal(d1, 0, 1);
  const nD2 = cdfNormal(d2, 0, 1);

  const marketValueEquity = v * nD1 - k * Math.exp(-rf * t) * nD2;
  const marketValueDebt = v - marketValueEquity;

  const risklessDebt = k * Math.exp(-rf*t);
  const putPrice =  risklessDebt - marketValueDebt;
  const riskyDebt = k - putPrice;

  const betaDebt = -beta * (nD1 - 1) * v / riskyDebt;
  return rf + marketRiskPremium * betaDebt
 }

exports.setRiskFree = setRiskFree;
exports.setT = setT;
exports.expectedReturn = expectedReturn;


