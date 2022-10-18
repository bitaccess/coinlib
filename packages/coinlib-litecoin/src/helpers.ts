import { createUnitConverters, NetworkType, bip32 } from '@bitaccess/coinlib-common'
import * as bitcoin from 'bitcoinjs-lib-bigint'

import { LitecoinAddressFormat, SinglesigAddressType } from './types'
import { bitcoinish, NETWORKS as BITCOIN_NETWORKS, BitcoinjsNetwork, AddressType } from '@bitaccess/coinlib-bitcoin'
import {
  DECIMAL_PLACES,
  NETWORKS,
  LITECOIN_SUPPORTED_ADDRESS_TYPES,
} from './constants'

const {
  getMultisigPaymentScript,
  getSinglesigPaymentScript,
  publicKeyToKeyPair,
  publicKeyToString,
  publicKeyToBuffer,
  privateKeyToKeyPair,
  BITCOINISH_ADDRESS_PURPOSE,
} = bitcoinish

export {
  getMultisigPaymentScript,
  getSinglesigPaymentScript,
  publicKeyToKeyPair,
  publicKeyToString,
  publicKeyToBuffer,
  privateKeyToKeyPair,
}

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

const ADDRESS_FORMAT_NETWORKS = {
  [LitecoinAddressFormat.Deprecated]: BITCOIN_NETWORKS,
  [LitecoinAddressFormat.Modern]: NETWORKS,
}

function isP2shAddressForNetwork(address: string, network: BitcoinjsNetwork) {
  try {
    const decoded = bitcoin.address.fromBase58Check(address)
    return decoded.version === network.scriptHash
  } catch (e) {
    return false
  }
}

/**
 * Return true if address is a deprecated p2sh address (bitcoin format)
 * 3-prefix: mainnet
 * 2-prefix: testnet
 */
export function isDeprecatedP2shAddress(address: string, networkType: NetworkType) {
  return isP2shAddressForNetwork(address, BITCOIN_NETWORKS[networkType])
}

/**
 * Return true if address is a modern p2sh address
 * M-prefix: mainnet
 * Q-prefix: testnet
 */
export function isModernP2shAddress(address: string, networkType: NetworkType) {
  return isP2shAddressForNetwork(address, NETWORKS[networkType])
}

/**
 * defined format: return true if address is valid in provided format
 * undefined format: return true if address is valid in *any* format
 */
export function isValidAddress(
  address: string,
  networkType: NetworkType,
  format?: LitecoinAddressFormat, // undefined -> any
): boolean {
  // Validation for modern addresses is the same as Bitcoin just using different network constants
  const isModern = bitcoinish.isValidAddress(address, NETWORKS[networkType])

  if (format === LitecoinAddressFormat.Modern) {
    return isModern
  } else if (format === LitecoinAddressFormat.Deprecated) {
    return (isModern || isDeprecatedP2shAddress(address, networkType)) && !isModernP2shAddress(address, networkType)
  } else {
    return isModern || isDeprecatedP2shAddress(address, networkType)
  }
}

export function standardizeAddress(
  address: string,
  networkType: NetworkType,
  format: LitecoinAddressFormat,
): string | null {
  if (isValidAddress(address, networkType, format)) {
    return address
  }

  const fromFormat =
    format === LitecoinAddressFormat.Modern ? LitecoinAddressFormat.Deprecated : LitecoinAddressFormat.Modern
  try {
    // Convert between p2sh legacy `3` prefix and modern `M` prefix
    const decoded = bitcoin.address.fromBase58Check(address)
    const fromNetwork = ADDRESS_FORMAT_NETWORKS[fromFormat][networkType]
    const toNetwork = ADDRESS_FORMAT_NETWORKS[format][networkType]
    if (decoded.version === fromNetwork.scriptHash) {
      return bitcoin.address.toBase58Check(decoded.hash, toNetwork.scriptHash)
    }
    return null
  } catch (e) {
    return null
  }
}

export function isValidPublicKey(publicKey: string | Buffer, networkType: NetworkType): boolean {
  return bitcoinish.isValidPublicKey(publicKey, NETWORKS[networkType])
}

export function isValidPrivateKey(privateKey: string, networkType: NetworkType): boolean {
  return bitcoinish.isValidPrivateKey(privateKey, NETWORKS[networkType])
}

export function estimateLitecoinTxSize(
  inputCounts: { [k: string]: number },
  outputCounts: { [k: string]: number },
  networkType: NetworkType,
) {
  console.log('estimateLitecoinTxSize', inputCounts, outputCounts, networkType)
  return bitcoinish.estimateTxSize(inputCounts, outputCounts, (address: string) =>
    bitcoin.address.toOutputScript(
      // Modern format needed so address matches the bitcoinjs network
      standardizeAddress(address, networkType, LitecoinAddressFormat.Modern) || '',
      NETWORKS[networkType],
    ),
  )
}

export function publicKeyToAddress(
  publicKey: string | Buffer,
  networkType: NetworkType,
  addressType: SinglesigAddressType,
  format: LitecoinAddressFormat,
) {
  const address = bitcoinish.publicKeyToAddress(publicKey, NETWORKS[networkType], addressType)
  const standardAddress = standardizeAddress(address, networkType, format)
  if (!standardAddress) {
    throw new Error('Failed to standardize derived LTC address')
  }
  return standardAddress
}

export function privateKeyToAddress(
  privateKey: string,
  networkType: NetworkType,
  addressType: SinglesigAddressType,
  format: LitecoinAddressFormat,
) {
  const keyPair = privateKeyToKeyPair(privateKey, NETWORKS[networkType])
  return publicKeyToAddress(keyPair.publicKey, networkType, addressType, format)
}

export function isSupportedAddressType(addressType: string): boolean {
  return LITECOIN_SUPPORTED_ADDRESS_TYPES.map(at => at.toString()).includes(addressType)
}

export function getSupportedAddressTypes(): AddressType[] {
  return LITECOIN_SUPPORTED_ADDRESS_TYPES
}

export function hexSeedToBuffer(seedHex: string): Buffer {
  const seedBuffer = Buffer.from(seedHex, 'hex')
  return seedBuffer
}

