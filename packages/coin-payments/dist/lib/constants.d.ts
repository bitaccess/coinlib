import { PaymentsFactory } from '@faast/payments-common';
import { SupportedCoinPaymentsSymbol } from './types';
export declare const PAYMENTS_FACTORIES: {
    [A in SupportedCoinPaymentsSymbol]: PaymentsFactory;
};
export declare const SUPPORTED_ASSET_SYMBOLS: ("TRX" | "XRP" | "XLM" | "BTC" | "ETH")[];
