import server from 'ganache'
import { BaseTransactionInfo, NetworkType } from '@bitaccess/coinlib-common'

import { expectEqualOmit, TestLogger } from '../../../../common/testUtils'

import {
  hdAccount,
  CUSTOM_PATH_FIXTURE,
  DEFAULT_PATH_FIXTURE,
  DEFAULT_DERIVATION_PATH,
  CUSTOM_DERIVATION_PATH,
} from '../fixtures/accounts'
import {
  HdEthereumPayments,
  HdErc20Payments,
  HdErc20PaymentsConfig,
  EthereumPaymentsFactory,
  EthereumTransactionInfo,
} from '../../src'
import { CONTRACT_JSON, CONTRACT_GAS, CONTRACT_BYTECODE } from './fixtures/abi'

const LOCAL_NODE = 'http://localhost'
const LOCAL_PORT = 8547

const logger = new TestLogger('HdErc20PaymentsTest')

const factory = new EthereumPaymentsFactory()

const SOURCE_SIGNATORY = {
  ...DEFAULT_PATH_FIXTURE.children[0],
  xkeys: hdAccount.root.KEYS,
  derivationPath: DEFAULT_PATH_FIXTURE.derivationPath,
}

const TOKEN_ISSUER_SIGNATORY = {
  ...CUSTOM_PATH_FIXTURE.children[0],
  xkeys: CUSTOM_PATH_FIXTURE.xkeys,
  derivationPath: CUSTOM_DERIVATION_PATH,
}

const TOKEN_DISTRIBUTOR_SIGNATORY = {
  ...CUSTOM_PATH_FIXTURE.children[1],
  xkeys: CUSTOM_PATH_FIXTURE.xkeys,
  derivationPath: CUSTOM_DERIVATION_PATH,
}

/** Random recipient */
const TARGET_PAYPORT = { address: '0x62b72782415394f1518da5ec4de6c4c49b7bf854' }

const EXPECTED_TOKEN_ADDRESS = '0xb3F8822A038E8Cd733FBb05FdCbd658B9271AA13'
const EXPECTED_MASTER_ADDRESS = '0x5B31D375304BcF4116d45CDE3093ebc7aAf696fe'

const BASE_CONFIG = {
  network: NetworkType.Testnet,
  fullNode: `${LOCAL_NODE}:${LOCAL_PORT}`,
  parityNode: 'none',
  gasStation: 'none',
  logger,
}

const TOKEN_ISSUER_ETHER_CONFIG = {
  ...BASE_CONFIG,
  hdKey: TOKEN_ISSUER_SIGNATORY.xkeys.xprv,
  derivationPath: TOKEN_ISSUER_SIGNATORY.derivationPath,
}

const TOKEN_UTILS_CONFIG = {
  ...BASE_CONFIG,
  abi: CONTRACT_JSON,
  tokenAddress: EXPECTED_TOKEN_ADDRESS,
  name: 'BA_TEST_TOKEN',
  symbol: 'BTT',
  decimals: 7,
}

const TOKEN_ISSUER_CONFIG = {
  ...TOKEN_UTILS_CONFIG,
  hdKey: TOKEN_ISSUER_SIGNATORY.xkeys.xprv,
  derivationPath: TOKEN_ISSUER_SIGNATORY.derivationPath,
  depositKeyIndex: 0,
}

const TOKEN_SOURCE_CONFIG = {
  ...TOKEN_UTILS_CONFIG,
  hdKey: hdAccount.root.KEYS.xprv,
  depositKeyIndex: 0,
  masterAddress: EXPECTED_MASTER_ADDRESS,
}

const FIRST_PROXY_INDEX = 1

const ISSUER_TOKEN_BALANCE_INITIAL = 70e8
const ISSUER_TOKEN_DISTRIBUTE_SOURCE = 65e8
const ISSUER_TOKEN_BALANCE_AFTER_DISTRIBUTION = ISSUER_TOKEN_BALANCE_INITIAL - ISSUER_TOKEN_DISTRIBUTE_SOURCE
const SOURCE_TOKEN_BALANCE_AFTER_DISTRIBUTION = ISSUER_TOKEN_DISTRIBUTE_SOURCE
const SOURCE_TOKEN_SEND_FIRST_PROXY = 163331000
const SOURCE_TOKEN_BALANCE_AFTER_SEND = SOURCE_TOKEN_BALANCE_AFTER_DISTRIBUTION - SOURCE_TOKEN_SEND_FIRST_PROXY
const PROXY_SWEEP_AMOUNT = SOURCE_TOKEN_SEND_FIRST_PROXY

jest.setTimeout(100000)
describe('erc20 end to end tests', () => {
  let ethNode: any
  let issuerEtherPayments: HdEthereumPayments
  let sourcePayments: HdErc20Payments

  beforeAll(async () => {
    const ganacheConfig = {
      accounts: [
        {
          balance: 0.0625e18, // 0,0625 ETH
          secretKey: TOKEN_ISSUER_SIGNATORY.keys.prv,
        },
        {
          balance: 0.0625e18, // 0,0625 ETH
          secretKey: SOURCE_SIGNATORY.keys.prv,
        },
      ],
      gasLimit: '0x9849ef', // 9980399
      callGasLimit: '0x9849ef', // 9980399
      chainId: 3, // for ropsten, the new ganache need to verify v value in txn's signature; v = 35(or 36) + 2 * chainId
    }

    ethNode = server.server(ganacheConfig)
    ethNode.listen(LOCAL_PORT)
    issuerEtherPayments = new HdEthereumPayments(TOKEN_ISSUER_ETHER_CONFIG)
    sourcePayments = new HdErc20Payments(TOKEN_SOURCE_CONFIG)
  })

  afterAll(() => {
    ethNode.close()
  })

  describe('HdErc20Payments', () => {

    test('deploy token contract', async () => {
      // deploy erc20 contract BA_TEST_TOKEN
      const unsignedContractDeploy = await issuerEtherPayments.createServiceTransaction(undefined, {
        data: CONTRACT_BYTECODE,
        gas: CONTRACT_GAS,
      })

      unsignedContractDeploy.chainId = '1337'
      unsignedContractDeploy.id = '1337'
      const signedContractDeploy = await issuerEtherPayments.signTransaction(unsignedContractDeploy)

      const deployedContract = await issuerEtherPayments.broadcastTransaction(signedContractDeploy)
      const txInfo = await issuerEtherPayments.getTransactionInfo(deployedContract.id)
      expect(txInfo.fromAddress).toBe(TOKEN_ISSUER_SIGNATORY.address.toLowerCase())
      expect(txInfo.toAddress).toBe(EXPECTED_TOKEN_ADDRESS.toLowerCase())
    })

    test('deploy master contract', async () => {
      const unsignedTx = await sourcePayments.createServiceTransaction()
      const signedTx = await sourcePayments.signTransaction(unsignedTx)
      const broadcastedTx = await sourcePayments.broadcastTransaction(signedTx)
      const txInfo = await sourcePayments.getTransactionInfo(broadcastedTx.id)

      expect(txInfo).toBeDefined()
      expect(txInfo.fromAddress?.toLowerCase()).toEqual(SOURCE_SIGNATORY.address.toLowerCase())
      expect(txInfo.toAddress).toBe(EXPECTED_MASTER_ADDRESS.toLowerCase())
    })

    test('send tokens from issuer to source', async () => {
      const issuerTokenPayments = factory.newPayments(TOKEN_ISSUER_CONFIG as HdErc20PaymentsConfig)

      const { confirmedBalance: issuerBalance } = await issuerTokenPayments.getBalance(0)
      expect(issuerBalance).toBe(String(ISSUER_TOKEN_BALANCE_INITIAL))

      const unsignedTx = await issuerTokenPayments.createTransaction(0, { address: SOURCE_SIGNATORY.address }, String(ISSUER_TOKEN_DISTRIBUTE_SOURCE))
      const signedTx = await issuerTokenPayments.signTransaction(unsignedTx)
      const broadcastedTx = await issuerTokenPayments.broadcastTransaction(signedTx)

      const txInfo = await issuerTokenPayments.getTransactionInfo(broadcastedTx.id)
      expect(txInfo.amount).toBe(String(ISSUER_TOKEN_DISTRIBUTE_SOURCE))
      expect(txInfo.fromAddress).toBe(TOKEN_ISSUER_SIGNATORY.address.toLowerCase())
      expect(txInfo.toAddress).toBe(SOURCE_SIGNATORY.address.toLowerCase())

      const { confirmedBalance: confirmedDistributorBalance } = await sourcePayments.getBalance(TOKEN_ISSUER_SIGNATORY.address)
      // leftovers after tx
      expect(confirmedDistributorBalance).toEqual(String(ISSUER_TOKEN_BALANCE_AFTER_DISTRIBUTION))

      const { confirmedBalance: confirmedSourceBalance } = await sourcePayments.getBalance(SOURCE_SIGNATORY.address)
      expect(confirmedSourceBalance).toEqual(String(SOURCE_TOKEN_BALANCE_AFTER_DISTRIBUTION))
    })

    test('derive proxy addresses', async () => {
      const { confirmedBalance } = await sourcePayments.getBalance(EXPECTED_MASTER_ADDRESS)
      expect(confirmedBalance).toEqual('0')

      // NOTE: i != 0 because 0 is signer's index
      // proxy contracts of the first one
      for (let i = FIRST_PROXY_INDEX; i < 10; i++) {
        const { address: derivedAddress } = await sourcePayments.getPayport(i)
        const { confirmedBalance: dABalance } = await sourcePayments.getBalance(derivedAddress)
        expect(dABalance).toEqual('0')
        console.log('proxy address', i, derivedAddress)
      }

      const owner = await sourcePayments.getPayport(TOKEN_SOURCE_CONFIG.depositKeyIndex)

      expect(owner.address).toBe(SOURCE_SIGNATORY.address.toLowerCase())
    })

    test('normal transaction from source to proxy address', async () => {
      const destination = (await sourcePayments.getPayport(FIRST_PROXY_INDEX)).address

      const preBalanceSource = await sourcePayments.getBalance(SOURCE_SIGNATORY.address)
      expect(preBalanceSource.confirmedBalance).toEqual(String(SOURCE_TOKEN_BALANCE_AFTER_DISTRIBUTION))

      const unsignedTx = await sourcePayments.createTransaction(0, { address: destination }, String(SOURCE_TOKEN_SEND_FIRST_PROXY))
      const signedTx = await sourcePayments.signTransaction(unsignedTx)

      const broadcastedTx = await sourcePayments.broadcastTransaction(signedTx)
      const txInfo = await sourcePayments.getTransactionInfo(broadcastedTx.id)

      const { confirmedBalance: balanceSource } = await sourcePayments.getBalance(SOURCE_SIGNATORY.address)
      const { confirmedBalance: balanceTarget } = await sourcePayments.getBalance(destination)

      expect(balanceTarget).toEqual(String(SOURCE_TOKEN_SEND_FIRST_PROXY))
      expect(balanceSource).toEqual(String(SOURCE_TOKEN_BALANCE_AFTER_SEND))
      expect(txInfo.amount).toEqual(String(SOURCE_TOKEN_SEND_FIRST_PROXY))
    })

    let sweepTxInfo: BaseTransactionInfo

    test('sweep transaction from proxy address to random address', async () => {
      const sourceAddress = (await sourcePayments.getPayport(FIRST_PROXY_INDEX)).address
      const destination = TARGET_PAYPORT.address

      const { confirmedBalance: balanceSourcePre } = await sourcePayments.getBalance(sourceAddress)
      expect(balanceSourcePre).toEqual(String(PROXY_SWEEP_AMOUNT))
      const { confirmedBalance: balanceTargetPre } = await sourcePayments.getBalance(TARGET_PAYPORT)
      expect(balanceTargetPre).toEqual('0')

      const unsignedTx = await sourcePayments.createSweepTransaction(sourceAddress, { address: destination })
      const signedTx = await sourcePayments.signTransaction(unsignedTx)
      const broadcastedTx = await sourcePayments.broadcastTransaction(signedTx)
      let txInfo = await sourcePayments.getTransactionInfo(broadcastedTx.id)
      console.log(txInfo)
      sweepTxInfo = txInfo
      expect(txInfo.fromAddress).toBe(sourceAddress)
      expect(txInfo.toAddress).toBe(destination)
      expect(txInfo.amount).toBe(String(PROXY_SWEEP_AMOUNT))

      expect(txInfo.toAddress || '').toBe(destination.toLowerCase())
      expect(txInfo.fromAddress || '').toBe(sourceAddress.toLowerCase())

      // make some txs just to confirm previous
      while (txInfo.status !== 'confirmed') {
        const uCD = await issuerEtherPayments.createServiceTransaction(undefined, { data: CONTRACT_BYTECODE, gas: CONTRACT_GAS })
        const sCD = await issuerEtherPayments.signTransaction(uCD)
        const dC = await issuerEtherPayments.broadcastTransaction(sCD)
        const cInfo = await issuerEtherPayments.getTransactionInfo(dC.id)
        txInfo = await sourcePayments.getTransactionInfo(broadcastedTx.id)
      }

      const { confirmedBalance: balanceSource } = await sourcePayments.getBalance(sourceAddress)
      const { confirmedBalance: balanceTarget } = await sourcePayments.getBalance(destination)

      expect(balanceSource).toEqual('0')
      expect(balanceTarget).toEqual(PROXY_SWEEP_AMOUNT)
    })

    test('sweep from source to proxy address', async () => {
      const destination = (await sourcePayments.getPayport(FIRST_PROXY_INDEX)).address

      const unsignedTx = await sourcePayments.createSweepTransaction(0, { address: destination })
      const signedTx = await sourcePayments.signTransaction(unsignedTx)

      const broadcastedTx = await sourcePayments.broadcastTransaction(signedTx)
      const txInfo = await sourcePayments.getTransactionInfo(broadcastedTx.id)
      expect(txInfo.toAddress).toBe(destination)
      expect(txInfo.amount).toBe(unsignedTx.amount)

      const { confirmedBalance: balanceSource } = await sourcePayments.getBalance(0)
      const { confirmedBalance: balanceTarget } = await sourcePayments.getBalance(destination)

      expect(balanceSource).toEqual('0')
      expect(balanceTarget).toEqual(String(SOURCE_TOKEN_BALANCE_AFTER_SEND))
      expect(txInfo.amount).toEqual(String(SOURCE_TOKEN_BALANCE_AFTER_SEND))
    })

    test('can get balance of unused address', async () => {
      expect(await sourcePayments.getBalance(12345678)).toEqual({
        confirmedBalance: '0',
        unconfirmedBalance: '0',
        spendableBalance: '0',
        sweepable: false,
        requiresActivation: false,
      })
    })

    test('utils getTxInfo returns expected values', async () => {
      const utils = factory.newUtils(TOKEN_UTILS_CONFIG)
      // Expect utils to return the same result as payments
      const paymentsInfo = await sourcePayments.getTransactionInfo(sweepTxInfo.id)
      const utilsInfo = await utils.getTransactionInfo(sweepTxInfo.id)
      expectEqualOmit(utilsInfo, paymentsInfo, ['confirmations', 'currentBlockNumber', 'data.currentBlock'])
      const firstAddress = (await sourcePayments.getPayport(FIRST_PROXY_INDEX)).address
      // Expect utils to return info for the erc20 transfer, not the base 0-value eth fields
      expect(utilsInfo.fromAddress).toBe(firstAddress)
      expect(utilsInfo.toAddress).toBe(TARGET_PAYPORT.address)
      expect(utilsInfo.amount).toBe(PROXY_SWEEP_AMOUNT)
    })

    test('utils getAddressBalance returns expected value', async () => {
      const utils = factory.newUtils(TOKEN_UTILS_CONFIG)
      const firstAddress = (await sourcePayments.getPayport(FIRST_PROXY_INDEX)).address
      const { confirmedBalance } = await utils.getAddressBalance(firstAddress)
      expect(confirmedBalance).toBe(String(SOURCE_TOKEN_BALANCE_AFTER_SEND))
    })
  })
})
