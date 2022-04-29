import {
  AddressType,
  BitcoinjsKeyPair,
  BitcoinjsNetwork,
  MultisigAddressType,
  SinglesigAddressType,
  BitcoinishSignedTransaction,
  BitcoinishSignedTransactionData,
  BitcoinishUnsignedTransaction
} from './types'
import { TransactionStatus, BaseMultisigData, MultisigData, ecpair } from '@bitaccess/coinlib-common'
import * as bitcoin from 'bitcoinjs-lib-bigint'
import { isString } from '@faast/ts-common'
import b58 from 'bs58check'

export function isValidAddress(address: string, network: BitcoinjsNetwork): boolean {
  try {
    bitcoin.address.toOutputScript(address, network)
    return true
  } catch (e) {
    return false
  }
}

export function standardizeAddress(address: string, network: BitcoinjsNetwork): string | null {
  if (!isValidAddress(address, network)) {
    return null
  }
  // Uppercase bech32 addresses are valid but lowercase is standard
  const lowercase = address.toLowerCase()
  if (lowercase.startsWith(network.bech32) && isValidAddress(lowercase, network)) {
    return lowercase
  }
  return address
}

export function isValidPublicKey(publicKey: string | Buffer, network: BitcoinjsNetwork): boolean {
  try {
    ecpair.fromPublicKey(publicKeyToBuffer(publicKey), { network })
    return true
  } catch (e) {
    return false
  }
}

export function isValidExtraId(extraId: string): boolean {
  return false
}

export function isValidPrivateKey(privateKey: string, network: BitcoinjsNetwork): boolean {
  try {
    privateKeyToKeyPair(privateKey, network)
    return true
  } catch (e) {
    return false
  }
}

export function publicKeyToBuffer(publicKey: string | Buffer): Buffer {
  return isString(publicKey) ? Buffer.from(publicKey, 'hex') : publicKey
}

export function publicKeyToString(publicKey: string | Buffer): string {
  return isString(publicKey) ? publicKey : publicKey.toString('hex')
}

export function getMultisigPaymentScript(
  network: BitcoinjsNetwork,
  addressType: MultisigAddressType,
  pubkeys: Buffer[],
  m: number,
): bitcoin.payments.Payment {
  const scriptParams = {
    network,
    redeem: bitcoin.payments.p2ms({
      pubkeys: pubkeys.sort(),
      m,
      network,
    }),
  }
  switch (addressType) {
    case AddressType.MultisigLegacy:
      return bitcoin.payments.p2sh(scriptParams)
    case AddressType.MultisigSegwitNative:
      return bitcoin.payments.p2wsh(scriptParams)
    case AddressType.MultisigSegwitP2SH:
      return bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wsh(scriptParams),
        network,
      })
  }
}

export function getSinglesigPaymentScript(
  network: BitcoinjsNetwork,
  addressType: SinglesigAddressType,
  pubkey: Buffer,
): bitcoin.payments.Payment {
  const scriptParams = { network, pubkey }
  switch (addressType) {
    case AddressType.Legacy:
      return bitcoin.payments.p2pkh(scriptParams)
    case AddressType.SegwitNative:
      return bitcoin.payments.p2wpkh(scriptParams)
    case AddressType.SegwitP2SH:
      return bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh(scriptParams),
        network,
      })
  }
}

export function publicKeyToAddress(
  publicKey: string | Buffer,
  network: BitcoinjsNetwork,
  addressType: SinglesigAddressType,
): string {
  const pubkey = publicKeyToBuffer(publicKey)
  const script = getSinglesigPaymentScript(network, addressType, pubkey)
  const { address } = script
  if (!address) {
    throw new Error('bitcoinjs-lib-bigint address derivation returned falsy value')
  }
  return address
}

export function publicKeyToKeyPair(publicKey: string | Buffer, network: BitcoinjsNetwork): BitcoinjsKeyPair {
  return ecpair.fromPublicKey(publicKeyToBuffer(publicKey), { network })
}

export function privateKeyToKeyPair(privateKey: string, network: BitcoinjsNetwork): BitcoinjsKeyPair {
  return ecpair.fromWIF(privateKey, network)
}

export function privateKeyToAddress(privateKey: string, network: BitcoinjsNetwork, addressType: SinglesigAddressType) {
  const keyPair = privateKeyToKeyPair(privateKey, network)
  return publicKeyToAddress(keyPair.publicKey, network, addressType)
}

function bufferFromUInt32(x: number) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(x, 0)
  return b
}

/**
 * Utility for converting xpub/xprv prefixed hd keys to the network specific prefix (ie Ltub/Ltpv)
 */
export function convertXPrefixHdKeys(hdKey: string, network: BitcoinjsNetwork): string {
  let newMagicNumber
  if (hdKey.startsWith('xpub')) {
    newMagicNumber = network.bip32.public
  } else if (hdKey.startsWith('xprv')) {
    newMagicNumber = network.bip32.private
  } else {
    // Not recognized so probably already has network prefix
    return hdKey
  }
  let data = b58.decode(hdKey)
  data = data.slice(4)
  data = Buffer.concat([bufferFromUInt32(newMagicNumber), data])
  return b58.encode(data)
}

function keypairValidator(publicKey: Buffer, hash: Buffer, signature: Buffer): boolean{
  const keypair = ecpair.fromPublicKey(publicKey)
  return keypair.verify(hash, signature)
}

export function validateAndFinalizeSignedTx(
  tx: BitcoinishSignedTransaction | BitcoinishUnsignedTransaction,
  psbt: bitcoin.Psbt,
): BitcoinishSignedTransaction {
  if (!psbt.validateSignaturesOfAllInputs(keypairValidator)) {
    throw new Error('Failed to validate signatures of all inputs')
  }
  psbt.finalizeAllInputs()
  const signedTx = psbt.extractTransaction()
  const txId = signedTx.getId()
  const txHex = signedTx.toHex()
  const txData = tx.data
  const unsignedTxHash = BitcoinishSignedTransactionData.is(txData) ? txData.unsignedTxHash : txData.rawHash
  return {
    ...tx,
    status: TransactionStatus.Signed,
    id: txId,
    data: {
      hex: txHex,
      partial: false,
      unsignedTxHash,
      changeOutputs: tx.data?.changeOutputs,
    },
  }
}


export function isMultisigFullySigned(multisigData: MultisigData): boolean {
  if (BaseMultisigData.is(multisigData)) {
    return multisigData.signedAccountIds.length >= multisigData.m
  }
  return Object.values(multisigData).every(isMultisigFullySigned)
}

export function updateSignedMultisigTx(
  tx: BitcoinishSignedTransaction | BitcoinishUnsignedTransaction,
  psbt: bitcoin.Psbt,
  updatedMultisigData: MultisigData,
): BitcoinishSignedTransaction {
  if (isMultisigFullySigned(updatedMultisigData)) {
    const finalizedTx = validateAndFinalizeSignedTx(tx, psbt)
    return {
      ...finalizedTx,
      multisigData: updatedMultisigData,
    }
  }
  const combinedHex = psbt.toHex()
  const unsignedTxHash = BitcoinishSignedTransactionData.is(tx.data) ? tx.data.unsignedTxHash : tx.data.rawHash
  return {
    ...tx,
    id: '',
    status: TransactionStatus.Signed,
    multisigData: updatedMultisigData,
    data: {
      hex: combinedHex,
      partial: true,
      unsignedTxHash,
      changeOutputs: tx.data?.changeOutputs,
    },
  }
}