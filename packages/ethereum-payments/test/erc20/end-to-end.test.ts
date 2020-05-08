import BigNumber from 'bignumber.js'
import server from 'ganache-core'
import {
  FeeRateType,
  FeeLevel,
  NetworkType,
} from '@faast/payments-common'

import { TestLogger } from '../../../../common/testUtils'

import Erc20PaymentsFactory from '../../src/erc20//Erc20PaymentsFactory'
import { hdAccount } from '../fixtures/accounts'
import { deriveSignatory } from '../../src/bip44'
import { CONTRACT_JSON, CONTRACT_GAS, TOKEN_ABI } from './fixtures/abi'

const LOCAL_NODE = 'http://localhost'
const LOCAL_PORT = 8545

const logger = new TestLogger('HdErc20PaymentsTest')

const factory = new Erc20PaymentsFactory()

const source = hdAccount.child0Child[0]
const target = { address: '0x62b72782415394f1518da5ec4de6c4c49b7bf854'} // payport 1

let hd: any
let HD_CONFIG = {
  network: NetworkType.Testnet,
  fullNode: `${LOCAL_NODE}:${LOCAL_PORT}`,
  parityNoe: 'none',
  gasStation: 'none',
  hdKey: hdAccount.root.KEYS.xprv,
  logger,
  contractAddres: '',
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
        secretKey: source.keys.prv
      },
    ], gasLimit: '0x9849ef',// 9980399
    callGasLimit: '0x9849ef',// 9980399
  }

    ethNode = server.server(ganacheConfig)
    ethNode.listen(LOCAL_PORT)

    let TOKEN_CONFIG = {
      network: NetworkType.Testnet,
      fullNode: `${LOCAL_NODE}:${LOCAL_PORT}`,
      parityNoe: 'none',
      gasStation: 'none',
      hdKey: hdAccount.root.KEYS.xprv,
      logger,
      abi: CONTRACT_JSON,
      contractAddres: '',
      decimals: 7,
      depositKeyIndex: 0,
    }

    let tokenHD = factory.forConfig(TOKEN_CONFIG)

    // deploy contract
    // 0 is source.address
    const unsignedContractDeploy = await tokenHD.createDepositTransaction({ data: TOKEN_ABI, gas: CONTRACT_GAS })
    const signedContractDeploy = await tokenHD.signTransaction(unsignedContractDeploy)
    const deployedContract = await tokenHD.broadcastTransaction(signedContractDeploy)
    const contractInfo = await tokenHD.getTransactionInfo(deployedContract.id)
    const data: any = contractInfo.data
    const contractAddress = data.contractAddress

    HD_CONFIG.contractAddres = contractAddress
    hd = factory.forConfig(HD_CONFIG)

    // source is 0
    const { confirmedBalance } = await hd.getBalance(source.address)
    expect(confirmedBalance).toEqual('7000000000')
  })

  afterAll(() => {
    ethNode.close()
  })


  describe('HD payments', () => {
    let depositAddresses: Array<string> = []
    test('DeployDepositAddress payments', async () => {
      for (let i = 0; i < 10; i++) {
        const unsignedTx = await hd.createDepositTransaction()
        const signedTx = await hd.signTransaction(unsignedTx)
        const broadcastedTx = await hd.broadcastTransaction(signedTx)
        const txInfo = await hd.getTransactionInfo(broadcastedTx.id)

        const { address } = await hd.getPayport(0)

        expect(txInfo)
        const data: any = txInfo.data
        expect(data.from).toEqual(address)
        depositAddresses.push(data.contractAddress)

        const { confirmedBalance } = await hd.getBalance(data.contractAddress)
        expect(confirmedBalance).toEqual('0')
      }
    })

    test('normal transaction to deposit address', async () => {
      const destination = depositAddresses[0]

      const preBalanceSource = await hd.getBalance(source.address)

      const unsignedTx = await hd.createTransaction(0, { address: destination }, '163331000')
      const signedTx = await hd.signTransaction(unsignedTx)

      const broadcastedTx = await hd.broadcastTransaction(signedTx)

      const { confirmedBalance: balanceSource } = await hd.getBalance(source.address)
      const { confirmedBalance: balanceTarget } = await hd.getBalance(destination)

      expect(balanceTarget).toEqual('163331000')
      expect(balanceSource).toEqual('6836669000')
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
