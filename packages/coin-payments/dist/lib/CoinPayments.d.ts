import { Logger } from '@faast/ts-common';
import { PaymentsFactory, AnyPayments, NetworkType } from '@faast/payments-common';
import { CoinPaymentsConfig, SupportedCoinPaymentsSymbol, CoinPaymentsAssetConfigs } from './types';
export declare class CoinPayments {
    readonly config: CoinPaymentsConfig;
    readonly payments: {
        [A in SupportedCoinPaymentsSymbol]?: AnyPayments;
    };
    readonly accountIds: string[];
    readonly network: NetworkType;
    readonly logger: Logger;
    constructor(config: CoinPaymentsConfig);
    static getFactory(assetSymbol: SupportedCoinPaymentsSymbol): PaymentsFactory;
    static getPayments<A extends SupportedCoinPaymentsSymbol>(assetSymbol: A, config: CoinPaymentsAssetConfigs[A]): AnyPayments;
    getPublicConfig(): CoinPaymentsConfig;
    getAccountIds(): string[];
    forAsset(assetSymbol: SupportedCoinPaymentsSymbol): AnyPayments;
    isAssetSupported(assetSymbol: string): assetSymbol is SupportedCoinPaymentsSymbol;
    isAssetConfigured(assetSymbol: SupportedCoinPaymentsSymbol): boolean;
}
export default CoinPayments;
