import { EthereumBIP44 } from './../../src/bip44';
import server from 'ganache'
import { BaseTransactionInfo, NetworkType } from '@bitaccess/coinlib-common'

import { expectEqualOmit, TestLogger } from '../../../../common/testUtils'

import { DEFAULT_PATH_FIXTURE, hdAccount } from '../fixtures/accounts'
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

const source = DEFAULT_PATH_FIXTURE.children[0]

const tokenIssuer = EthereumBIP44.generateNewKeys().getSignatory(0)
const tokenDistributor = EthereumBIP44.generateNewKeys().getSignatory(0)

const target = { address: '0x62b72782415394f1518da5ec4de6c4c49b7bf854' } // payport 1

const BASE_CONFIG = {
  network: NetworkType.Testnet,
  fullNode: `${LOCAL_NODE}:${LOCAL_PORT}`,
  parityNode: 'none',
  gasStation: 'none',
  logger,
}

const TOKEN_ISSUER_ETHER_CONFIG = {
  ...BASE_CONFIG,
  hdKey: tokenIssuer.xkeys.xprv, // hdAccount.root.KEYS.xprv,
}

const TOKEN_UTILS_CONFIG = {
  ...BASE_CONFIG,
  abi: CONTRACT_JSON,
  tokenAddress: '',
  name: 'BA_TEST_TOKEN',
  symbol: 'BTT',
  decimals: 7,
}

const TOKEN_ISSUER_CONFIG = {
  ...TOKEN_UTILS_CONFIG,
  hdKey: tokenIssuer.xkeys.xprv, // hdAccount.root.KEYS.xprv,
  depositKeyIndex: 0,
}

let hd: HdErc20Payments
let tokenIssuerEther: HdEthereumPayments
const TOKEN_HD_CONFIG = {
  ...TOKEN_UTILS_CONFIG,
  hdKey: hdAccount.root.KEYS.xprv,
  depositKeyIndex: 0,
  masterAddress: '',
}

const PROXY_SWEEP_AMOUNT = '163331000'

jest.setTimeout(100000)
describe('end to end tests', () => {
  let ethNode: any
  beforeAll(async () => {
    const ganacheConfig = {
      accounts: [
        {
          balance: 0.0625e18, // 0,0625 ETH
          secretKey: tokenDistributor.keys.prv,
        },
        {
          balance: 0.0625e18, // 0,0625 ETH
          secretKey: source.keys.prv,
        },
      ],
      gasLimit: '0x9849ef', // 9980399
      callGasLimit: '0x9849ef', // 9980399
      chainId: 3, // for ropsten, the new ganache need to verify v value in txn's signature; v = 35(or 36) + 2 * chainId
    }

    ethNode = server.server(ganacheConfig)
    ethNode.listen(LOCAL_PORT)

    const provider = ethNode.provider
    const accounts = await provider.request({ method: 'eth_accounts', params: [] })

    tokenIssuerEther = new HdEthereumPayments(TOKEN_ISSUER_ETHER_CONFIG)

    // deploy erc20 contract BA_TEST_TOKEN
    const unsignedContractDeploy = await tokenIssuerEther.createServiceTransaction(undefined, {
      data: CONTRACT_BYTECODE,
      gas: CONTRACT_GAS,
    })

    unsignedContractDeploy.chainId = '1337'
    unsignedContractDeploy.id = '1337'
    const signedContractDeploy = await tokenIssuerEther.signTransaction(unsignedContractDeploy)

    const deployedContract = await tokenIssuerEther.broadcastTransaction(signedContractDeploy)
    const contractInfo: EthereumTransactionInfo = await tokenIssuerEther.getTransactionInfo(deployedContract.id)
    const data: any = contractInfo.data
    const tokenAddress = data.contractAddress

    TOKEN_UTILS_CONFIG.tokenAddress = tokenAddress
    TOKEN_ISSUER_CONFIG.tokenAddress = tokenAddress
    TOKEN_HD_CONFIG.tokenAddress = tokenAddress
  })

  afterAll(() => {
    ethNode.close()
  })

  describe('HD payments', () => {
    test('send funds from distribution account to hd', async () => {
      // default to 0 (depositKeyIndex) is source.address
      const tokenIssuer = factory.newPayments(TOKEN_ISSUER_CONFIG as HdErc20PaymentsConfig)

      const unsignedTx = await tokenIssuer.createTransaction(0, { address: source.address }, '6500000000')
      const signedTx = await tokenIssuer.signTransaction(unsignedTx)
      const broadcastedTx = await tokenIssuer.broadcastTransaction(signedTx)
      hd = factory.newPayments(TOKEN_HD_CONFIG as HdErc20PaymentsConfig)

      const { confirmedBalance: confirmedDistributorBalance } = await hd.getBalance(tokenDistributor.address)
      // leftovers after tx
      expect(confirmedDistributorBalance).toEqual('500000000')
      // source is 0
      const { confirmedBalance: confirmedSourceBalance } = await hd.getBalance(source.address)
      expect(confirmedSourceBalance).toEqual('6500000000')
    })

    const depositAddresses: Array<string> = []
    let masterAddress: string

    test('Deriving and Deploying DepositAddress payments', async () => {
      // master wallet contract
      const unsignedTx = await hd.createServiceTransaction(undefined, { gas: '4700000' })

      const signedTx = await hd.signTransaction(unsignedTx)
      const broadcastedTx = await hd.broadcastTransaction(signedTx)
      const txInfo = await hd.getTransactionInfo(broadcastedTx.id)

      const { address } = await hd.getPayport(0)

      expect(txInfo)
      const data: any = txInfo.data
      expect(data.from.toLowerCase()).toEqual(address.toLowerCase())
      masterAddress = data.contractAddress
      TOKEN_HD_CONFIG.masterAddress = masterAddress
      hd = factory.newPayments(TOKEN_HD_CONFIG as HdErc20PaymentsConfig)

      const { confirmedBalance } = await hd.getBalance(data.contractAddress)
      expect(confirmedBalance).toEqual('0')

      // NOTE: i != 0 because 0 is signer's index
      // proxy contracts of the first one
      for (let i = 1; i < 10; i++) {
        const { address: derivedAddress } = await hd.getPayport(i)
        const { confirmedBalance: dABalance } = await hd.getBalance(derivedAddress)
        expect(dABalance).toEqual('0')
        depositAddresses.push(derivedAddress)
      }

      const erc20HW = await hd.getPayport(0)
      const owner = await hd.getPayport(TOKEN_HD_CONFIG.depositKeyIndex)

      expect(erc20HW.address).toEqual(owner.address)
    })

    test('normal transaction to proxy address', async () => {
      const destination = depositAddresses[0]

      const preBalanceSource = await hd.getBalance(source.address)
      const preConfig = hd.getFullConfig()

      const unsignedTx = await hd.createTransaction(0, { address: destination }, PROXY_SWEEP_AMOUNT)
      const signedTx = await hd.signTransaction(unsignedTx)

      const broadcastedTx = await hd.broadcastTransaction(signedTx)
      const txInfo = await hd.getTransactionInfo(broadcastedTx.id)

      const { confirmedBalance: balanceSource } = await hd.getBalance(source.address)
      const { confirmedBalance: balanceTarget } = await hd.getBalance(destination)

      expect(balanceTarget).toEqual(PROXY_SWEEP_AMOUNT)
      expect(balanceSource).toEqual('6336669000')
      expect(preConfig).toEqual(hd.getFullConfig())
      expect(txInfo.amount).toEqual(PROXY_SWEEP_AMOUNT)
    })

    let sweepTxInfo: BaseTransactionInfo

    test('sweep transaction to contract address', async () => {
      const destination = target.address

      const { confirmedBalance: balanceSourcePre } = await hd.getBalance(depositAddresses[0])
      expect(balanceSourcePre).toEqual(PROXY_SWEEP_AMOUNT)
      const { confirmedBalance: balanceTargetPre } = await hd.getBalance(target)
      expect(balanceTargetPre).toEqual('0')

      const unsignedTx = await hd.createSweepTransaction(1, { address: destination })
      const signedTx = await hd.signTransaction(unsignedTx)
      const broadcastedTx = await hd.broadcastTransaction(signedTx)
      let txInfo = await hd.getTransactionInfo(broadcastedTx.id)
      sweepTxInfo = txInfo
      expect(txInfo.fromAddress).toBe(depositAddresses[0])
      expect(txInfo.toAddress).toBe(destination)
      expect(txInfo.amount).toBe(PROXY_SWEEP_AMOUNT)

      expect(txInfo.toAddress || '').toBe(destination.toLowerCase())
      expect(txInfo.fromAddress || '').toBe(depositAddresses[0].toLowerCase())

      // make some txs just to confirm previous
      while (txInfo.status !== 'confirmed') {
        const uCD = await tokenIssuerEther.createServiceTransaction(undefined, { data: CONTRACT_BYTECODE, gas: CONTRACT_GAS })
        const sCD = await tokenIssuerEther.signTransaction(uCD)
        const dC = await tokenIssuerEther.broadcastTransaction(sCD)
        const cInfo = await tokenIssuerEther.getTransactionInfo(dC.id)
        txInfo = await hd.getTransactionInfo(broadcastedTx.id)
      }

      const { confirmedBalance: balanceSource } = await hd.getBalance(depositAddresses[0])
      const { confirmedBalance: balanceTarget } = await hd.getBalance(destination)

      expect(balanceSource).toEqual('0')
      expect(balanceTarget).toEqual(PROXY_SWEEP_AMOUNT)
    })

    test('sweep from hot wallet', async () => {
      const destination = depositAddresses[1]

      const unsignedTx = await hd.createSweepTransaction(0, { address: destination })
      const signedTx = await hd.signTransaction(unsignedTx)

      const broadcastedTx = await hd.broadcastTransaction(signedTx)
      const txInfo = await hd.getTransactionInfo(broadcastedTx.id)
      expect(txInfo.toAddress).toBe(destination)
      expect(txInfo.amount).toBe(unsignedTx.amount)

      const { confirmedBalance: balanceSource } = await hd.getBalance(0)
      const { confirmedBalance: balanceTarget } = await hd.getBalance(destination)

      expect(balanceSource).toEqual('0')
      expect(balanceTarget).toEqual('6336669000')
      expect(txInfo.amount).toEqual('6336669000')
    })

    test('can get balance of unused address', async () => {
      expect(await hd.getBalance(12345678)).toEqual({
        confirmedBalance: '0',
        unconfirmedBalance: '0',
        spendableBalance: '0',
        sweepable: false,
        requiresActivation: false,
      })
    })

    test('erc20 utils getTxInfo returns expected values', async () => {
      const utils = factory.newUtils(TOKEN_UTILS_CONFIG)
      // Expect utils to return the same result as payments
      const paymentsInfo = await hd.getTransactionInfo(sweepTxInfo.id)
      const utilsInfo = await utils.getTransactionInfo(sweepTxInfo.id)
      expectEqualOmit(utilsInfo, paymentsInfo, ['confirmations', 'currentBlockNumber', 'data.currentBlock'])
      // Expect utils to return info for the erc20 transfer, not the base 0-value eth fields
      expect(utilsInfo.fromAddress).toBe(depositAddresses[0])
      expect(utilsInfo.toAddress).toBe(target.address)
      expect(utilsInfo.amount).toBe(PROXY_SWEEP_AMOUNT)
    })

    test('erc20 utils getBalance returns expected value', async () => {
      const utils = factory.newUtils(TOKEN_UTILS_CONFIG)
      const { confirmedBalance } = await utils.getAddressBalance(depositAddresses[1])
      expect(confirmedBalance).toBe('6336669000')
    })
  })
})
