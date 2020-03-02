import { FeeLevel } from '@faast/payments-common';
export declare const PACKAGE_NAME = "ethereum-payments";
export declare const DECIMAL_PLACES = 18;
export declare const DEFAULT_FULL_NODE: string | undefined;
export declare const DEFAULT_SOLIDITY_NODE: string | undefined;
export declare const DEFAULT_EVENT_SERVER: string | undefined;
export declare const DEFAULT_FEE_LEVEL = FeeLevel.Medium;
export declare const FEE_LEVEL_MAP: {
    [key: string]: string;
};
export declare const MIN_CONFIRMATIONS = 0;
export declare const ETHEREUM_TRANSFER_COST = "21000";
export declare const DEFAULT_GAS_PRICE_IN_WEI = "50000000000";
export declare const GAS_STATION_URL = "https://ethgasstation.info";
export declare const CONTRACT_DEPLOY_COST = "285839";
export declare const TOKEN_SWEEP_COST = "816630";
export declare const TOKEN_TRANSFER_COST = "250000";
export declare const SPEED: {
    [key: string]: string;
};
export declare const PRICES: {
    [key: string]: string;
};
