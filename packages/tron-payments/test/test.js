'use strict'

/* eslint-disable no-console, no-process-env */
/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const chai = require('chai')
const expect = chai.expect
chai.config.includeStack = true

let xprv = 'xprv9s21ZrQH143K3z2wCDRa3rHg9CHKedM1GvbJzGeZB14tsFdiDtpY6T96c1wWr9rwWhU5C8zcEWFbBVa4T3A8bhGSESDG8Kx1SSPfM2rrjxk'
let xpubOnPath = 'xpub6F26s5sffTo9QdiPbC9vBqCdQDZ6ChDpQPp5oEVW1Fy8ShQKnVWWKETZbcwnTNLCc15PzhcDpMz7t2iJnqZ5ukWiG3aHNudjRmeXC3GBhMr'

let privateKey = ''
let pubAddress = ''
let TrxDepositUtils = require('../index')()
describe('TrxDepositUtils', function () {
  it('get an xpub from an xprv', function (done) {
    let generateXpub = TrxDepositUtils.getXpubFromXprv(xprv)
    expect(generateXpub).to.deep.equal(xpubOnPath)
    done()
  })
  it('getDepositAddress for 0/1', function (done) {
    pubAddress = TrxDepositUtils.bip44(xpubOnPath, 1)
    expect(pubAddress).to.equal('TBR4KDPrN9BrnyjienckS2xixcTpJ9aP26')
    done()
  })
  it('getPrivateKey for 0/1', function (done) {
    privateKey = TrxDepositUtils.getPrivateKey(xprv, 1)
    expect(privateKey).to.equal('993CB9AF194F23C8BE6D703CEE111DFBFF63C2D55F54FA366E2362A138BFBFB0')
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
    TrxDepositUtils.getBalanceFromPath(xpubOnPath, 3, function (err, balance) {
      if (err) console.log(err)
      expect(balance.balance).to.exist
      sweepBalance = balance.rawBalance
      done()
    })
  })

  it('Generate a sweep transaction for a single address', function (done) {
    let to = TrxDepositUtils.bip44(xpubOnPath, 2)
    TrxDepositUtils.getSweepTransaction(xprv, 3, to, function (err, signedtx) {
      if (err) console.log(err)
      expect(signedtx).to.exist
      expect(signedtx.signedTx.raw_data.contract[0].parameter.value.amount).to.equal(sweepBalance)
      done()
    })
  })
  let signedSendTransaction
  it('Generate a send transaction', function (done) {
    let amountInSun = 2323
    let to = TrxDepositUtils.bip44(xpubOnPath, 5)
    TrxDepositUtils.getSendTransaction(privateKey, amountInSun, to, function (err, signedtx) {
      if (err) console.log(err)
      expect(signedtx).to.exist
      expect(signedtx.signedTx.raw_data.contract[0].parameter.value.amount).to.equal(2323)
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
