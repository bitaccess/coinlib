import { TronPaymentsFactory } from '@faast/tron-payments';
import { RipplePaymentsFactory } from '@faast/ripple-payments';
import { StellarPaymentsFactory } from '@faast/stellar-payments';
import { keysOf } from './utils';
export const PAYMENTS_FACTORIES = {
    TRX: new TronPaymentsFactory(),
    XRP: new RipplePaymentsFactory(),
    XLM: new StellarPaymentsFactory(),
};
export const SUPPORTED_ASSET_SYMBOLS = keysOf(PAYMENTS_FACTORIES);
//# sourceMappingURL=constants.js.map