declare module 'ethereum-hd-wallet' {
  export default class EthereumHDWallet {
    /**
     * Instance from a seed
     * @param {(string|Buffer)} binary seed
     * @throws {TypeError} Invalid seed
     */
    static fromSeed(seed: string | Buffer): EthereumHDWallet

    /**
     * New instance from seed hex string
     * @param {string} seedHex Hex string
     */
    constructor(seedHex: string)

    /**
     * Derive key given a full BIP44 path
     * @param {string} path BIP44 path string (eg. m/44'/148'/8')
     * @return {Buffer} Key binary as Buffer
     */
    derive(path: string): Buffer

    /**
     * Get Ethereum account keypair for child key at given index
     * @param {Number} index Account index into path m/44'/148'/{index}
     * @return {Object} Keypair instance for the account
     */
    getKeypair(index: number): Keypair

    /**
     * Get public key for account at index
     * @param {Number} index Account index into path m/44'/148'/{index}
     * @return {string} Public key
     */
    getPublicKey(index: number): string

    /**
     * Get secret for account at index
     * @param {Number} index Account index into path m/44'/148'/{index}
     * @return {string} Secret
     */
    getSecret(index: number): string
  }
}
