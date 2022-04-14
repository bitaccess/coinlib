import { AddressType, BitcoinjsKeyPair, BitcoinjsNetwork, MultisigAddressType, SinglesigAddressType } from './types'
import * as bitcoin from 'bitcoinjs-lib-bigint'
import { isString } from '@faast/ts-common'

export function isValidAddress(address: string, network: BitcoinjsNetwork): boolean {
  try {
    bitcoin.address.toOutputScript(address, network)
    return true
  } catch (e) {
    return false
  }
}

export function standardizeAddress(address: string, network: BitcoinjsNetwork): string | null {
  if (!isValidAddress(address, network)) {
    return null
  }
  // Uppercase bech32 addresses are valid but lowercase is standard
  const lowercase = address.toLowerCase()
  if (lowercase.startsWith(network.bech32) && isValidAddress(lowercase, network)) {
    return lowercase
  }
  return address
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

export function isValidPrivateKey(privateKey: string, network: BitcoinjsNetwork): boolean {
  try {
    privateKeyToKeyPair(privateKey, network)
    return true
  } catch (e) {
    return false
  }
}

export function publicKeyToBuffer(publicKey: string | Buffer): Buffer {
  return isString(publicKey) ? Buffer.from(publicKey, 'hex') : publicKey
}

export function publicKeyToString(publicKey: string | Buffer): string {
  return isString(publicKey) ? publicKey : publicKey.toString('hex')
}

export function getMultisigPaymentScript(
  network: BitcoinjsNetwork,
  addressType: MultisigAddressType,
  pubkeys: Buffer[],
  m: number,
): bitcoin.payments.Payment {
  const scriptParams = {
    network,
    redeem: bitcoin.payments.p2ms({
      pubkeys: pubkeys.sort(),
      m,
      network,
    })
  }
  switch(addressType) {
    case AddressType.MultisigLegacy:
      return bitcoin.payments.p2sh(scriptParams)
    case AddressType.MultisigSegwitNative:
      return bitcoin.payments.p2wsh(scriptParams)
    case AddressType.MultisigSegwitP2SH:
      return bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wsh(scriptParams),
        network,
      })
  }
}

export function getSinglesigPaymentScript(
  network: BitcoinjsNetwork,
  addressType: SinglesigAddressType,
  pubkey: Buffer,
): bitcoin.payments.Payment {
  const scriptParams = { network, pubkey }
  switch(addressType) {
    case AddressType.Legacy:
      return bitcoin.payments.p2pkh(scriptParams)
    case AddressType.SegwitNative:
      return bitcoin.payments.p2wpkh(scriptParams)
    case AddressType.SegwitP2SH:
      return bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh(scriptParams),
        network,
      })
  }
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
    throw new Error('bitcoinjs-lib-bigint address derivation returned falsy value')
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
