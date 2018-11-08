const bitcore = require('bitcore-lib')
const Tronweb = require('tronweb')
const TronBip44 = require('./tron-bip44')()
const async = require('async')

function TronDepositUtils (options) {
  if (!(this instanceof TronDepositUtils)) return new TronDepositUtils(options)
  let self = this

  // overwrite options explicitly provided.
  if (options) {
    self.options = Object.assign({}, options || {})
  } else {
    // default to mainnet
    self.options = {
      fullNode: 'https://api.trongrid.io',
      solidityNode: 'https://api.trongrid.io',
      eventServer: 'https://api.trongrid.io'
    }
  }

  self.tronweb = new Tronweb(
    self.options.fullNode,
    self.options.solidityNode,
    self.options.eventServer
  )
  return self
}

TronDepositUtils.prototype.bip44 = function (xpub, path) {
  let self = this
  let pub = TronBip44.getAddress(xpub, path)
  if (self.tronweb.isAddress(pub)) {
    return pub
  } else {
    return new Error('address validation failed')
  }
}

TronDepositUtils.prototype.getPrivateKey = function (xprv, path) {
  if (!xprv) throw new Error('Xprv is null. Bad things will happen to you.')
  // create the hd wallet
  let secretKey = TronBip44.getPrivateKey(xprv, path)
  return secretKey
}

TronDepositUtils.prototype.privateToPublic = function (privateKey) {
  let self = this
  let pub = self.tronweb.address.fromPrivateKey(privateKey)
  if (self.tronweb.isAddress(pub)) {
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

// {balance: body.balance, unconfirmedBalance: body.unconfirmedBalance}
TronDepositUtils.prototype.getBalance = function (xpub, path, done) {
  let self = this
  let pub = TronBip44.getAddress(xpub, path)
  self.tronweb.trx.getBalance(pub, function (err, balance) {
    if (err) return done(new Error(err))
    return done(null, {balance: balance, unconfirmedBalance: 0})
  })
}

TronDepositUtils.prototype.getSweepTransaction = function (xprv, path, to, done) {
  let self = this
  let privateKey = self.getPrivateKey(xprv, path)
  let publicKey = self.privateToPublic(privateKey)
  self.tronweb.trx.getBalance(publicKey, function (err, balance) {
    if (err) return done(new Error(err))
    self.tronweb.transactionBuilder.sendTrx(to, balance, publicKey, function (err, tx) {
      if (err) return done(new Error(err))
      self.tronweb.trx.sign(tx, privateKey, function (err, signed) {
        if (err) return done(new Error(err))
        done(null, { signedTx: signed, txid: signed.txID })
      })
    })
  })
}

TronDepositUtils.prototype.getSendTransaction = function (privateKey, amountInSun, to, done) {
  let self = this
  let publicKey = self.privateToPublic(privateKey)
  self.tronweb.trx.getBalance(publicKey, function (err, balance) {
    if (err) return done(new Error(err))
    if (balance < amountInSun) return done(new Error('insufficient balance to send'))
    self.tronweb.transactionBuilder.sendTrx(to, amountInSun, publicKey, function (err, tx) {
      if (err) return done(new Error(err))
      self.tronweb.trx.sign(tx, privateKey, function (err, signed) {
        if (err) return done(new Error(err))
        done(null, { signedTx: signed, txid: signed.txID })
      })
    })
  })
}

TronDepositUtils.prototype.broadcastTransaction = function (txObject, done) {
  let self = this
  self.tronweb.trx.sendRawTransaction(txObject, function (err, broadcasted) {
    if (err) return done(new Error(err))
    done(null, broadcasted)
  })
}

// {amount, from, to, executed, block, fee, confirmed}
TronDepositUtils.prototype.getTransaction = function (txid, blocksForConfirmation, done) {
  if (typeof (blocksForConfirmation) === 'function') {
    done = blocksForConfirmation
  }
  let self = this

  // blog number: curl -X POST  https://api.trongrid.io/wallet/getnowblock
  let asyncTasks = {
    getTransaction: function (cb) {
      self.tronweb.trx.getTransaction(txid, cb)
    },
    getTransactionInfo: function (cb) {
      self.tronweb.trx.getTransactionInfo(txid, cb)
    },
    getCurrentBlock: function (cb) {
      self.tronweb.trx.getCurrentBlock(cb)
    }
  }
  async.parallel(asyncTasks, function (err, asyncResults) {
    if (err) return done(new Error(err))
    let response = {}

    let currentBlock = asyncResults.getCurrentBlock
    let transaction = asyncResults.getTransaction
    let transactionInfo = asyncResults.getTransactionInfo
    if (!transaction) return done(new Error('No Transaction found'))
    if (transaction &&
      transaction.raw_data &&
      transaction.raw_data.contract[0] &&
      transaction.raw_data.contract[0].parameter &&
      transaction.raw_data.contract[0].parameter.value &&
      transaction.raw_data.contract[0].parameter.value.amount) {
      // populate object

      response.amount = transaction.raw_data.contract[0].parameter.value.amount
      response.to = self.tronweb.address.fromHex(transaction.raw_data.contract[0].parameter.value.to_address)
      response.from = self.tronweb.address.fromHex(transaction.raw_data.contract[0].parameter.value.owner_address)
      let contractExecuted = false
      if (transaction.ret && transaction.ret[0] && transaction.ret[0].contractRet &&
        transaction.ret[0].contractRet === 'SUCCESS') {
        contractExecuted = true
      }

      response.executed = contractExecuted
      response.txid = transaction.txid
      response.raw = transaction
      response.block = transactionInfo.blockNumber
      response.fee = transactionInfo.fee

      let confirmed = false
      if (blocksForConfirmation && currentBlock && currentBlock.block_header &&
        currentBlock.block_header.raw_data && currentBlock.block_header.raw_data.number) {
        let currentBlockNumber = currentBlock.block_header.raw_data.number
        response.currentBlock = currentBlockNumber
        if (currentBlockNumber - response.block >= blocksForConfirmation) confirmed = true
      }
      response.confirmed = confirmed

      done(null, response)
    } else {
      done(new Error('Unable to get transaction'))
    }
  })
}

TronDepositUtils.prototype.sweepTransaction = function (xpub, xprv, path, to, feePerByte, done) {
  let self = this
  self.getUTXOs(xpub, path, function (err, utxo) {
    if (err) return done(err)
    let signedTx = self.getSweepTransaction(xprv, path, to, utxo, feePerByte)
    self.broadcastTransaction(signedTx, done)
  })
}

module.exports = TronDepositUtils
