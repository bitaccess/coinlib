import { MultisigBitcoinPayments, HdBitcoinPayments } from '../src'
import { logger } from './utils'
import { NetworkType } from '@faast/payments-common'
import path from 'path'
import fs from 'fs'
import { AddressType, MultisigAddressType, BitcoinMultisigData } from '../src/types';
import KeyPairBitcoinPayments from '../src/KeyPairBitcoinPayments'
import singlesigFixtures from './fixtures/singlesigTestnet'
import { TransactionStatus } from '../../payments-common/src/types';

const SECRET_KEYS_FILE = 'test/keys/testnet.multisig.key'

const rootDir = path.resolve(__dirname, '..')
const secretKeysFilePath = path.resolve(rootDir, SECRET_KEYS_FILE)
let secretKeys: string[] = []
if (fs.existsSync(secretKeysFilePath)) {
  secretKeys = fs
    .readFileSync(secretKeysFilePath)
    .toString('utf8')
    .trim()
    .split('\n')
    .map((k) => k.trim())
  logger.log(`Loaded ${SECRET_KEYS_FILE}. Multisig send and sweep tests enabled.`)
  logger.debug('multisig secretKeys', secretKeys)
} else {
  logger.log(
    `File ${SECRET_KEYS_FILE} missing. Multisig send and sweep e2e testnet tests will be skipped. To enable them ask Dylan to share the keys file with you.`,
  )
}

const keyPairSigners = [
  {
    private: secretKeys[0],
    public: '03f17de9004239bde1e3de1c0df4257a5980e0420c16ce331ec8b7af2bb1e6033e',
  },
  {
    private: secretKeys[1],
    public: '0355c2914341e40247f2fb414d6780eda19d196cc3af982a953456929d5063c1ce',
  }
]

// private is root, public derived to path
const derivationPath = "m/44'/1'/0'"
const hdSigners = [
  {
    private: secretKeys[2],
    public: 'tpubDDhbeKTD26qn1rSKVJwskPYPfXADmF5ByxdXKiD9PZfZwcuopfTix637Y41VKoSKFzepSEo8N1bFMxmN1cDeZScVsRq9LwaeUuFHGLQB4qv',
  },
  {
    private: secretKeys[3],
    public: 'tpubDDUT4ANr119kxYqHxZmhMibA7ZMvAmtWS9nu9YPKHuXkMWADUDhSZbDqbsShqbnRwNSy8DYChbFtoCwVF6JeH2gSqtEdV4VEz53vE5gh5mN',
  }
]

const addresses = {
  [AddressType.MultisigLegacy]: '2MyDfXtRKRkmBgSsbkJn6U5z8hAw3RfBcR1',
  [AddressType.MultisigSegwitP2SH]: '2NDLJLHWjxWyEm292WcapZW3ci6J2D4vwiw',
  [AddressType.MultisigSegwitNative]: 'tb1q7ynjlttcuk7ce2y8wpumaqtu7ptjmcdvzgvgyvwh6ta5prlunl0suul9gs',
}

// Commend out elements to disable tests for an address type
const addressTypesToTest: MultisigAddressType[] = [
  AddressType.MultisigLegacy,
  AddressType.MultisigSegwitP2SH,
  AddressType.MultisigSegwitNative,
]

const ACCOUNT_IDS = [keyPairSigners[0].public, hdSigners[0].public, keyPairSigners[1].public, hdSigners[1].public]

const m = 2

// Send all our test funds to another address we control
const EXTERNAL_ADDRESS = singlesigFixtures[AddressType.SegwitNative].addresses[0];

(!secretKeys ? describe.skip : describe)('e2e multisig testnet', () => {
  // The signing parties for our multisig test.
  // NOTE: the signer address type is irrelevant because only the keypair of each signer is used,
  // which doesn't change across address types. However address type can influence the default
  // derivation path if not explicitly configured so it shouldn't be altered.
  const signerPayments = [
    new KeyPairBitcoinPayments({
      logger,
      network: NetworkType.Testnet,
      keyPairs: [keyPairSigners[0].private],
    }),
    new HdBitcoinPayments({
      logger,
      network: NetworkType.Testnet,
      hdKey: hdSigners[0].private,
      derivationPath,
    }),
    new KeyPairBitcoinPayments({
      logger,
      network: NetworkType.Testnet,
      keyPairs: [keyPairSigners[1].private],
    }),
    new HdBitcoinPayments({
      logger,
      network: NetworkType.Testnet,
      hdKey: hdSigners[1].private,
      derivationPath,
    }),
  ]

  for (let addressType of addressTypesToTest) {
    const address0 = addresses[addressType]

    describe(addressType, () => {
      // Configure a multisig with a mix of public and private keys to make
      // sure transactions can be created with either. Won't actually be signing
      // using this payments instance, each signer will be doing that and then
      // the tx combined
      const payments = new MultisigBitcoinPayments({
        logger,
        network: NetworkType.Testnet,
        addressType: addressType,
        targetUtxoPoolSize: 5,
        minChange: '0.01',
        m,
        signers: [
          signerPayments[0].getPublicConfig(),
          signerPayments[1].getPublicConfig(),
          signerPayments[2].getFullConfig(),
          signerPayments[3].getFullConfig(),
        ],
      })

      it('getAccountIds returns all', () => {
        const accountIds = payments.getAccountIds()
        expect(accountIds).toEqual(ACCOUNT_IDS)
      })

      it('getAccountIds(0) returns all', () => {
        const accountIds = payments.getAccountIds(0)
        expect(accountIds).toEqual(ACCOUNT_IDS)
      })

      it('getAccountId throws', () => {
        expect(() => payments.getAccountId(0)).toThrow()
      })

      it('getPublicConfig returns correct config', () => {
        expect(payments.getPublicConfig()).toEqual({
          network: NetworkType.Testnet,
          addressType: addressType,
          m: 2,
          signers: signerPayments.map((p) => p.getPublicConfig()),
        })
      })

      it('can create address', async () => {
        const address = payments.getAddress(0)
        expect(address).toBe(address0)
      })

      it('can create sweep', async () => {
        const tx = await payments.createSweepTransaction(0, EXTERNAL_ADDRESS)
        expect(tx.multisigData).toBeDefined()
      }, 30 * 1000)

      function assertMultisigData(
        multisigData: BitcoinMultisigData | undefined,
        fromIndex: number,
        expectedSignatures: number[],
      ) {
        expect(multisigData).toBeDefined()
        expect(multisigData!.m).toBe(m)
        expect(multisigData!.signers.length).toBe(signerPayments.length)
        for (let i = 0; i < signerPayments.length; i++) {
          const signerPayment = signerPayments[i]
          const signerData = multisigData!.signers[i]
          expect(signerData.index).toBe(fromIndex)
          expect(signerData.accountId).toBe(signerPayment.getAccountId(fromIndex))
          expect(signerData.publicKey).toBe(signerPayment.getKeyPair(fromIndex).publicKey.toString('hex'))
          expect(signerData.signed).toBe(expectedSignatures.includes(i) ? true : undefined)
        }
      }

      it('end to end send', async () => {
        const fromIndex = 0
        const unsignedTx = await payments.createTransaction(fromIndex, EXTERNAL_ADDRESS, '0.0001')
        assertMultisigData(unsignedTx.multisigData, fromIndex, [])
        const partiallySignedTxs = await Promise.all(signerPayments.map((signer) => signer.signTransaction(unsignedTx)))
        for (let i = 0; i < partiallySignedTxs.length; i++) {
          const partiallySignedTx = partiallySignedTxs[i]
          expect(partiallySignedTx.data.partial).toBe(true)
          expect(partiallySignedTx.data.hex).toMatch(/^[a-f0-9]+$/)
          expect(partiallySignedTx.data.unsignedTxHash).toBe(unsignedTx.data.rawHash)
          assertMultisigData(partiallySignedTx.multisigData, fromIndex, [i])
        }
        const signedTx = await payments.combinePartiallySignedTransactions(partiallySignedTxs)
        expect(signedTx.status).toBe(TransactionStatus.Signed)
        assertMultisigData(signedTx.multisigData, fromIndex, [0,1])
        expect(signedTx.data.partial).toBe(false)
        expect(signedTx.data.hex).toMatch(/^[a-f0-9]+$/)
        expect(signedTx.data.unsignedTxHash).toBe(unsignedTx.data.rawHash)
        logger.log(`Sending ${signedTx.amount} to ${EXTERNAL_ADDRESS} in tx ${signedTx.id}`)
        expect(await payments.broadcastTransaction(signedTx)).toEqual({
          id: signedTx.id,
        })
        // const tx = await pollUntilEnded(signedTx)
        const tx = await payments.getTransactionInfo(signedTx.id)
        expect(tx.amount).toEqual(signedTx.amount)
        expect(tx.fee).toEqual(signedTx.fee)
      }, 5 * 60 * 1000)
    })
  }
})
