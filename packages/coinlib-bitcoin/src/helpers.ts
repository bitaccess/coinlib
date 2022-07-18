import { createUnitConverters, NetworkType } from '@bitaccess/coinlib-common'
import * as bitcoin from 'bitcoinjs-lib-bigint'
import {
  DECIMAL_PLACES,
  NETWORKS,
  BITCOIN_SUPPORTED_ADDRESS_TYPES,
} from './constants'
import * as bitcoinish from './bitcoinish'

export {
  getMultisigPaymentScript,
  getSinglesigPaymentScript,
  publicKeyToAddress,
  publicKeyToKeyPair,
  publicKeyToString,
  publicKeyToBuffer,
  privateKeyToKeyPair,
  privateKeyToAddress,
} from './bitcoinish'

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

export function isValidAddress(address: string, networkType: NetworkType): boolean {
  return bitcoinish.isValidAddress(address, NETWORKS[networkType])
}

export function standardizeAddress(address: string, networkType: NetworkType): string | null {
  return bitcoinish.standardizeAddress(address, NETWORKS[networkType])
}

export function isValidPublicKey(publicKey: string | Buffer, networkType: NetworkType): boolean {
  return bitcoinish.isValidPublicKey(publicKey, NETWORKS[networkType])
}

export function isValidExtraId(extraId: string): boolean {
  return bitcoinish.isValidExtraId(extraId)
}

export function isValidPrivateKey(privateKey: string, networkType: NetworkType): boolean {
  return bitcoinish.isValidPrivateKey(privateKey, NETWORKS[networkType])
}

export function estimateBitcoinTxSize(
  inputCounts: { [k: string]: number },
  outputCounts: { [k: string]: number },
  networkType: NetworkType,
) {
  return bitcoinish.estimateTxSize(inputCounts, outputCounts, (address: string) =>
    bitcoin.address.toOutputScript(address, NETWORKS[networkType]),
  )
}

export function isSupportedAddressType(addressType: string): boolean {
  return BITCOIN_SUPPORTED_ADDRESS_TYPES.map(at => at.toString()).includes(addressType)
}

export function getSupportedAddressTypes(): bitcoinish.AddressType[] {
  return BITCOIN_SUPPORTED_ADDRESS_TYPES
}

export function hexSeedToBuffer(seedHex: string): Buffer {
  const seedBuffer = Buffer.from(seedHex, 'hex')
  return seedBuffer
}