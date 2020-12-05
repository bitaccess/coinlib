import { createUnitConverters, NetworkType } from '@faast/payments-common'
import { bitcoinish, BitcoinjsNetwork, publicKeyToBuffer } from '@faast/bitcoin-payments'
import * as bitcoincash from 'bitcoinforksjs-lib'
import bchaddrjs from 'bchaddrjs'
import { assertType } from '@faast/ts-common'

import { BitcoinjsKeyPair, BitcoinCashAddressFormat, BitcoinCashAddressFormatT } from './types'
import { DECIMAL_PLACES, DEFAULT_ADDRESS_FORMAT, NETWORKS } from './constants'

export { publicKeyToString, publicKeyToBuffer, bitcoinish } from '@faast/bitcoin-payments'

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
  if (!bchaddrjs.isValidAddress(address)) {
    return false
  }
  if (networkType === NetworkType.Mainnet && !bchaddrjs.isMainnetAddress(address)) {
    return false
  } else if (networkType === NetworkType.Testnet && !bchaddrjs.isTestnetAddress(address)) {
    return false
  }
  const { format } = options
  try {
    if (format === BitcoinCashAddressFormat.Cash) {
      return bchaddrjs.isCashAddress(address)
    } else if (format === BitcoinCashAddressFormat.BitPay) {
      return bchaddrjs.isBitpayAddress(address)
    } else if (format === BitcoinCashAddressFormat.Legacy) {
      return bchaddrjs.isLegacyAddress(address)
    }
    // undefined format -> any format is acceptable
    return true
  } catch (e) {
    return false
  }
}

export function standardizeAddress(
  address: string,
  networkType: NetworkType,
  options: { format?: string } = {}
): string | null {
  const format = assertType(BitcoinCashAddressFormatT, options?.format ?? DEFAULT_ADDRESS_FORMAT, 'format')
  if (!isValidAddress(address, networkType)) {
    return null
  }
  if (format === BitcoinCashAddressFormat.Cash) {
    return bchaddrjs.toCashAddress(address)
  } else if (format === BitcoinCashAddressFormat.BitPay) {
    return bchaddrjs.toBitpayAddress(address)
  } else if (format === BitcoinCashAddressFormat.Legacy) {
    return bchaddrjs.toLegacyAddress(address)
  }
  return null
}

export function isValidPublicKey(publicKey: string | Buffer, networkType: NetworkType): boolean {
  try {
    bitcoincash.ECPair.fromPublicKey(publicKeyToBuffer(publicKey), { network: NETWORKS[networkType] })
    return true
  } catch (e) {
    return false
  }
}

export function isValidPrivateKey(privateKey: string, networkType: NetworkType): boolean {
  try {
    privateKeyToKeyPair(privateKey, NETWORKS[networkType])
    return true
  } catch (e) {
    return false
  }
}

export function getSinglesigPaymentScript(
  network: BitcoinjsNetwork,
  pubkey: Buffer,
): bitcoincash.payments.Payment {
  const scriptParams = { network, pubkey }
  return bitcoincash.payments.p2pkh(scriptParams)
}

export function publicKeyToAddress(
  publicKey: string | Buffer,
  network: BitcoinjsNetwork,
): string {
  const pubkey = publicKeyToBuffer(publicKey)
  const script = getSinglesigPaymentScript(network, pubkey)
  const { address } = script
  if (!address) {
    throw new Error('bitcoinforksjs-lib address derivation returned falsy value')
  }
  return bchaddrjs.toCashAddress(address)
}

export function publicKeyToKeyPair(publicKey: string | Buffer, network: BitcoinjsNetwork): BitcoinjsKeyPair {
  return bitcoincash.ECPair.fromPublicKey(publicKeyToBuffer(publicKey), { network })
}

export function privateKeyToKeyPair(privateKey: string, network: BitcoinjsNetwork): BitcoinjsKeyPair {
  return bitcoincash.ECPair.fromWIF(privateKey, network)
}

export function privateKeyToAddress(privateKey: string, network: BitcoinjsNetwork) {
  const keyPair = privateKeyToKeyPair(privateKey, network)
  return publicKeyToAddress(keyPair.publicKey, network)
}

export function estimateBitcoinCashTxSize(
  inputCounts: { [k: string]: number },
  outputCounts: { [k: string]: number },
  networkType: NetworkType,
) {
  return bitcoinish.estimateTxSize(
    inputCounts,
    outputCounts,
    (address: string) => bitcoincash.address.toOutputScript(address, NETWORKS[networkType]),
  )
}
