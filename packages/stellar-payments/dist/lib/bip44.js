import StellarHDWallet from 'stellar-hd-wallet';
import * as bip39 from 'bip39';
export function deriveSignatory(seed, index) {
    const wallet = seed.includes(' ') ? StellarHDWallet.fromMnemonic(seed) : StellarHDWallet.fromSeed(seed);
    const keypair = wallet.getKeypair(index);
    const secret = keypair.secret();
    const address = keypair.publicKey();
    return {
        address,
        secret,
    };
}
export function generateMnemonic() {
    return StellarHDWallet.generateMnemonic();
}
export function mnemonicToSeed(mnemonic) {
    return bip39.mnemonicToSeedSync(mnemonic).toString('hex');
}
//# sourceMappingURL=bip44.js.map