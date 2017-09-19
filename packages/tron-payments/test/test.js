'use strict'

/* eslint-disable no-console, no-process-env */
/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const chai = require('chai')
const expect = chai.expect
chai.config.includeStack = true

let xprv = 'xprv9s21ZrQH143K3z2wCDRa3rHg9CHKedM1GvbJzGeZB14tsFdiDtpY6T96c1wWr9rwWhU5C8zcEWFbBVa4T3A8bhGSESDG8Kx1SSPfM2rrjxk'
let xpubOnPath = 'xpub6Ei3StWywFofNKsWoem3m4x7hsRHCXjdPfYoEB1bPFgw4BASMbuLhyi5QdAPZ3MSULoFWt4yzyTJLF91Cw9VsokejWJuCbC6NgyVuBkL3hm'

let privateKey = ''
let pubAddress = ''
let EthDepositUtils = require('../index')()
describe('EthDepositUtils', function () {
  it('getDepositAddress for 0/1', function (done) {
    pubAddress = EthDepositUtils.bip44(xpubOnPath, 1)
    expect(pubAddress).to.equal('0x1a833835752ae962c8c5a2787d07b049151bb82b')
    done()
  })
  it('getPrivateKey for 0/1', function (done) {
    privateKey = EthDepositUtils.getPrivateKey(xprv, 1)
    expect(privateKey).to.equal('0x7fcb712430b46884da167631d2279c61c96dbc05452b6f20f4c218e62954d40e')
    done()
  })
  it('privateToPublic for 0/1', function (done) {
    let pubKey = EthDepositUtils.privateToPublic(privateKey)
    expect(pubKey).to.equal(pubAddress)
    done()
  })
  it('generate a new set of pub and priv keys', function (done) {
    let keys = EthDepositUtils.generateNewKeys()
    expect(keys.xpub).to.exist
    expect(keys.xprv).to.exist
    done()
  })
  it('get an xpub from an xprv', function (done) {
    let generateXpub = EthDepositUtils.getXpubFromXprv(xprv)
    expect(generateXpub).to.deep.equal(xpubOnPath)
    done()
  })
  // This test takes a long time. It really just makes sure we don't have padding
  // issues in a brute force way.
  if (true) {
    it('generate 1000 addresses and private keys, make sure they match', function (done) {
      let paths = []
      for (let i = 4000; i < 5000; i++) {
        paths.push(i)
      }
      let tasks = []
      paths.forEach(function (path) {
        tasks.push(function (cb) {
          let pub = EthDepositUtils.bip44(xpubOnPath, path)
          let prv = EthDepositUtils.getPrivateKey(xprv, path)
          let pubFromPrv = EthDepositUtils.privateToPublic(prv)
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
})
