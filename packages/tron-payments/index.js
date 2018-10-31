const bitcore = require('bitcore-lib')
const TronBip44 = require('./tron-bip44')()
function TronDepositUtils (options) {
  if (!(this instanceof TronDepositUtils)) return new TronDepositUtils(options)
  let self = this
  self.options = Object.assign({}, options || {})
  // if (!self.options.password) throw new Error('TronDepositUtils: password required')
  return self
}

// https://github.com/trapp/ethereum-bip44
TronDepositUtils.prototype.bip44 = function (xpub, path) {
  let self = this
  let address = TronBip44.getAddress(xpub, path)
  // if (ethereumAddress.isAddress(address)) {
  return address
  // } else {
  return new Error('address validation failed')
// }
}

// // https://github.com/trapp/ethereum-bip44
TronDepositUtils.prototype.getPrivateKey = function (xprv, path) {
  let self = this
  if (!xprv) throw new Error('Xprv is null. Bad things will happen to you.')
  // create the hd wallet
  let secretKey = TronBip44.getPrivateKey(xprv, path)
  return secretKey
}

TronDepositUtils.prototype.privateToPublic = function (privateKey) {
  let pub = TronBip44.privateToPublic(privateKey)
  if (ethereumAddress.isAddress(pub)) {
    return pub
  } else {
    return new Error('address validation failed')
  }
}

TronDepositUtils.prototype.generateNewKeys = function () {
  // to gererate a key:
  let key = new bitcore.HDPrivateKey()
  let derivedPubKey = key.derive("m/44'/195'/0'/0").hdPublicKey
  return {
    xpub: derivedPubKey.toString(),
    xprv: key.toString()
  }
}

TronDepositUtils.prototype.getXpubFromXprv = function (xprv) {
  let key = new bitcore.HDPrivateKey(xprv)
  let derivedPubKey = key.derive("m/44'/195'/0'/0").hdPublicKey
  return derivedPubKey.toString()
}

module.exports = TronDepositUtils
