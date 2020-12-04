import { createUnitConverters, NetworkType } from '@faast/payments-common'
import * as bitcoin from 'bitcoinjs-lib'
import { assertType, isString } from '@faast/ts-common'

import { AddressType, LitecoinjsKeyPair, SinglesigAddressType, LitecoinAddressFormat, LitecoinAddressFormatT } from './types'
import {
  bitcoinish,
  BitcoinjsNetwork,
  isValidAddress as isValidBitcoinAddress,
  NETWORKS as BITCOIN_NETWORKS,
} from '@faast/bitcoin-payments'
import { DECIMAL_PLACES, DEFAULT_ADDRESS_FORMAT, NETWORKS } from './constants'

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

export function isValidAddress(
  address: string,
  networkType: NetworkType,
  options: { format?: string } = {},
): boolean {
  const { format } = options

  if (format === LitecoinAddressFormat.Legacy && address.startsWith('3')) {
    // Litecoin legacy p2sh addresses are valid bitcoin addresses
    return isValidBitcoinAddress(address, networkType)
  }
  // Validation for modern addresses is the same as Bitcoin just using different network constants
  return bitcoinish.isValidAddress(address, NETWORKS[networkType])
}

const formatNetworks = {
  [LitecoinAddressFormat.Legacy]: BITCOIN_NETWORKS,
  [LitecoinAddressFormat.Modern]: NETWORKS,
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

  // Litecoin legacy p2sh addresses use bitcoin `3` prefix
  const toFormat = format === LitecoinAddressFormat.Modern
    ? LitecoinAddressFormat.Legacy
    : LitecoinAddressFormat.Modern
  if (!isValidAddress(address, networkType, { format: toFormat })) {
    return null
  }
  try {
    const decoded = bitcoin.address.fromBase58Check(address)
    const fromNetwork = formatNetworks[format][networkType]
    const toNetwork = formatNetworks[toFormat][networkType]
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
