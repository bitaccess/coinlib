import { createUnitConverters } from '@faast/payments-common'
import * as bitcoin from 'bitcoinjs-lib'
import * as bip32 from 'bip32'
import { isString } from '@faast/ts-common'

import { AddressType, BitcoinjsKeyPair, SinglesigAddressType } from './types'
import { BitcoinjsNetwork } from '@faast/bitcoin-payments'
import { DECIMAL_PLACES } from './constants'

const {
  toMainDenominationBigNumber,
  toMainDenominationString,
  toMainDenominationNumber,
  toBaseDenominationBigNumber,
  toBaseDenominationString,
  toBaseDenominationNumber,
} = createUnitConverters(DECIMAL_PLACES)

export {
  toMainDenominationBigNumber,
  toMainDenominationString,
  toMainDenominationNumber,
  toBaseDenominationBigNumber,
  toBaseDenominationString,
  toBaseDenominationNumber,
}

export function isValidAddress(address: string, network: BitcoinjsNetwork): boolean {
  try {
    bitcoin.address.toOutputScript(address, network)
    return true
  } catch (e) {
    return false
  }
}

export function isValidPublicKey(publicKey: string | Buffer, network: BitcoinjsNetwork): boolean {
  try {
    bitcoin.ECPair.fromPublicKey(publicKeyToBuffer(publicKey), { network })
    return true
  } catch (e) {
    return false
  }
}

export function isValidExtraId(extraId: string): boolean {
  return false
}

export function publicKeyToBuffer(publicKey: string | Buffer): Buffer {
  return isString(publicKey) ? Buffer.from(publicKey, 'hex') : publicKey
}

export function publicKeyToString(publicKey: string | Buffer): string {
  return isString(publicKey) ? publicKey : publicKey.toString('hex')
}

export function getSinglesigPaymentScript(
  network: BitcoinjsNetwork,
  addressType: SinglesigAddressType,
  pubkey: Buffer,
): bitcoin.payments.Payment {
  const scriptParams = { network, pubkey }
  return bitcoin.payments.p2pkh(scriptParams)
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
    throw new Error('bitcoinjs-lib address derivation returned falsy value')
  }
  return address
}

export function publicKeyToKeyPair(publicKey: string | Buffer, network: BitcoinjsNetwork): BitcoinjsKeyPair {
  return bitcoin.ECPair.fromPublicKey(publicKeyToBuffer(publicKey), { network })
}

export function privateKeyToKeyPair(privateKey: string, network: BitcoinjsNetwork): BitcoinjsKeyPair {
  return bitcoin.ECPair.fromWIF(privateKey, network)
}

export function privateKeyToAddress(privateKey: string, network: BitcoinjsNetwork, addressType: SinglesigAddressType) {
  const keyPair = privateKeyToKeyPair(privateKey, network)
  return publicKeyToAddress(keyPair.publicKey, network, addressType)
}

export function isValidPrivateKey(privateKey: string, network: BitcoinjsNetwork): boolean {
  try {
    privateKeyToKeyPair(privateKey, network)
    return true
  } catch (e) {
    return false
  }
}
