import { TronPaymentsFactory } from '@faast/tron-payments';
import { RipplePaymentsFactory } from '@faast/ripple-payments';
import { StellarPaymentsFactory } from '@faast/stellar-payments';
import { BitcoinPaymentsFactory } from '@faast/bitcoin-payments';
import { EthereumPaymentsFactory } from '@faast/ethereum-payments';
import { keysOf } from './utils';
export const PAYMENTS_FACTORIES = {
    TRX: new TronPaymentsFactory(),
    XRP: new RipplePaymentsFactory(),
    XLM: new StellarPaymentsFactory(),
    BTC: new BitcoinPaymentsFactory(),
    ETH: new EthereumPaymentsFactory(),
};
export const SUPPORTED_ASSET_SYMBOLS = keysOf(PAYMENTS_FACTORIES);
//# sourceMappingURL=constants.js.map