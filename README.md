# Getting Dai Vaults
Dai vaults is a package that can be used to query all the dai vaults from the ethereum blockchain and write them to a 
csv file

To do that run
```
MAINNET_URL=https://mainnet.infura.io/v3/yourinfuraproject node query"
```

this will write the details of all the dai vaults into a csv file called out.js

# Getting Expected Return on debt
This package was created for the bespoke purpose of answering what is the average expected return on debt for all dai
vaults. see: https://forum.makerdao.com/t/should-bat-sf-be-reduced/1192

There are several parameters defined in `constants.yml` that are needed to do this

- `risk_free_rate` - should probably be set to whatever the DSR is currently, but can be set to whatever value you chose
- `sigma` - the annualized price volatility of the asset
- `beta` - A coefficient measure of volatility see: https://www.investopedia.com/terms/b/beta.asp
- `market_risk_premium` - the difference between the security market line and the asset annual return. See: https://www.investopedia.com/terms/m/marketriskpremium.asp

You can edit those parameters to your liking to see how they affect the weighted rD (expected return on debt) for each asset.

To run type the following
```
node calc
```