import { fromBase58 } from 'bip32';
import { publicKeyToAddress } from './helpers';
export function splitDerivationPath(path) {
    let parts = path.split('/');
    if (parts[0] === 'm') {
        return parts.slice(1);
    }
    return parts;
}
export function deriveHDNode(hdKey, derivationPath, network) {
    const rootNode = fromBase58(hdKey, network);
    const parts = splitDerivationPath(derivationPath).slice(rootNode.depth);
    let node = rootNode;
    if (parts.length > 0) {
        node = rootNode.derivePath(parts.join('/'));
    }
    return node;
}
export function deriveKeyPair(baseNode, index, network) {
    return baseNode.derive(0).derive(index);
}
export function deriveAddress(baseNode, index, network, addressType) {
    const keyPair = deriveKeyPair(baseNode, index, network);
    return publicKeyToAddress(keyPair.publicKey, network, addressType);
}
export function derivePrivateKey(baseNode, index, network) {
    const keyPair = deriveKeyPair(baseNode, index, network);
    return keyPair.toWIF();
}
export function xprvToXpub(xprv, derivationPath, network) {
    const node = deriveHDNode(xprv, derivationPath, network);
    return node.neutered().toBase58();
}
//# sourceMappingURL=bip44.js.map