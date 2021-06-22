/// <reference types='node'/>
/// <reference types='stellar-base'/>

declare module 'stellar-hd-wallet' {
  import { Keypair } from 'stellar-base'

  export default class StellarHDWallet {
    /**
     * Instance from a BIP39 mnemonic string.
     * @param {string} mnemonic A BIP39 mnemonic
     * @param {string} [password] Optional mnemonic password
     * @param {string} [language='english'] Optional language of mnemonic
     * @throws {Error} Invalid Mnemonic
     */
    static fromMnemonic(mnemonic: string, password?: string, language?: string): StellarHDWallet

    /**
     * Instance from a seed
     * @param {(string|Buffer)} binary seed
     * @throws {TypeError} Invalid seed
     */
    static fromSeed(seed: string | Buffer): StellarHDWallet

    /**
     * Generate a mnemonic using BIP39
     * @param {Object} props Properties defining how to generate the mnemonic
     * @param {Number} [props.entropyBits=256] Entropy bits
     * @param {string} [props.language='english'] name of a language wordlist as
     *          defined in the 'bip39' npm module. See module.exports.wordlists:
     *          here https://github.com/bitcoinjs/bip39/blob/master/index.js
     * @param {function} [props.rng] RNG function (default is crypto.randomBytes)
     * @throws {TypeError} Langauge not supported by bip39 module
     * @throws {TypeError} Invalid entropy
     */
    static generateMnemonic(props?: {
      entropyBits?: number,
      language?: string,
      rngFn?: Function
    }): string

    /**
     * Validate a mnemonic using BIP39
     * @param {string} mnemonic A BIP39 mnemonic
     * @param {string} [language='english'] name of a language wordlist as
     *          defined in the 'bip39' npm module. See module.exports.wordlists:
     *          here https://github.com/bitcoinjs/bip39/blob/master/index.js
     * @throws {TypeError} Langauge not supported by bip39 module
     */
    static validateMnemonic(mnemonic: string, language?: string): boolean

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
     * Get Stellar account keypair for child key at given index
     * @param {Number} index Account index into path m/44'/148'/{index}
     * @return {stellar-base.Keypair} Keypair instance for the account
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
