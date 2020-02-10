const mathjs = require('mathjs');

var rf = 0;
var t = 0;

function setRiskFree(newRF) {
  rf = newRF;
}

function setT(newT) {
  t = newT
}

function expectedReturn(params) {
  // =LN(V_ETH/(K_ETH*EXP(-rf_ETH*T_ETH))/(SIGMA_ETH*SQRT(T_ETH)))
  const {v, k, sigma, beta, marketRiskPremium} = params;
  const d1 = Math.log(v / (k * Math.exp(-rf*t))/sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);

  const nD1 = mathjs.erf(d1);
  const nD2 = mathjs.erf(d2);

  const marketValueEquity = v * d1 - k * Math.exp(-rf * t) * nD2;
  const marketValueDebt = v - marketValueEquity;

  const risklessDebt = k * Math.exp(-rf*t);
  const putPrice =  risklessDebt - marketValueDebt;
  const riskyDebt = k - putPrice;

  const betaDebt = beta * (nD1 - 1) * v / riskyDebt;
  return rf + marketRiskPremium * betaDebt
 }

exports.setRiskFree = setRiskFree;
exports.setT = setT;
exports.expectedReturn = expectedReturn;


