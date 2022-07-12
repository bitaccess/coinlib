import {
  BaseMultisigData,
  createUnitConverters,
  MultisigData,
  NetworkType,
  BitcoinishAddressType,
  bip32,
} from '@bitaccess/coinlib-common'
import * as bitcoin from 'bitcoinjs-lib-bigint'
import {
  DECIMAL_PLACES,
  NETWORKS,
  BITCOIN_COINTYPE_MAINNET,
  BITCOIN_COINTYPE_TESTNET,
  NETWORK_MAINNET,
  NETWORK_TESTNET,
} from './constants'
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
  return bitcoinish.estimateTxSize(inputCounts, outputCounts, (address: string) =>
    bitcoin.address.toOutputScript(address, NETWORKS[networkType]),
  )
}

export function determinePathForIndex(
  accountIndex: number,
  addressType?: BitcoinishAddressType,
  networkType?: NetworkType,
): string {
  let purpose: string = '84'
  if (addressType) {
    purpose = bitcoinish.BITCOINISH_ADDRESS_PURPOSE[addressType]
  }

  let cointype = BITCOIN_COINTYPE_MAINNET
  if (networkType === NetworkType.Testnet) {
    cointype = BITCOIN_COINTYPE_TESTNET
  }

  const derivationPath = `m/${purpose}'/${cointype}'/${accountIndex}'`
  return derivationPath
}

export function hexSeedToBuffer(seedHex: string): Buffer {
  const seedBuffer = Buffer.from(seedHex, 'hex')
  return seedBuffer
}

export function deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string {
  const splitPath = derivationPath.split('/')
  if (splitPath?.length !== 4 || splitPath[0] !== 'm') {
    throw new TypeError(`Invalid derivationPath ${derivationPath}`)
  }

  const coinType = splitPath[2]
  let network: BitcoinjsNetwork | null = null
  if (coinType === `${BITCOIN_COINTYPE_MAINNET}'`) {
    network = NETWORK_MAINNET
  } else if (coinType === `${BITCOIN_COINTYPE_TESTNET}'`) {
    network = NETWORK_TESTNET
  } else {
    throw new TypeError(`Invalid derivationPath coin type ${coinType}`)
  }

  const root = bip32.fromSeed(seed, network)
  const account = root.derivePath(derivationPath)
  return account.neutered().toBase58()
}
