/*
 *  This files includes all shared dependencies across packages
 *  Centrolized dependencies can guarante the version consistency
 */
import BigNumber from 'bignumber.js'
import { BIP32Interface as HDNode, BIP32Factory } from 'bip32'
import * as ecc from 'tiny-secp256k1';

export { BigNumber }
const bip32 = BIP32Factory(ecc);
export { bip32, HDNode }