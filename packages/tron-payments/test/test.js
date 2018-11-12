'use strict'

/* eslint-disable no-console, no-process-env */
/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const chai = require('chai')
const expect = chai.expect
chai.config.includeStack = true

let xprv = 'xprv9s21ZrQH143K3z2wCDRa3rHg9CHKedM1GvbJzGeZB14tsFdiDtpY6T96c1wWr9rwWhU5C8zcEWFbBVa4T3A8bhGSESDG8Kx1SSPfM2rrjxk'
let xpubOnPath = 'xpub6CHkPtveMF33AX8dX5o8z1R7qBNHF64K3w1xNrTY8v3AajCnCWSSCimZWroiKdB8UfqQdMRqoXyS4pxPCpdPCGKPPXSxej19u9tk12Ab1S7'

let privateKey = ''
let pubAddress = ''
let TrxDepositUtils = require('../index')()
describe('TrxDepositUtils', function () {
  it('get an xpub from an xprv', function (done) {
    let generateXpub = TrxDepositUtils.getXpubFromXprv(xprv)
    expect(generateXpub).to.deep.equal(xpubOnPath)
    xpubOnPath = generateXpub
    done()
  })
  it('getDepositAddress for 0/1', function (done) {
    pubAddress = TrxDepositUtils.bip44(xpubOnPath, 1)
    expect(pubAddress).to.equal('TWsgBMe63e2vJMxsFpzhfmBmbpgx9u8BmS') // TEx9hRCRYLz9ZXsN61AdeqordiFx5sYiBc
    done()
  })

  it('getPrivateKey for 0/1', function (done) {
    privateKey = TrxDepositUtils.getPrivateKey(xprv, 1)
    expect(privateKey).to.equal('01E9156CD53A7AFEB7CEB950598A381F52DEE02A45459F04F7CF734F8C085632') // 753FCB9D713D6F077BF6DA41DC015AAC4B575C3944F27FB9435EDFF5DAFE719D
    done()
  })
  it('privateToPublic for 0/1', function (done) {
    let pubKey = TrxDepositUtils.privateToPublic(privateKey)
    expect(pubKey).to.equal(pubAddress)
    done()
  })
  it('generate a new set of pub and priv keys', function (done) {
    let keys = TrxDepositUtils.generateNewKeys()
    expect(keys.xpub).to.exist
    expect(keys.xprv).to.exist
    done()
  })

  // This test takes a long time. It really just makes sure we don't have padding
  // issues in a brute force way.
  if (false) {
    it('generate 1000 addresses and private keys, make sure they match', function (done) {
      let paths = []
      for (let i = 4000; i < 5000; i++) {
        paths.push(i)
      }
      let tasks = []
      paths.forEach(function (path) {
        tasks.push(function (cb) {
          let pub = TrxDepositUtils.bip44(xpubOnPath, path)
          let prv = TrxDepositUtils.getPrivateKey(xprv, path)
          let pubFromPrv = TrxDepositUtils.privateToPublic(prv)
          if (pub === pubFromPrv) {
            cb(null, {pub: pub, prv: prv})
          } else {
            cb(new Error('key mismatch', pub, prv, pubFromPrv))
          }
        })
      })
      let async = require('async')
      async.parallel(tasks, function (err, res) {
        expect(err).to.not.exist
        // console.log(res)
        done(err)
      })
    })
  }
  let sweepBalance
  it('Get Balance for a single address', function (done) {
    TrxDepositUtils.getBalanceFromPath(xpubOnPath, 1, function (err, balance) {
      if (err) console.log(err)
      expect(balance.balance).to.exist
      sweepBalance = balance.rawBalance
      done()
    })
  })

  it('Generate a sweep transaction for a single address', function (done) {
    let to = TrxDepositUtils.bip44(xpubOnPath, 0)
    TrxDepositUtils.getSweepTransaction(xprv, 1, to, function (err, signedtx) {
      if (err) console.log(err)
      expect(signedtx).to.exist
      expect(signedtx.signedTx.raw_data.contract[0].parameter.value.amount).to.equal(sweepBalance - 1000 * 100)
      done()
    })
  })
  let signedSendTransaction
  it('Generate a send transaction', function (done) {
    let amountInSun = 12323
    let to = TrxDepositUtils.bip44(xpubOnPath, 6)
    TrxDepositUtils.getSendTransaction(privateKey, amountInSun, to, function (err, signedtx) {
      if (err) console.log(err)
      expect(signedtx).to.exist
      expect(signedtx.signedTx.raw_data.contract[0].parameter.value.amount).to.equal(12323)
      signedSendTransaction = signedtx.signedTx
      done()
    })
  })
  let broadcast = false
  if (broadcast) {
    it('Broadcast a sweep transaction for a single address', function (done) {
      TrxDepositUtils.broadcastTransaction(signedSendTransaction, function (err, txHash) {
        if (err) console.log(err)
        expect(txHash).to.exist
        console.log(txHash)
        console.log(signedSendTransaction)
        done()
      })
    })
  }
  let txHash = '209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c'
  it('Get a transaction hash without confirmations', function (done) {
    TrxDepositUtils.getTransaction(txHash, function (err, tx) {
      if (err) console.log(err)
      expect(tx).to.exist
      expect(tx.confirmed).to.equal(false)
      done()
    })
  })
  it('Get a transaction hash with confirmations', function (done) {
    TrxDepositUtils.getTransaction(txHash, 2, function (err, tx) {
      if (err) console.log(err)
      expect(tx).to.exist
      expect(tx.confirmed).to.equal(true)
      // console.log(tx)
      done()
    })
  })
  it('Fail to get an invalid transaction hash', function (done) {
    TrxDepositUtils.getTransaction('209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140d', 1, function (err, tx) {
      expect(err).to.exist
      expect(err.message).to.equal('Transaction not found')
      done()
    })
  })
  it('Get the Balance of an address', function (done) {
    TrxDepositUtils.getBalanceFromPath(xpubOnPath, 1, function (err, balance) {
      if (err) console.log(err)
      expect(balance).to.exist
      expect(balance.balance).to.exist
      done()
    })
  })
  it('Get the Balance of an address', function (done) {
    TrxDepositUtils.getBalanceAddress('TBR4KDPrN9BrnyjienckS2xixcTpJ9aP26', function (err, balance) {
      if (err) console.log(err)
      expect(balance).to.exist
      expect(balance.balance).to.exist
      done()
    })
  })

// let fullsweep = true
// if (fullsweep) {
//   it('Sweep transaction for a single address', function (done) {
//     // TrxDepositUtils.sweepTransaction(xprv, 2, to, function (err, sweptTransaction) {
//     //
//     // })
//     done()
//   })
// }
})
