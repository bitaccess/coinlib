const StellarSdk = require('stellar-sdk')
const server = new StellarSdk.Server('https://horizon.stellar.org');
const accountId = 'GDNUBY24UY7PMCCVT6LCPQHRYA4YRITFXILWUMONFMLZUBN55S6NQMPE';

/*
server.transactions()
  .forAccount(accountId)
  .call()
  .then(async (page) => {
    for (let record of page.records) {
      console.log(record)
      console.log(await record.operations())
    }
  })
  .catch(function (err) {
      console.log(err);
  });

*/

server.feeStats()
  .then(console.log)
