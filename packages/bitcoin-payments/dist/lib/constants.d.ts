import { FeeLevel, NetworkType } from '@faast/payments-common';
import { networks } from 'bitcoinjs-lib';
import { AddressType } from './types';
export declare const PACKAGE_NAME = "bitcoin-payments";
export declare const DECIMAL_PLACES = 8;
export declare const COIN_SYMBOL = "BTC";
export declare const COIN_NAME = "Bitcoin";
export declare const DEFAULT_DUST_THRESHOLD = 546;
export declare const DEFAULT_NETWORK_MIN_RELAY_FEE = 1000;
export declare const DEFAULT_MIN_TX_FEE = 5;
export declare const DEFAULT_ADDRESS_TYPE: AddressType;
export declare const DEFAULT_DERIVATION_PATHS: {
    [AddressType.Legacy]: string;
    [AddressType.SegwitP2SH]: string;
    [AddressType.SegwitNative]: string;
};
export declare const DEFAULT_NETWORK = NetworkType.Mainnet;
export declare const NETWORK_MAINNET: networks.Network;
export declare const NETWORK_TESTNET: networks.Network;
export declare const DEFAULT_MAINNET_SERVER: string[];
export declare const DEFAULT_TESTNET_SERVER: string[];
export declare const DEFAULT_FEE_LEVEL = FeeLevel.Medium;
export declare const DEFAULT_SAT_PER_BYTE_LEVELS: {
    [FeeLevel.High]: number;
    [FeeLevel.Medium]: number;
    [FeeLevel.Low]: number;
};
