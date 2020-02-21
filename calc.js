const csv = require('csv-parser');
const fs = require('fs');
const yaml = require('js-yaml');
const ror = require('./expected-value');
const BigNumber = require('bignumber.js');
const zero = BigNumber(0);
const val = {};
const weightedRor = {};

function main() {
  const c = yaml.safeLoad(fs.readFileSync('./constants.yml', 'utf8'));
  ror.setRiskFree(c.risk_free_rate);
  fs.createReadStream('./out.csv')
    .pipe(csv())
    .on('data', (row) => {
      // const {v, k, sigma, beta, marketRiskPremium} = params;
      const v = BigNumber(row.collateral_value_usd);
      const k = BigNumber(row.debt_value);
      if (!k.gt(zero)) {
        return
      }

      const rD = ror.getYeild({
        ...c[row.ilk],
        k: k.toNumber(),
        v: v.toNumber(),
      });

      const weightedRd = new BigNumber(rD).times(k);
      val[row.ilk] = (val[row.ilk] && val[row.ilk].plus(k)) || k ;
      weightedRor[row.ilk] = (weightedRor[row.ilk] && weightedRor[row.ilk].plus(weightedRd)) || weightedRd
    })
    .on('end', () => {
      console.log('Weighted Rd, Spread:');
      for (const [k, v] of Object.entries(val)) {
        const rD = weightedRor[k];
        const avgYield = rD.dividedBy(v);
        const spread = avgYield.minus(c.risk_free_rate);
        console.log(`${k}: ${avgYield.times(100).toFixed(3)}%, ${spread.times(100).toFixed(3)}%`)
      }
    });

}

main();
