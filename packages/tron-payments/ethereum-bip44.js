const ethereumjsUtil = require('ethereumjs-util')
const pubToAddress = ethereumjsUtil.pubToAddress
const bufferToHex = ethereumjsUtil.bufferToHex
const privateToPublic = ethereumjsUtil.privateToPublic
const bitcore = require('bitcore-lib')
const HDPrivateKey = bitcore.HDPrivateKey
const HDPublicKey = bitcore.HDPublicKey
const ec = require('elliptic').ec('secp256k1')

function padTo32 (msg) {
  while (msg.length < 32) {
    msg = Buffer.concat([new Buffer([0]), msg])
  }
  if (msg.length !== 32) {
    throw new Error('invalid key length: ' + msg.length)
  }
  return msg
}

function EthereumBip44 () {
  if (!(this instanceof EthereumBip44)) return new EthereumBip44()
  let self = this
  this.parts = [
    `44'`, // bip 44
    `60'`,  // coin
    `0'`,  // wallet
    `0`    // 0 - public, 1 = private
    // index
  ]
  return self
}

EthereumBip44.prototype.bip32PublicToEthereumPublic = function (pubKey) {
  let key = ec.keyFromPublic(pubKey).getPublic().toJSON()
  return Buffer.concat([padTo32(new Buffer(key[0].toArray())), padTo32(new Buffer(key[1].toArray()))])
}

EthereumBip44.prototype.getAddress = function (xpub, index) {
  let self = this
  let key = new HDPublicKey(xpub)
  let path = this.parts.slice(key.depth)
  let derived = key.derive('m/' + (path.length > 0 ? path.join('/') + '/' : '') + index)
  let address = pubToAddress(
    self.bip32PublicToEthereumPublic(
      derived.publicKey.toBuffer()
    )
  )
  return '0x' + address.toString('hex')
}

EthereumBip44.prototype.getPrivateKey = function (xprv, index) {
  let key = new HDPrivateKey(xprv)
  let path = this.parts.slice(key.depth)
  let derived = key.derive('m/' + (path.length > 0 ? path.join('/') + '/' : '') + index)
  return bufferToHex(padTo32(derived.privateKey.toBuffer()))
}

EthereumBip44.prototype.privateToPublic = function (privateKey) {
  let self = this
  return bufferToHex(pubToAddress(privateToPublic(privateKey)))
}

module.exports = EthereumBip44
