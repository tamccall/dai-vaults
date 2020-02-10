const {expectedReturn, setRiskFree, setT} = require('./expected-value');

// ETH Example
// https://docs.google.com/spreadsheets/d/1caPAHIQCqeGI4pVxsgPsUy58WBoXAntiL6nWKrkqNFw/edit?usp=sharing
test("expected return from spreadsheet", () => {
  setRiskFree(0.0875);
  setT(1);
  const params = {
    v: 375000000,
    k: 125000000,
    sigma: 1.02,
    beta: 0.6425,
    marketRiskPremium: 0.3816448988
  };
  const er = expectedReturn(params);
  expect(er).toEqual(0.1808)
});