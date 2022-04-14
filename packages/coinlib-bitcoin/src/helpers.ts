import { BaseMultisigData, createUnitConverters, MultisigData, NetworkType } from '@bitaccess/coinlib-common'
import * as bitcoin from 'bitcoinjs-lib-bigint'
import { DECIMAL_PLACES, NETWORKS } from './constants'
import * as bitcoinish from './bitcoinish'
import { BitcoinjsNetwork } from './types'

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
  return bitcoinish.estimateTxSize(
    inputCounts,
    outputCounts,
    (address: string) => bitcoin.address.toOutputScript(address, NETWORKS[networkType]),
  )
}
