import { createUnitConverters, bip32, NetworkType } from '@bitaccess/coinlib-common'
import { isNil, isString } from '@faast/ts-common'
import * as Stellar from 'stellar-sdk'
import StellarHDWallet from 'stellar-hd-wallet'
import {Keypair} from "stellar-base";



import { DECIMAL_PLACES, STELLAR_COINTYPE_MAINNET, STELLAR_COINTYPE_TESTNET } from './constants'

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

export function isValidAddress(address: unknown): boolean {
  return isString(address) && Stellar.StrKey.isValidEd25519PublicKey(address)
}

export function isValidExtraId(extraId: unknown): boolean {
  return isString(extraId)
}

export function isValidSecret(secret: unknown): boolean {
  return isString(secret) && Stellar.StrKey.isValidEd25519SecretSeed(secret)
}

export function assertValidAddress(address: string): void {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid stellar address: ${address}`)
  }
}

export function assertValidExtraId(extraId: string): void {
  if (!isValidExtraId(extraId)) {
    throw new Error(`Invalid stellar extraId: ${extraId}`)
  }
}

export function assertValidExtraIdOrNil(extraId?: string | undefined | null): void {
  if (!isNil(extraId) && !isValidExtraId(extraId)) {
    throw new Error(`Invalid stellar extraId: ${extraId}`)
  }
}

export function determinePathForIndex(accountIndex: number, addressType?: any, networkType?: NetworkType): string {
  const LEGENCY = 'p2pkh'
  if (addressType && addressType?.toString() !== LEGENCY) {
    throw new TypeError(`Stellar does not support this type ${addressType}`)
  }
  const purpose: string = '44'

  let cointype = STELLAR_COINTYPE_MAINNET
  if (networkType === NetworkType.Testnet) {
    cointype = STELLAR_COINTYPE_TESTNET
  }

  const derivationPath = `m/${purpose}'/${cointype}'/${accountIndex}'`
  return derivationPath
}

export function hexSeedToBuffer(seedHex: string): Buffer {
  const seedBuffer = Buffer.from(seedHex, 'hex')
  return seedBuffer
}

export function deriveKeyPairForAnyPath(wallet: StellarHDWallet, anyPath: string): Keypair {
  const key: Buffer = wallet.derive(anyPath)
  const keypair: Keypair =  Keypair.fromRawEd25519Seed(key)
  return keypair
}

export function removeTrailingSlash(path: string): string {
  return path.replace(/\/+$/, '');
}

export function deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string {
  derivationPath = removeTrailingSlash(derivationPath)

  const splitPath = derivationPath.split('/')
  if (splitPath?.length !== 4 || splitPath[0] !== 'm') {
    throw new TypeError(`Invalid derivationPath ${derivationPath}`)
  }

  const purpose = splitPath[1]
  if (purpose !== `44'`) {
    throw new TypeError(`Purpose in derivationPath ${purpose} not supported by Stellar`)
  }

  const hotAccountPath: string = `${derivationPath}/0'`
  const depositAccountPath: string = `${derivationPath}/1'`

  const wallet: StellarHDWallet = StellarHDWallet.fromSeed(seed)
  const hotAccountPubKey: string =  deriveKeyPairForAnyPath(wallet, hotAccountPath).publicKey()
  const depositAccountPubKey: string =  deriveKeyPairForAnyPath(wallet, depositAccountPath).publicKey()

  return `${hotAccountPubKey}:${depositAccountPubKey}`
}
