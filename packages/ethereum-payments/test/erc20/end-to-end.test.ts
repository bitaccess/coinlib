import BigNumber from 'bignumber.js'
import server from 'ganache-core'
import {
  FeeRateType,
  FeeLevel,
  NetworkType,
} from '@faast/payments-common'

import { TestLogger } from '../../../../common/testUtils'

import { hdAccount } from '../fixtures/accounts'
import { HdEthereumPayments, HdErc20Payments, HdErc20PaymentsConfig, EthereumPaymentsFactory } from '../../src'
import { CONTRACT_JSON, CONTRACT_GAS, CONTRACT_BYTECODE } from './fixtures/abi'

const LOCAL_NODE = 'http://localhost'
const LOCAL_PORT = 8545

const logger = new TestLogger('HdErc20PaymentsTest')

const factory = new EthereumPaymentsFactory()

const source = hdAccount.child0Child[0]

const tokenIssuer =  {
  address: '0xFDc7C2aeba72D3F4689f995698eC44bcdfa854e8',
  keys: {
    prv: '0xfabbf3c5bffd9c3cebe86fb82ce7618026c59ce3ba6933bae00758e6ca22434c',
    pub: '03e1d562c90ab342dcc26b0c3edf1b197cfe39247d34790f7e37e7d45ebd0f2204'
  },
  xkeys: {
    xprv: 'xprv9s21ZrQH143K2taFwpecdwEgNBPPg9oCqt6ArwNTZiMsMyyKP3mc3iaX9SQ2MzFiGEkg9MaWXhuDgpfeF8fjLLvJqmukSza3FWiJTjosuZt',
    xpub: 'xpub661MyMwAqRbcFNej3rBd15BQvDDt5cX4D71mfKn583trEnJTvb5rbWtzzjBZvkArdXe1T8EfE3QEDnkzPP7KnPugw2AVAMXCnA4ZTJh5uXo'
  }
}

const tokenDistributor = {
  address: '0x01bB0FddED631A75f841e4b3C493D4dd345D5f7D',
  keys: {
    prv: '0xb55f2052f607b60b59e07687649a8c738b595896c199d582e7db9b15ace79d9a',
    pub: '038bd304e7cc1aa621d63046ce009f15e1bdb8ec3b7cbc65e52917f5870ddb0208'
  },
  xkeys: {
    xprv: 'xprvA4fxH9H85rukQz1TJmhQcDvdKLMG3fENZ3gbkX7yC9zpNaUkEuUswakGmq97Lc7JYrSSGpC7G7h6tiaEx5qwqqGFMRmqkfMzgJzRkp4PXmN',
    xpub: 'xpub6HfJgep1vEU3dU5vQoEQyMsMsNBkT7xDvGcCYuXakVXoFNotnSo8VP4kd7oKgpqdELukHnSgh2SdUsfutaS1TwLZ6S6L71hjfZnEdP2n1Jv'
  }
}

const target = { address: '0x62b72782415394f1518da5ec4de6c4c49b7bf854'} // payport 1

let TOKEN_CONFIG = {
  network: NetworkType.Testnet,
  fullNode: `${LOCAL_NODE}:${LOCAL_PORT}`,
  parityNoe: 'none',
  gasStation: 'none',
  hdKey: tokenIssuer.xkeys.xprv,//hdAccount.root.KEYS.xprv,
  logger,
  abi: CONTRACT_JSON,
  tokenAddress: '',
  decimals: 7,
  depositKeyIndex: 0,
}

let hd: HdErc20Payments
let HD_CONFIG = {
  network: NetworkType.Testnet,
  fullNode: `${LOCAL_NODE}:${LOCAL_PORT}`,
  parityNoe: 'none',
  gasStation: 'none',
  hdKey: hdAccount.root.KEYS.xprv,
  logger,
  tokenAddress: '',
  decimals: 7,
  depositKeyIndex: 0,
}

jest.setTimeout(100000)
describe('end to end tests', () => {
  let ethNode: any
  beforeAll(async () => {
    const ganacheConfig = {
      accounts: [
        {
          balance: 0xde0b6b3a764000, // 1 ETH
          secretKey: tokenDistributor.keys.prv
        },
        {
          balance: 0xde0b6b3a764000, // 1 ETH
          secretKey: source.keys.prv
        },
      ], gasLimit: '0x9849ef',// 9980399
      callGasLimit: '0x9849ef',// 9980399
    }

    ethNode = server.server(ganacheConfig)
    ethNode.listen(LOCAL_PORT)
  })

  afterAll(() => {
    ethNode.close()
  })


  describe('HD payments', () => {

    test('deploy erc20 contract and send funds from distribution account to hd', async () => {
      let ethereumHD = new HdEthereumPayments(TOKEN_CONFIG)

      // deploy erc20 contract
      // default to 0 (depositKeyIndex) is source.address
      const unsignedContractDeploy = await ethereumHD.createServiceTransaction(undefined, { data: CONTRACT_BYTECODE, gas: CONTRACT_GAS })
      const signedContractDeploy = await ethereumHD.signTransaction(unsignedContractDeploy)
      const deployedContract = await ethereumHD.broadcastTransaction(signedContractDeploy)
      const contractInfo = await ethereumHD.getTransactionInfo(deployedContract.id)
      const data: any = contractInfo.data
      const contractAddress = data.contractAddress

      const tokenHD = factory.forConfig({
        ...TOKEN_CONFIG,
        tokenAddress: contractAddress,
      } as HdErc20PaymentsConfig)

      const unsignedTx = await tokenHD.createTransaction(0, { address: source.address }, '6500000000')
      const signedTx = await tokenHD.signTransaction(unsignedTx)
      const broadcastedTx = await tokenHD.broadcastTransaction(signedTx)

      HD_CONFIG.tokenAddress = contractAddress
      hd = factory.forConfig(HD_CONFIG as HdErc20PaymentsConfig)

      const { confirmedBalance: confirmedDistributorBalance } = await hd.getBalance(tokenDistributor.address)
      // leftovers after tx
      expect(confirmedDistributorBalance).toEqual('500000000')
      // source is 0
      const { confirmedBalance: confirmedSourceBalance } = await hd.getBalance(source.address)
      expect(confirmedSourceBalance).toEqual('6500000000')
    })

    let depositAddresses: Array<string> = []
    test('DeployDepositAddress payments', async () => {
      for (let i = 0; i < 10; i++) {
        const unsignedTx = await hd.createServiceTransaction()
        const signedTx = await hd.signTransaction(unsignedTx)
        const broadcastedTx = await hd.broadcastTransaction(signedTx)
        const txInfo = await hd.getTransactionInfo(broadcastedTx.id)

        const { address } = await hd.getPayport(0)

        expect(txInfo)
        const data: any = txInfo.data
        expect(data.from).toEqual(address.toLowerCase())
        depositAddresses.push(data.contractAddress)

        const { confirmedBalance } = await hd.getBalance(data.contractAddress)
        expect(confirmedBalance).toEqual('0')
      }
    })

    test('normal transaction to deposit address', async () => {
      const destination = depositAddresses[0]

      const preBalanceSource = await hd.getBalance(source.address)
      const preConfig = hd.getFullConfig()

      const unsignedTx = await hd.createTransaction(0, { address: destination }, '163331000')
      const signedTx = await hd.signTransaction(unsignedTx)

      const broadcastedTx = await hd.broadcastTransaction(signedTx)
      const txInfo = await hd.getTransactionInfo(broadcastedTx.id)

      const { confirmedBalance: balanceSource } = await hd.getBalance(source.address)
      const { confirmedBalance: balanceTarget } = await hd.getBalance(destination)

      expect(balanceTarget).toEqual('163331000')
      expect(balanceSource).toEqual('6336669000')
      expect(preConfig).toEqual(hd.getFullConfig())
      expect(txInfo.amount).toEqual('163331000')
    })

    test('sweep transaction', async () => {
      // can sweep only from txs to which we had deposit?
      const destination = depositAddresses[1]

      const unsignedTx = await hd.createSweepTransaction(depositAddresses[0], { address: destination })
      const signedTx = await hd.signTransaction(unsignedTx)

      const broadcastedTx = await hd.broadcastTransaction(signedTx)

      const { confirmedBalance: balanceSource } = await hd.getBalance(depositAddresses[0])
      const { confirmedBalance: balanceTarget } = await hd.getBalance(destination)

      expect(balanceSource).toEqual('0')
      expect(balanceTarget).toEqual('163331000')
    })

    test('sweep from hot wallet', async () => {
      const destination = depositAddresses[1]

      const unsignedTx = await hd.createSweepTransaction(0, { address: destination })
      const signedTx = await hd.signTransaction(unsignedTx)

      const broadcastedTx = await hd.broadcastTransaction(signedTx)
      const txInfo = await hd.getTransactionInfo(broadcastedTx.id)

      const { confirmedBalance: balanceSource } = await hd.getBalance(0)
      const { confirmedBalance: balanceTarget } = await hd.getBalance(destination)

      expect(balanceSource).toEqual('0')
      expect(balanceTarget).toEqual('6500000000')
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
  })
})
