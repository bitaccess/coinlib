import BigNumber from 'bignumber.js'
import server from 'ganache-core'
import {
  FeeRateType,
  FeeLevel,
  NetworkType,
} from '@faast/payments-common'

import { TestLogger } from '../../../common/testUtils'

import EthereumPaymentsFactory from '../src/EthereumPaymentsFactory'
import { hdAccount } from './fixtures/accounts'
import { deriveSignatory } from '../src/bip44'

const LOCAL_NODE = 'http://localhost'
const LOCAL_PORT = 8545

const logger = new TestLogger('HdEthereumPaymentsTest')

const factory = new EthereumPaymentsFactory()

const HD_CONFIG = {
  network: NetworkType.Testnet,
  fullNode: `${LOCAL_NODE}:${LOCAL_PORT}`,
  hdKey: hdAccount.root.KEYS.xprv,
  logger,
}

const source = hdAccount.child0Child[0]
const target = deriveSignatory()

const hd = factory.forConfig(HD_CONFIG)

let expectedBalance: string

jest.setTimeout(100000)
describe('end to end tests', () => {
  let ethNode: any
  beforeAll(async () => {
  const ganacheConfig = {
    accounts: [
      {
        balance: 0xde0b6b3a7640000, // 1 ETH
        secretKey: source.keys.prv
      },
      {
        balance: 0x0,
        secretKey: target.keys.prv
      },
    ],
  }


    ethNode = server.server(ganacheConfig)
    ethNode.listen(LOCAL_PORT)
  })

  afterAll(() => {
    ethNode.close()
  })


  describe('HD payments', () => {
    test('normal transaction', async () => {
      const unsignedTx = await hd.createTransaction(0, { address: target.address }, '0.5', {
        sequenceNumber: 0
      })
      const signedTx = await hd.signTransaction(unsignedTx)
      expectedBalance = (new BigNumber(1.0))
        .minus(0.5)
        .minus(signedTx.fee)
        .toString()

      const broadcastedTx = await hd.broadcastTransaction(signedTx)

      const balanceSource = await hd.getBalance(source.address)
      const balanceTarget = await hd.getBalance(target.address)

      expect(balanceSource).toStrictEqual({
        confirmedBalance: expectedBalance,
        unconfirmedBalance: '0',
        spendableBalance: expectedBalance,
        sweepable: true,
        unactivated: false,
      })
      expect(balanceTarget).toStrictEqual({
        confirmedBalance: '0.5',
        unconfirmedBalance: '0',
        spendableBalance: '0.5',
        sweepable: true,
        unactivated: false,
      })
    })

    test('sweep transaction', async () => {
      const unsignedTx = await hd.createSweepTransaction(0, { address: target.address })
      const signedTx = await hd.signTransaction(unsignedTx)
      const expectedSweepedBalance = (new BigNumber(expectedBalance))
        .plus('0.5')
        .minus(signedTx.fee)
        .toString()

      const broadcastedTx = await hd.broadcastTransaction(signedTx)

      const balanceSource = await hd.getBalance(source.address)
      const balanceTarget = await hd.getBalance(target.address)

      expect(balanceSource).toStrictEqual({
        confirmedBalance: '0',
        unconfirmedBalance: '0',
        spendableBalance: '0',
        sweepable: false,
        unactivated: false,
      })
      expect(balanceTarget).toStrictEqual({
        confirmedBalance: expectedSweepedBalance,
        unconfirmedBalance: '0',
        spendableBalance: expectedSweepedBalance,
        sweepable: true,
        unactivated: false,
      })
    })

    test('can get balance of unused address', async () => {
      expect(await hd.getBalance(12345678)).toEqual({
        confirmedBalance: '0',
        unconfirmedBalance: '0',
        spendableBalance: '0',
        sweepable: false,
        unactivated: false,
      })
    })
  })
})
