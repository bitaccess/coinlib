/*
 *  This files includes all shared dependencies across packages
 *  Centralized dependencies can guarante the version consistency
 */
import { BIP32Interface as HDNode, BIP32Factory, BIP32API } from 'bip32'
import { ECPairFactory, ECPairAPI } from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import { BigNumber } from '@bitaccess/ts-common'
import bs58 from 'bs58check'
import * as bip39 from 'bip39'

export { BigNumber }
const bip32: BIP32API = BIP32Factory(ecc)
const ecpair: ECPairAPI = ECPairFactory(ecc)
export { bip32, HDNode, ecpair, ecc, bs58, bs58 as bs58check, bip39 }
