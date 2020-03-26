import { createUnitConverters } from '@faast/payments-common'
import * as bitcoin from 'bitcoinjs-lib'
import * as bip32 from 'bip32'
import { BitcoinjsNetwork, AddressType, KeyPair } from './types';
import { DECIMAL_PLACES } from './constants'
import { isString } from '@faast/ts-common';

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

export function isValidXprv(xprv: string, network: BitcoinjsNetwork): boolean {
  try {
    return !bip32.fromBase58(xprv, network).isNeutered()
  } catch(e) {
    return false
  }
}

export function isValidXpub(xpub: string, network: BitcoinjsNetwork): boolean {
  try {
    return bip32.fromBase58(xpub, network).isNeutered()
  } catch(e) {
    return false
  }
}

/** Return string error if invalid, undefined otherwise */
export function validateHdKey(hdKey: string, network: BitcoinjsNetwork): string | undefined {
  try {
    bip32.fromBase58(hdKey, network)
  } catch(e) {
    return e.toString()
  }
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

export function publicKeyToAddress(
  publicKey: string | Buffer,
  network: BitcoinjsNetwork,
  addressType: AddressType,
): string {
  const pubkey = publicKeyToBuffer(publicKey)
  let script: bitcoin.payments.Payment
  if (addressType === AddressType.Legacy) {
    script = bitcoin.payments.p2pkh({ network, pubkey })
  } else { // type is segwit
    script = bitcoin.payments.p2wpkh({ network, pubkey })

    if (addressType === AddressType.SegwitP2SH) {
      script = bitcoin.payments.p2sh({
        network,
        redeem: script
      })
    }
  }
  const { address } = script
  if (!address) {
    throw new Error('bitcoinjs-lib address derivation returned falsy value')
  }
  return address
}

export function publicKeyToKeyPair(publicKey: string | Buffer, network: BitcoinjsNetwork): KeyPair {
  return bitcoin.ECPair.fromPublicKey(publicKeyToBuffer(publicKey), { network })
}

export function privateKeyToKeyPair(privateKey: string, network: BitcoinjsNetwork): KeyPair {
  return bitcoin.ECPair.fromWIF(privateKey, network)
}

export function privateKeyToAddress(privateKey: string, network: BitcoinjsNetwork, addressType: AddressType) {
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
