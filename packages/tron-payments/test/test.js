'use strict'

/* eslint-disable no-console, no-process-env */
/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const chai = require('chai')
const expect = chai.expect
chai.config.includeStack = true
const TronWeb = require('tronweb')
const fullNode = 'https://api.trongrid.io'
const solidityNode = 'https://api.trongrid.io'
const eventServer = 'https://api.trongrid.io'
const tronWeb = new TronWeb(
  fullNode,
  solidityNode,
  eventServer
)
let xprv = 'xprv9s21ZrQH143K3z2wCDRa3rHg9CHKedM1GvbJzGeZB14tsFdiDtpY6T96c1wWr9rwWhU5C8zcEWFbBVa4T3A8bhGSESDG8Kx1SSPfM2rrjxk'
let xpubOnPath = 'xpub6Ei3StWywFofNKsWoem3m4x7hsRHCXjdPfYoEB1bPFgw4BASMbuLhyi5QdAPZ3MSULoFWt4yzyTJLF91Cw9VsokejWJuCbC6NgyVuBkL3hm'

let privateKey = ''
let pubAddress = ''
let TrxDepositUtils = require('../index')()
describe('TrxDepositUtils', function () {
  it('try to derive a publicKey', function (done) {
    // > tronWeb.address.toHex('TBR4KDPrN9BrnyjienckS2xixcTpJ9aP26')
    // '410fdbb073f86cea5c16eb05f1b2e174236c003b57'

    pubAddress = TrxDepositUtils.bip44(xpubOnPath, 1)
    let address = tronWeb.address.fromHex(pubAddress)
    console.log('address', address)
    done()
  })

  it('getPrivateKey for 0/1', function (done) {
    let privateKey1 = TrxDepositUtils.getPrivateKey(xprv, 1)
    let privateKey2 = TrxDepositUtils.getPrivateKey(xprv, 2)

    let publicKey1 = tronWeb.address.fromPrivateKey(privateKey1)
    let publicKey2 = tronWeb.address.fromPrivateKey(privateKey2)
    console.log(publicKey1)
    console.log(publicKey2)
    tronWeb.trx.getBalance(publicKey1).then(balance => {
      console.log(publicKey1, balance)
      return tronWeb.trx.getBalance(publicKey2)
    }).then(balance => {
      console.log(publicKey2, balance)
      return tronWeb.transactionBuilder.sendTrx(publicKey2, 100, publicKey1)
    }).then(tx => {
      console.log(tx)
      return tronWeb.trx.sign(tx, privateKey1)
    }).then(signed => {
      console.log(signed)
      return tronWeb.trx.sendRawTransaction(signed)
    }).then(broadcasted => {
      console.log(broadcasted)
      done()
    }).catch(err => {
      let error = new Error(err)
      console.error(error)
      done(err)
    })
  })

// it('getDepositAddress for 0/1', function (done) {
//   pubAddress = TrxDepositUtils.bip44(xpubOnPath, 1)
//   expect(pubAddress).to.equal('0x1a833835752ae962c8c5a2787d07b049151bb82b')
//   done()
// })
// it('privateToPublic for 0/1', function (done) {
//   let pubKey = TrxDepositUtils.privateToPublic(privateKey)
//   expect(pubKey).to.equal(pubAddress)
//   done()
// })
// it('generate a new set of pub and priv keys', function (done) {
//   let keys = TrxDepositUtils.generateNewKeys()
//   expect(keys.xpub).to.exist
//   expect(keys.xprv).to.exist
//   done()
// })
// it('get an xpub from an xprv', function (done) {
//   let generateXpub = TrxDepositUtils.getXpubFromXprv(xprv)
//   expect(generateXpub).to.deep.equal(xpubOnPath)
//   done()
// })
// // This test takes a long time. It really just makes sure we don't have padding
// // issues in a brute force way.
// if (true) {
//   it('generate 1000 addresses and private keys, make sure they match', function (done) {
//     let paths = []
//     for (let i = 4000; i < 5000; i++) {
//       paths.push(i)
//     }
//     let tasks = []
//     paths.forEach(function (path) {
//       tasks.push(function (cb) {
//         let pub = TrxDepositUtils.bip44(xpubOnPath, path)
//         let prv = TrxDepositUtils.getPrivateKey(xprv, path)
//         let pubFromPrv = TrxDepositUtils.privateToPublic(prv)
//         if (pub === pubFromPrv) {
//           cb(null, {pub: pub, prv: prv})
//         } else {
//           cb(new Error('key mismatch', pub, prv, pubFromPrv))
//         }
//       })
//     })
//     let async = require('async')
//     async.parallel(tasks, function (err, res) {
//       expect(err).to.not.exist
//       // console.log(res)
//       done(err)
//     })
//   })
// }
})
