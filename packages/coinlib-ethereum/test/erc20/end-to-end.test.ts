import { BaseEthereumPaymentsConfig } from '@bitaccess/coinlib-ethereum';
import { EthereumTransactionInfo } from './../../src/types';
import server, { ServerOptions } from 'ganache'
import { BaseTransactionInfo, NetworkType, numericToHex } from '@bitaccess/coinlib-common'

import { delay, expectEqualOmit, TestLogger } from '../../../../common/testUtils'

import {
  hdAccount,
  CUSTOM_PATH_FIXTURE,
  DEFAULT_PATH_FIXTURE,
  CUSTOM_DERIVATION_PATH,
} from '../fixtures/accounts'
import {
  HdEthereumPayments,
  HdErc20Payments,
  HdErc20PaymentsConfig,
  EthereumPaymentsFactory,
} from '../../src'
import { CONTRACT_GAS, CONTRACT_BYTECODE } from './fixtures/abi'

const LOCAL_NODE = 'http://localhost'
const LOCAL_PORT = 8547

const logger = new TestLogger(__filename)

const factory = new EthereumPaymentsFactory()

const MAIN_SIGNATORY = {
  ...DEFAULT_PATH_FIXTURE.children[0],
  xkeys: hdAccount.root.KEYS,
  derivationPath: DEFAULT_PATH_FIXTURE.derivationPath,
}

const ISSUER_SIGNATORY = {
  ...CUSTOM_PATH_FIXTURE.children[0],
  xkeys: CUSTOM_PATH_FIXTURE.xkeys,
  derivationPath: CUSTOM_DERIVATION_PATH,
}

/** Random recipient */
const TARGET_PAYPORT = { address: '0x62b72782415394f1518da5ec4de6c4c49b7bf854' }

const EXPECTED_TOKEN_ADDRESS = '0xb3F8822A038E8Cd733FBb05FdCbd658B9271AA13'
const EXPECTED_MASTER_ADDRESS = '0x5B31D375304BcF4116d45CDE3093ebc7aAf696fe'
const EXPECTED_FIRST_PROXY_ADDRESS = '0xda65e9e8461a6e8b9f2906133a5fa8c21f24da99'

const BASE_CONFIG: BaseEthereumPaymentsConfig = {
  network: NetworkType.Testnet,
  fullNode: `${LOCAL_NODE}:${LOCAL_PORT}`,
  gasStation: 'none',
  logger,
  networkConstants: {
    networkName: 'ganache',
    chainId: 1337,
  }
}

const TOKEN_UTILS_CONFIG = {
  ...BASE_CONFIG,
  tokenAddress: EXPECTED_TOKEN_ADDRESS,
  name: 'BA_TEST_TOKEN',
  symbol: 'BTT',
  decimals: 7,
}

const ISSUER_ETHER_CONFIG = {
  ...BASE_CONFIG,
  hdKey: ISSUER_SIGNATORY.xkeys.xprv,
  derivationPath: ISSUER_SIGNATORY.derivationPath,
}
const ISSUER_TOKEN_CONFIG = {
  ...TOKEN_UTILS_CONFIG,
  hdKey: ISSUER_SIGNATORY.xkeys.xprv,
  derivationPath: ISSUER_SIGNATORY.derivationPath,
}

const MAIN_ETHER_CONFIG = {
  ...BASE_CONFIG,
  hdKey: hdAccount.root.KEYS.xprv,
}
const MAIN_TOKEN_CONFIG = {
  ...TOKEN_UTILS_CONFIG,
  hdKey: hdAccount.root.KEYS.xprv,
  depositKeyIndex: 0,
  masterAddress: EXPECTED_MASTER_ADDRESS,
}

const FIRST_PROXY_INDEX = 1

const ISSUER_TOKEN_BALANCE_INITIAL = 70e8
const ISSUER_TOKEN_DISTRIBUTE_MAIN = 65e8
const ISSUER_TOKEN_BALANCE_AFTER_DISTRIBUTION = ISSUER_TOKEN_BALANCE_INITIAL - ISSUER_TOKEN_DISTRIBUTE_MAIN
const MAIN_TOKEN_BALANCE_AFTER_DISTRIBUTION = ISSUER_TOKEN_DISTRIBUTE_MAIN
const MAIN_TOKEN_SEND_FIRST_PROXY = 163331000
const MAIN_TOKEN_BALANCE_AFTER_SEND = MAIN_TOKEN_BALANCE_AFTER_DISTRIBUTION - MAIN_TOKEN_SEND_FIRST_PROXY
const PROXY_SWEEP_AMOUNT = MAIN_TOKEN_SEND_FIRST_PROXY

jest.setTimeout(100000)
describe('erc20 end to end tests', () => {
  let ethNode: any
  let issuerEtherPayments: HdEthereumPayments
  let mainTokenPayments: HdErc20Payments

  beforeAll(async () => {
    const ganacheConfig: ServerOptions = {
      accounts: [
        {
          balance: 0.0625e18, // 0,0625 ETH
          secretKey: MAIN_SIGNATORY.keys.prv,
        },
        {
          balance: 625e18, // 625 ETH
          secretKey: ISSUER_SIGNATORY.keys.prv,
        },
      ],
      gasLimit: numericToHex(9980399),
      callGasLimit: numericToHex(9980399),
      logging: {
        logger,
        debug: true, // Set to `true` to log EVM opcodes.
        verbose: true, // Set to `true` to log all RPC requests and responses.
        quiet: false, // Set to `true` to disable logging.
      }
    }

    ethNode = server.server(ganacheConfig)
    ethNode.listen(LOCAL_PORT)
    issuerEtherPayments = new HdEthereumPayments(ISSUER_ETHER_CONFIG)
    mainTokenPayments = new HdErc20Payments(MAIN_TOKEN_CONFIG)
  })

  afterAll(() => {
    ethNode.close()
  })

  describe('HdErc20Payments', () => {

    async function forceGanacheConfirmation(
      txId: string,
      performAssertions: (txInfo: EthereumTransactionInfo) => void,
    ): Promise<EthereumTransactionInfo> {
      let txInfo: EthereumTransactionInfo | undefined
      while (txInfo?.status !== 'confirmed') {
        await delay(1000)
        // Create a bunch of transactions so that ganache considers our tx sufficiently confirmed
        const uCD = await issuerEtherPayments.createServiceTransaction(undefined, { data: CONTRACT_BYTECODE, gas: CONTRACT_GAS })
        const sCD = await issuerEtherPayments.signTransaction(uCD)
        await issuerEtherPayments.broadcastTransaction(sCD)

        txInfo = await mainTokenPayments.getTransactionInfo(txId)
        logger.log('txInfo.receipt.logs', txId, (txInfo.data as any).receipt.logs)
        performAssertions(txInfo)
      }
      return txInfo
    }

    test('deploy token contract', async () => {
      // deploy erc20 contract BA_TEST_TOKEN
      const unsignedContractDeploy = await issuerEtherPayments.createServiceTransaction(undefined, {
        data: CONTRACT_BYTECODE,
        gas: CONTRACT_GAS,
      })
      const signedContractDeploy = await issuerEtherPayments.signTransaction(unsignedContractDeploy)

      const deployedContract = await issuerEtherPayments.broadcastTransaction(signedContractDeploy)
      const txInfo = await issuerEtherPayments.getTransactionInfo(deployedContract.id)
      expect(txInfo.fromAddress).toBe(ISSUER_SIGNATORY.address.toLowerCase())
      expect(txInfo.toAddress).toBe(EXPECTED_TOKEN_ADDRESS.toLowerCase())
    })

    test('deploy master contract', async () => {
      const mainEtherPayments = new HdEthereumPayments(MAIN_ETHER_CONFIG)
      const unsignedTx = await mainEtherPayments.createServiceTransaction()
      const signedTx = await mainEtherPayments.signTransaction(unsignedTx)
      const broadcastedTx = await mainEtherPayments.broadcastTransaction(signedTx)
      const txInfo = await mainEtherPayments.getTransactionInfo(broadcastedTx.id)

      expect(txInfo).toBeDefined()
      expect(txInfo.fromAddress?.toLowerCase()).toEqual(MAIN_SIGNATORY.address.toLowerCase())
      expect(txInfo.toAddress).toBe(EXPECTED_MASTER_ADDRESS.toLowerCase())
    })

    test('send tokens from issuer to main', async () => {
      const issuerTokenPayments = factory.newPayments(ISSUER_TOKEN_CONFIG as HdErc20PaymentsConfig)

      const { confirmedBalance: issuerBalance } = await issuerTokenPayments.getBalance(0)
      expect(issuerBalance).toBe(String(ISSUER_TOKEN_BALANCE_INITIAL))

      const unsignedTx = await issuerTokenPayments.createTransaction(0, { address: MAIN_SIGNATORY.address }, String(ISSUER_TOKEN_DISTRIBUTE_MAIN))
      const signedTx = await issuerTokenPayments.signTransaction(unsignedTx)
      const broadcastedTx = await issuerTokenPayments.broadcastTransaction(signedTx)

      const txInfo = await forceGanacheConfirmation(broadcastedTx.id, (txInfo) => {
        expect(txInfo.amount).toBe(String(ISSUER_TOKEN_DISTRIBUTE_MAIN))
        expect(txInfo.fromAddress).toBe(ISSUER_SIGNATORY.address.toLowerCase())
        expect(txInfo.toAddress).toBe(MAIN_SIGNATORY.address.toLowerCase())
      })
      expect(txInfo.isConfirmed).toBe(true)
      expect(txInfo.isExecuted).toBe(true)

      const { confirmedBalance: confirmedDistributorBalance } = await mainTokenPayments.getBalance(ISSUER_SIGNATORY.address)
      // leftovers after tx
      expect(confirmedDistributorBalance).toEqual(String(ISSUER_TOKEN_BALANCE_AFTER_DISTRIBUTION))

      const { confirmedBalance: confirmedSourceBalance } = await mainTokenPayments.getBalance(MAIN_SIGNATORY.address)
      expect(confirmedSourceBalance).toEqual(String(MAIN_TOKEN_BALANCE_AFTER_DISTRIBUTION))
    })

    test('derive proxy addresses', async () => {
      const { confirmedBalance } = await mainTokenPayments.getBalance(EXPECTED_MASTER_ADDRESS)
      expect(confirmedBalance).toEqual('0')

      const destination = (await mainTokenPayments.getPayport(FIRST_PROXY_INDEX)).address
      expect(destination).toBe(EXPECTED_FIRST_PROXY_ADDRESS)

      // NOTE: i != 0 because 0 is signer's index
      // proxy contracts of the first one
      for (let i = FIRST_PROXY_INDEX; i < 10; i++) {
        const { address: derivedAddress } = await mainTokenPayments.getPayport(i)
        const { confirmedBalance: dABalance } = await mainTokenPayments.getBalance(derivedAddress)
        expect(dABalance).toEqual('0')
        logger.log('proxy address', i, derivedAddress)
      }

      const owner = await mainTokenPayments.getPayport(MAIN_TOKEN_CONFIG.depositKeyIndex)

      expect(owner.address).toBe(MAIN_SIGNATORY.address.toLowerCase())
    })

    test('normal transaction from main to proxy address', async () => {
      const destination = EXPECTED_FIRST_PROXY_ADDRESS
      const preBalanceSource = await mainTokenPayments.getBalance(MAIN_SIGNATORY.address)
      expect(preBalanceSource.confirmedBalance).toEqual(String(MAIN_TOKEN_BALANCE_AFTER_DISTRIBUTION))

      const unsignedTx = await mainTokenPayments.createTransaction(0, { address: destination }, String(MAIN_TOKEN_SEND_FIRST_PROXY))
      const signedTx = await mainTokenPayments.signTransaction(unsignedTx)

      const broadcastedTx = await mainTokenPayments.broadcastTransaction(signedTx)
      const txInfo = await forceGanacheConfirmation(broadcastedTx.id, (txInfo) => {
        expect(txInfo.fromAddress).toBe(MAIN_SIGNATORY.address.toLowerCase())
        expect(txInfo.toAddress).toBe(destination.toLowerCase())
        expect(txInfo.amount).toBe(String(MAIN_TOKEN_SEND_FIRST_PROXY))
      })
      expect(txInfo.isConfirmed).toBe(true)
      expect(txInfo.isExecuted).toBe(true)

      const { confirmedBalance: balanceSource } = await mainTokenPayments.getBalance(MAIN_SIGNATORY.address)
      const { confirmedBalance: balanceTarget } = await mainTokenPayments.getBalance(destination)

      expect(balanceTarget).toEqual(String(MAIN_TOKEN_SEND_FIRST_PROXY))
      expect(balanceSource).toEqual(String(MAIN_TOKEN_BALANCE_AFTER_SEND))
    })

    let sweepTxInfo: BaseTransactionInfo

    test('sweep transaction from proxy address to random address', async () => {
      const proxyAddress = EXPECTED_FIRST_PROXY_ADDRESS
      const destination = TARGET_PAYPORT.address

      const { confirmedBalance: balanceSourcePre } = await mainTokenPayments.getBalance(proxyAddress)
      expect(balanceSourcePre).toEqual(String(PROXY_SWEEP_AMOUNT))
      const { confirmedBalance: balanceTargetPre } = await mainTokenPayments.getBalance(TARGET_PAYPORT)
      expect(balanceTargetPre).toEqual('0')

      const unsignedTx = await mainTokenPayments.createSweepTransaction(FIRST_PROXY_INDEX, { address: destination })
      const signedTx = await mainTokenPayments.signTransaction(unsignedTx)
      const broadcastedTx = await mainTokenPayments.broadcastTransaction(signedTx)

      const txInfo = await forceGanacheConfirmation(broadcastedTx.id, (txInfo) => {
        expect(txInfo.fromAddress).toBe(proxyAddress)
        expect(txInfo.toAddress).toBe(destination)
        expect(txInfo.amount).toBe(String(PROXY_SWEEP_AMOUNT))
        expect(txInfo.toAddress).toBe(destination.toLowerCase())
        expect(txInfo.fromAddress).toBe(proxyAddress.toLowerCase())
      })
      expect(txInfo.isConfirmed).toBe(true)
      expect(txInfo.isExecuted).toBe(true)

      sweepTxInfo = txInfo

      const { confirmedBalance: balanceProxy } = await mainTokenPayments.getBalance(proxyAddress)
      const { confirmedBalance: balanceTarget } = await mainTokenPayments.getBalance(destination)

      expect(balanceProxy).toEqual('0')
      expect(balanceTarget).toEqual(String(PROXY_SWEEP_AMOUNT))
    })

    test('sweep from main to proxy address', async () => {
      const destination = EXPECTED_FIRST_PROXY_ADDRESS

      const unsignedTx = await mainTokenPayments.createSweepTransaction(0, { address: destination })
      const signedTx = await mainTokenPayments.signTransaction(unsignedTx)

      const broadcastedTx = await mainTokenPayments.broadcastTransaction(signedTx)
      const txInfo = await forceGanacheConfirmation(broadcastedTx.id, (txInfo) => {
        expect(txInfo.fromAddress).toBe(MAIN_SIGNATORY.address.toLowerCase())
        expect(txInfo.toAddress).toBe(destination)
        expect(txInfo.amount).toBe(unsignedTx.amount)
      })
      expect(txInfo.isConfirmed).toBe(true)
      expect(txInfo.isExecuted).toBe(true)

      const { confirmedBalance: balanceSource } = await mainTokenPayments.getBalance(0)
      const { confirmedBalance: balanceTarget } = await mainTokenPayments.getBalance(destination)

      expect(balanceSource).toEqual('0')
      expect(balanceTarget).toEqual(String(MAIN_TOKEN_BALANCE_AFTER_SEND))
    })

    test('can get balance of unused address', async () => {
      expect(await mainTokenPayments.getBalance(12345678)).toEqual({
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
      const paymentsInfo = await mainTokenPayments.getTransactionInfo(sweepTxInfo.id)
      const utilsInfo = await utils.getTransactionInfo(sweepTxInfo.id)
      expectEqualOmit(utilsInfo, paymentsInfo, ['confirmations', 'currentBlockNumber', 'data.currentBlock'])
      // Expect utils to return info for the erc20 transfer, not the base 0-value eth fields
      expect(utilsInfo.fromAddress).toBe(EXPECTED_FIRST_PROXY_ADDRESS)
      expect(utilsInfo.toAddress).toBe(TARGET_PAYPORT.address)
      expect(utilsInfo.amount).toBe(PROXY_SWEEP_AMOUNT)
    })

    test('utils getAddressBalance returns expected value', async () => {
      const utils = factory.newUtils(TOKEN_UTILS_CONFIG)
      const { confirmedBalance } = await utils.getAddressBalance(EXPECTED_FIRST_PROXY_ADDRESS)
      expect(confirmedBalance).toBe(String(MAIN_TOKEN_BALANCE_AFTER_SEND))
    })
  })
})
