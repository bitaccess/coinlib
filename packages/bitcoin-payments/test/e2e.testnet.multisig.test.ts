import {
  MultisigBitcoinPayments,
  HdBitcoinPayments,
  AddressType,
  MultisigAddressType,
  MultisigBitcoinPaymentsConfig,
  KeyPairBitcoinPayments,
  BitcoinTransactionInfo,
  BitcoinSignedTransaction,
  publicKeyToString,
  SinglesigBitcoinPayments,
  NETWORK_TESTNET,
} from '../src'
import { delay, END_TRANSACTION_STATES, expectEqualWhenTruthy, logger } from './utils'
import { NetworkType, TransactionStatus, FeeRateType, MultiInputMultisigData } from '@faast/payments-common'
import path from 'path'
import fs from 'fs'
import { DERIVATION_PATH, ADDRESSES, M, EXTERNAL_ADDRESS } from './fixtures/multisigTestnet'
import { deriveHDNode, deriveKeyPair, xprvToXpub } from '../src/bip44'

const SECRET_KEY_FILE = 'test/keys/testnet.key'

const rootDir = path.resolve(__dirname, '..')
const secretKeyFilePath = path.resolve(rootDir, SECRET_KEY_FILE)
let rootSecretKey: string | undefined
if (fs.existsSync(secretKeyFilePath)) {
  rootSecretKey = fs
    .readFileSync(secretKeyFilePath)
    .toString('utf8')
    .trim()
  logger.log(`Loaded ${SECRET_KEY_FILE}. Multisig send and sweep tests enabled.`)
  logger.debug('multisig rootSecretKey', rootSecretKey)
} else {
  logger.log(
    `File ${SECRET_KEY_FILE} missing. Multisig send and sweep e2e testnet tests will be skipped. To enable them ask Dylan to share the keys file with you.`,
  )
}

// Comment out elements to disable tests for an address type
const addressTypesToTest: MultisigAddressType[] = [
  AddressType.MultisigLegacy,
  AddressType.MultisigSegwitP2SH,
  AddressType.MultisigSegwitNative,
]

const describeAll = !rootSecretKey ? describe.skip : describe

describeAll('e2e multisig testnet', () => {
  let testsComplete = false

  afterAll(() => {
    testsComplete = true
  })

  let HD_SIGNERS = 2
  let KEYPAIR_SIGNERS = 2
  let ADDRESSES_NEEDED_PER_SIGNER = 3

  // Derive arbitrary paths using the singlesig xprv so that all HD and keypair accounts are deterministic but unique
  const XPUBS: string[] = []
  const XPRVS: string[] = []
  for (let n = 0; n < HD_SIGNERS; n++) {
    const hdNode = deriveHDNode(rootSecretKey!, `m/${n}'`, NETWORK_TESTNET)
    const xprv = hdNode.toBase58()
    const xpub = xprvToXpub(xprv, DERIVATION_PATH, NETWORK_TESTNET)
    XPRVS.push(xprv)
    XPUBS.push(xpub)
  }
  logger.debug('hd keys', XPRVS, XPUBS)

  const PRIV_KEYS: string[] = []
  const PUB_KEYS: string[] = []
  for (let n = 0; n < KEYPAIR_SIGNERS * ADDRESSES_NEEDED_PER_SIGNER; n++) {
    const keyPair = deriveKeyPair(deriveHDNode(rootSecretKey!, `m/1234'/${n}`, NETWORK_TESTNET), 0, NETWORK_TESTNET)
    const privKey = keyPair.toWIF()
    const pubKey = publicKeyToString(keyPair.publicKey)
    PRIV_KEYS.push(privKey)
    PUB_KEYS.push(pubKey)
  }
  logger.debug('key pairs', PRIV_KEYS, PUB_KEYS)

  // The signing parties for our multisig test.
  // NOTE: the signer address type is irrelevant because only the keypair of each signer is used,
  // which doesn't change across address types. However address type can influence the default
  // derivation path if not explicitly configured so it shouldn't be altered.
  const signerPayments = [
    new KeyPairBitcoinPayments({
      logger,
      network: NetworkType.Testnet,
      keyPairs: PRIV_KEYS.slice(0, ADDRESSES_NEEDED_PER_SIGNER),
    }),
    new HdBitcoinPayments({
      logger,
      network: NetworkType.Testnet,
      hdKey: XPRVS[0],
      derivationPath: DERIVATION_PATH,
    }),
    new KeyPairBitcoinPayments({
      logger,
      network: NetworkType.Testnet,
      keyPairs: PRIV_KEYS.slice(ADDRESSES_NEEDED_PER_SIGNER),
    }),
    new HdBitcoinPayments({
      logger,
      network: NetworkType.Testnet,
      hdKey: XPRVS[1],
      derivationPath: DERIVATION_PATH,
    }),
  ]

  for (let addressType of addressTypesToTest) {
    const address0 = ADDRESSES[addressType][0]

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
        expect(accountIds.sort()).toEqual([...XPUBS, ...PUB_KEYS].sort())
      })

      it('getAccountIds(0) returns accounts at index 0', () => {
        const accountIds = payments.getAccountIds(0)
        expect(accountIds).toEqual([
          PUB_KEYS[0],
          XPUBS[0],
          PUB_KEYS[3],
          XPUBS[1]
        ])
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

      describe('getAddress', () => {
        for (let iS in Object.keys(ADDRESSES[addressType])) {
          const i = parseInt(iS)
          it(`can get address ${i}`, async () => {
            const address = payments.getAddress(i)
            expect(address).toBe(ADDRESSES[addressType][i])
          })
        }
      })

      it('can get balance', async () => {
        const balanceResult = await payments.getBalance(0)
        expect(balanceResult.confirmedBalance).toBeTruthy()
        expect(balanceResult.confirmedBalance).toBeTruthy()
        expect(balanceResult.spendableBalance).toBeTruthy()
        expect(balanceResult.sweepable).toBe(true)
        expect(balanceResult.requiresActivation).toBe(false)
      })

      it('can create sweep', async () => {
        const tx = await payments.createSweepTransaction(0, EXTERNAL_ADDRESS, {
          useUnconfirmedUtxos: true,
          feeRate: '10',
          feeRateType: FeeRateType.BasePerWeight,
        })
        expect(tx.multisigData).toBeDefined()
      }, 30 * 1000)

      function assertMultisigData(
        multiInputMultisigData: any,
        address: string,
        fromIndex: number,
        expectedSignatures: number[],
      ) {
        expect(multiInputMultisigData).toBeDefined()
        expect(MultiInputMultisigData.is(multiInputMultisigData)).toBe(true)
        const multisigData = multiInputMultisigData[address]
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

      async function pollUntilFound(signedTx: BitcoinSignedTransaction) {
        const txId = signedTx.id
        const endState = [...END_TRANSACTION_STATES, TransactionStatus.Pending]
        logger.log(`polling until status ${endState.join('|')}`, txId)
        let tx: BitcoinTransactionInfo | undefined
        let changeAddress
        if (signedTx.data.changeOutputs) {
          changeAddress = signedTx.data.changeOutputs.map((ca) => ca.address)
        }
        while (!testsComplete && (!tx || !endState.includes(tx.status))) {
          try {
            tx = await payments.getTransactionInfo(txId, undefined, { changeAddress })
          } catch (e) {
            if (e.message.includes('not found')) {
              logger.log('tx not found yet', txId, e.message)
            } else {
              throw e
            }
          }
          await delay(5000)
        }
        if (!tx) {
          throw new Error(`failed to poll until found ${txId}`)
        }
        logger.log(tx.status, tx)
        expect(tx.id).toBe(signedTx.id)
        if (![signedTx.fromAddress, tx.fromAddress].includes('batch')) {
          expect(tx.fromAddress).toBe(signedTx.fromAddress)
        }
        if (![signedTx.toAddress, tx.toAddress].includes('batch')) {
          expect(tx.toAddress).toBe(signedTx.toAddress)
        }
        expectEqualWhenTruthy(tx.fromExtraId, signedTx.fromExtraId)
        expectEqualWhenTruthy(tx.toExtraId, signedTx.toExtraId)
        expect(tx.data).toBeDefined()
        expect(endState).toContain(tx.status)
        return tx
      }

      it('end to end send', async () => {
        const fromIndex = 0
        const unsignedTx = await payments.createTransaction(fromIndex, EXTERNAL_ADDRESS, '0.0001', {
          useUnconfirmedUtxos: true,
          feeRate: '10',
          feeRateType: FeeRateType.BasePerWeight,
          maxFeePercent: 75,
        })
        assertMultisigData(unsignedTx.multisigData, address0, fromIndex, [])
        const partiallySignedTxs = await Promise.all(signerPayments.map((signer) => signer.signTransaction(unsignedTx)))
        for (let i = 0; i < partiallySignedTxs.length; i++) {
          const partiallySignedTx = partiallySignedTxs[i]
          expect(partiallySignedTx.data.partial).toBe(true)
          expect(partiallySignedTx.data.hex).toMatch(/^[a-f0-9]+$/)
          expect(partiallySignedTx.data.unsignedTxHash).toBe(unsignedTx.data.rawHash)
          assertMultisigData(partiallySignedTx.multisigData, address0, fromIndex, [i])
        }
        const signedTx = await payments.combinePartiallySignedTransactions(partiallySignedTxs)
        expect(signedTx.status).toBe(TransactionStatus.Signed)
        assertMultisigData(signedTx.multisigData, address0, fromIndex, [0,1])
        expect(signedTx.data.partial).toBe(false)
        expect(signedTx.data.hex).toMatch(/^[a-f0-9]+$/)
        expect(signedTx.data.unsignedTxHash).toBe(unsignedTx.data.rawHash)
        logger.log(`Sending ${signedTx.amount} to ${EXTERNAL_ADDRESS} in tx ${signedTx.id}`)
        expect(await payments.broadcastTransaction(signedTx)).toEqual({
          id: signedTx.id,
        })
        const tx = await pollUntilFound(signedTx)
        expect(tx.amount).toEqual(signedTx.amount)
        expect(tx.fee).toEqual(signedTx.fee)
      }, 5 * 60 * 1000)

      it('end to end multi-input send', async () => {
        const fromIndicies = [1, 2] // Use indices separate from other tests to avoid interference
        const changeAddress = fromIndicies.map((i) => payments.getAddress(i))

        const unsignedTx = await payments.createMultiInputTransaction(
          fromIndicies,
          [{
            payport: { address: address0 },
            amount: '0.01',
          }],
          {
            useUnconfirmedUtxos: true, // Prevents consecutive tests from failing
            feeRate: '5',
            feeRateType: FeeRateType.BasePerWeight,
            changeAddress,
          }
        )

        const partiallySignedTxs = await Promise.all(signerPayments.map((signer) => signer.signTransaction(unsignedTx)))
        for (let i = 0; i < partiallySignedTxs.length; i++) {
          const partiallySignedTx = partiallySignedTxs[i]
          expect(partiallySignedTx.data.partial).toBe(true)
          expect(partiallySignedTx.data.hex).toMatch(/^[a-f0-9]+$/)
          expect(partiallySignedTx.data.unsignedTxHash).toBe(unsignedTx.data.rawHash)
        }
        const signedTx = await payments.combinePartiallySignedTransactions(partiallySignedTxs)
        expect(signedTx.status).toBe(TransactionStatus.Signed)

        logger.log(`Sending ${signedTx.amount} from ${[0]} to ${[0]} in tx ${signedTx.id}`)
        expect(await payments.broadcastTransaction(signedTx)).toEqual({
          id: signedTx.id,
        })
        const tx = await pollUntilFound(signedTx)
        expect(tx.amount).toEqual(signedTx.amount)
        expect(tx.fee).toEqual(signedTx.fee)
      }, 5 * 60 * 1000)
    })
  }
})
