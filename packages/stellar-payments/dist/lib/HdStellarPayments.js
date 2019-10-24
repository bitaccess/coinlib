import { generateMnemonic, deriveSignatory } from './bip44';
import { AccountStellarPayments } from './AccountStellarPayments';
export class HdStellarPayments extends AccountStellarPayments {
    constructor({ seed, ...config }) {
        super({
            ...config,
            hotAccount: deriveSignatory(seed, 0),
            depositAccount: deriveSignatory(seed, 1)
        });
    }
}
HdStellarPayments.generateMnemonic = generateMnemonic;
//# sourceMappingURL=HdStellarPayments.js.map