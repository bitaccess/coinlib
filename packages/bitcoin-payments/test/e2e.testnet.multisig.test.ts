import {
  MultisigBitcoinPayments,
  HdBitcoinPayments,
  AddressType,
  MultisigAddressType,
  MultisigBitcoinPaymentsConfig,
  KeyPairBitcoinPayments,
} from '../src'
import { logger } from './utils'
import { NetworkType, TransactionStatus, BaseMultisigData } from '@faast/payments-common'
import path from 'path'
import fs from 'fs'
import { DERIVATION_PATH, ADDRESSES, M, ACCOUNT_IDS, EXTERNAL_ADDRESS } from './fixtures/multisigTestnet'

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

// Commend out elements to disable tests for an address type
const addressTypesToTest: MultisigAddressType[] = [
  AddressType.MultisigLegacy,
  AddressType.MultisigSegwitP2SH,
  AddressType.MultisigSegwitNative,
]

const describeAll = !secretKeys ? describe.skip : describe

describeAll('e2e multisig testnet', () => {
  // The signing parties for our multisig test.
  // NOTE: the signer address type is irrelevant because only the keypair of each signer is used,
  // which doesn't change across address types. However address type can influence the default
  // derivation path if not explicitly configured so it shouldn't be altered.
  const signerPayments = [
    new KeyPairBitcoinPayments({
      logger,
      network: NetworkType.Testnet,
      keyPairs: [secretKeys[0]],
    }),
    new HdBitcoinPayments({
      logger,
      network: NetworkType.Testnet,
      hdKey: secretKeys[1],
      derivationPath: DERIVATION_PATH,
    }),
    new KeyPairBitcoinPayments({
      logger,
      network: NetworkType.Testnet,
      keyPairs: [secretKeys[2]],
    }),
    new HdBitcoinPayments({
      logger,
      network: NetworkType.Testnet,
      hdKey: secretKeys[3],
      derivationPath: DERIVATION_PATH,
    }),
  ]

  for (let addressType of addressTypesToTest) {
    const address0 = ADDRESSES[addressType]

    describe(addressType, () => {
      // Configure a multisig setup with a mix of public and private keys to make
      // sure transactions can be created with either. Won't actually be signing
      // using this multisig payments instance, each signer will be doing that using
      // their respective singlesig instance and then the partially signed txs combined
      // using the multisig instance

      const commonConfig = {
        m: M,
        network: NetworkType.Testnet,
        targetUtxoPoolSize: 5,
        minChange: '0.01',
      }
      const paymentsConfig: MultisigBitcoinPaymentsConfig = {
        ...commonConfig,
        addressType: addressType,
        logger,
        signers: [
          signerPayments[0].getPublicConfig(),
          signerPayments[1].getPublicConfig(),
          signerPayments[2].getFullConfig(),
          signerPayments[3].getFullConfig(),
        ],
      }
      const payments = new MultisigBitcoinPayments(paymentsConfig)

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
          ...commonConfig,
          addressType: addressType,
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
        multisigData: BaseMultisigData | undefined,
        fromIndex: number,
        expectedSignatures: number[],
      ) {
        expect(multisigData).toBeDefined()
        expect(multisigData!.m).toBe(M)
        expect(multisigData!.accountIds.length).toBe(signerPayments.length)
        expect(multisigData!.signedAccountIds).toEqual(expectedSignatures.map((i) => multisigData!.accountIds[i]))
        for (let i = 0; i < signerPayments.length; i++) {
          const signerPayment = signerPayments[i]
          const accountId = multisigData!.accountIds[i]
          const publicKey = multisigData!.publicKeys[i]
          expect(accountId).toBe(signerPayment.getAccountId(fromIndex))
          expect(publicKey).toBe(signerPayment.getKeyPair(fromIndex).publicKey.toString('hex'))
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
