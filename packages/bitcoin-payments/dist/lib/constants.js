import { FeeLevel, NetworkType } from '@faast/payments-common';
import { networks } from 'bitcoinjs-lib';
import { AddressType } from './types';
export const PACKAGE_NAME = 'bitcoin-payments';
export const DECIMAL_PLACES = 8;
export const COIN_SYMBOL = 'BTC';
export const COIN_NAME = 'Bitcoin';
export const DEFAULT_DUST_THRESHOLD = 546;
export const DEFAULT_NETWORK_MIN_RELAY_FEE = 1000;
export const BITCOIN_SEQUENCE_RBF = 0xFFFFFFFD;
export const DEFAULT_MIN_TX_FEE = 5;
export const DEFAULT_ADDRESS_TYPE = AddressType.SegwitNative;
export const DEFAULT_DERIVATION_PATHS = {
    [AddressType.Legacy]: "m/44'/0'/0'",
    [AddressType.SegwitP2SH]: "m/49'/0'/0'",
    [AddressType.SegwitNative]: "m/84'/0'/0'",
};
export const DEFAULT_NETWORK = NetworkType.Mainnet;
export const NETWORK_MAINNET = networks.bitcoin;
export const NETWORK_TESTNET = networks.testnet;
export const DEFAULT_MAINNET_SERVER = process.env.BITCOIN_SERVER_URL
    ? process.env.BITCOIN_SERVER_URL.split(',')
    : ['https://btc1.trezor.io', 'https://btc2.trezor.io'];
export const DEFAULT_TESTNET_SERVER = process.env.BITCOIN_TESTNET_SERVER_URL
    ? process.env.BITCOIN_TESTNET_SERVER_URL.split(',')
    : ['https://tbtc1.trezor.io', 'https://tbtc2.trezor.io'];
export const DEFAULT_FEE_LEVEL = FeeLevel.Medium;
export const DEFAULT_SAT_PER_BYTE_LEVELS = {
    [FeeLevel.High]: 50,
    [FeeLevel.Medium]: 25,
    [FeeLevel.Low]: 10,
};
//# sourceMappingURL=constants.js.map