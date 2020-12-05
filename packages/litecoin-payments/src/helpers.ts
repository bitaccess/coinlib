import { createUnitConverters, NetworkType } from '@faast/payments-common'
import * as bitcoin from 'bitcoinjs-lib'
import { assertType } from '@faast/ts-common'

import { LitecoinAddressFormat, LitecoinAddressFormatT } from './types'
import {
  bitcoinish,
  NETWORKS as BITCOIN_NETWORKS,
  BitcoinjsNetwork,
} from '@faast/bitcoin-payments'
import { DECIMAL_PLACES, DEFAULT_ADDRESS_FORMAT, NETWORKS } from './constants'

const {
  getMultisigPaymentScript,
  getSinglesigPaymentScript,
  publicKeyToAddress,
  publicKeyToKeyPair,
  publicKeyToString,
  publicKeyToBuffer,
  privateKeyToKeyPair,
  privateKeyToAddress,
} = bitcoinish

export {
  getMultisigPaymentScript,
  getSinglesigPaymentScript,
  publicKeyToAddress,
  publicKeyToKeyPair,
  publicKeyToString,
  publicKeyToBuffer,
  privateKeyToKeyPair,
  privateKeyToAddress,
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
  options: { format?: string } = {},
): boolean {
  const { format } = options

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
  options?: { format?: string },
): string | null {
  const format = assertType(LitecoinAddressFormatT, options?.format ?? DEFAULT_ADDRESS_FORMAT, 'format')
  if (isValidAddress(address, networkType, { format })) {
    return address
  }

  const fromFormat = format === LitecoinAddressFormat.Modern
    ? LitecoinAddressFormat.Deprecated
    : LitecoinAddressFormat.Modern
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
  return bitcoinish.estimateTxSize(
    inputCounts,
    outputCounts,
    (address: string) => bitcoin.address.toOutputScript(
      standardizeAddress(address, networkType, { format: LitecoinAddressFormat.Modern }) || '',
      NETWORKS[networkType],
    ),
  )
}
