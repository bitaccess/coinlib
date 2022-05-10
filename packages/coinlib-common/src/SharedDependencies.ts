/*
 *  This files includes all shared dependencies across packages
 *  Centrolized dependencies can guarante the version consistency
 */
import BigNumber from 'bignumber.js'
import { BIP32Interface as HDNode, BIP32Factory, BIP32API } from 'bip32'
import { ECPairFactory, ECPairAPI } from 'ecpair'
import * as ecc from 'tiny-secp256k1';

export { BigNumber }
const bip32: BIP32API = BIP32Factory(ecc);
const ecpair: ECPairAPI = ECPairFactory(ecc);
export { bip32, HDNode, ecpair, ecc }