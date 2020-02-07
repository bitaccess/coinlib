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

const LOCAL_NODE = 'http://localhost'
const LOCAL_PORT = 8545

const logger = new TestLogger('HdEthereumPaymentsTest')

const factory = new EthereumPaymentsFactory()

const HD_CONFIG = {
  network: NetworkType.Testnet,
  fullNode: `${LOCAL_NODE}:${LOCAL_PORT}`,
  hdKey: hdAccount.rootChild[1].xkeys.xprv,
  logger,
}

const ganacheConfig = {
  accounts: [
    {
      balance: 0xde0b6b3a7640000, // 1 ETH
      secretKey: hdAccount.child1Child[1].keys.prv
    },
    {
      balance: 0x0,
      secretKey: hdAccount.child0Child[0].keys.prv
    },
  ],
}

const source = hdAccount.child1Child[1]
const target = hdAccount.child0Child[0]

const hd = factory.forConfig(HD_CONFIG)
let expectedBalance: string

jest.setTimeout(100000)
describe('end to end tests', () => {
  let ethNode: any
  beforeAll(() => {
    ethNode = server.server(ganacheConfig)
    ethNode.listen(LOCAL_PORT)
  })

  afterAll(() => {
    ethNode.close()
  })

  describe('HD payments', () => {
    test('normal transaction', async () => {
      const unsignedTx = await hd.createTransaction(1, { address: target.address }, '0.5', {
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
        sweepable: true
      })
      expect(balanceTarget).toStrictEqual({
        confirmedBalance: '0.5',
        unconfirmedBalance: '0',
        sweepable: true
      })
    })

    test('sweep transaction', async () => {
      const unsignedTx = await hd.createSweepTransaction(1, { address: target.address })
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
        sweepable: false
      })
      expect(balanceTarget).toStrictEqual({
        confirmedBalance: expectedSweepedBalance,
        unconfirmedBalance: '0',
        sweepable: true
      })
    })
  })
})
