import fs from 'fs'
import path from 'path'
import { omit } from 'lodash'
import { Transaction } from 'tronweb'
import {
  HdTronPayments,
  UHdTronPayments,
  TronTransactionInfo,
  HdTronPaymentsConfig,
  UHdTronPaymentsConfig,
  TronUnsignedTransaction,
} from '../src'
import { txInfo_209F8, signedTx_valid, txInfo_a0787, signedTx_invalid } from './fixtures/transactions'
import { hdAccount } from './fixtures/accounts'
import { delay, logger } from './utils'

const { XPUB, ADDRESSES } = hdAccount
const EXTERNAL_ADDRESS = 'TW22XzVixyFZU5DxQJwxqXuKfNKFNMLqJ2'
const SECRET_XPRV_FILE = 'test/keys/mainnet.key'

const rootDir = path.resolve(__dirname, '..')
const secretXprvFilePath = path.resolve(rootDir, SECRET_XPRV_FILE)
let secretXprv = ''
if (fs.existsSync(secretXprvFilePath)) {
  secretXprv = fs
    .readFileSync(secretXprvFilePath)
    .toString('utf8')
    .trim()
  logger.log(`Loaded ${SECRET_XPRV_FILE}. Send and sweep tests enabled.`)
} else {
  logger.log(
    `File ${SECRET_XPRV_FILE} missing. Send and sweep tests will be skipped. To enable all tests ask Dylan to share the file with you on Lastpass.`,
  )
}

const txInfoOmitEquality = ['data.currentBlock', 'confirmations']
function assertTxInfo(actual: TronTransactionInfo, expected: TronTransactionInfo): void {
  expect(omit(actual, txInfoOmitEquality)).toEqual(omit(expected, txInfoOmitEquality))
}

// Wait for the transaction to expire
export async function waitForExpiration(tx: TronUnsignedTransaction) {
  await delay(Date.now() - (tx.data as Transaction).raw_data.expiration + 100)
}

export function runHardcodedPublicKeyTests(
  tp: HdTronPayments | UHdTronPayments,
  config: HdTronPaymentsConfig | UHdTronPaymentsConfig,
) {
  it('getFullConfig', () => {
    expect(tp.getFullConfig()).toEqual(config)
  })
  it('getPublicConfig', () => {
    expect(tp.getPublicConfig()).toEqual({
      network: config.network,
      hdKey: XPUB,
    })
  })
  it('getAccountIds', () => {
    expect(tp.getAccountIds()).toEqual([XPUB])
  })
  it('getAccountId for index 0', () => {
    expect(tp.getAccountId(0)).toEqual(XPUB)
  })
  it('getAccountId for index 10', () => {
    expect(tp.getAccountId(10)).toEqual(XPUB)
  })
  it('getXpub', async () => {
    expect(tp.getXpub()).toEqual(XPUB)
  })
  it('getPayport for index 1', async () => {
    expect(await tp.getPayport(1)).toEqual({ address: ADDRESSES[1] })
  })
  it('getPayport for high index', async () => {
    expect(await tp.getPayport(10000)).toEqual({ address: ADDRESSES[10000] })
  })
  it('resolvePayport resolves for index 1', async () => {
    expect(await tp.resolvePayport(1)).toEqual({ address: ADDRESSES[1] })
  })
  it('resolvePayport resolves for address', async () => {
    expect(await tp.resolvePayport(ADDRESSES[1])).toEqual({ address: ADDRESSES[1] })
  })
  it('resolvePayport resolves for external address', async () => {
    expect(await tp.resolvePayport(EXTERNAL_ADDRESS)).toEqual({ address: EXTERNAL_ADDRESS })
  })
  it('resolvePayport resolves for payport', async () => {
    const payport = { address: ADDRESSES[1] }
    expect(await tp.resolvePayport(payport)).toEqual(payport)
  })
  it('resolvePayport resolves for payport with index', async () => {
    const payport = { index: 1, address: ADDRESSES[1] }
    expect(await tp.resolvePayport(payport)).toEqual(payport)
  })
  it('resolvePayport throws for invalid address', async () => {
    await expect(tp.resolvePayport('invalid')).rejects.toThrow()
  })
  it('resolveFromTo is correct for (index, index)', async () => {
    expect(await tp.resolveFromTo(0, 2)).toEqual({
      fromAddress: ADDRESSES[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: ADDRESSES[0] },
      toAddress: ADDRESSES[2],
      toIndex: 2,
      toExtraId: undefined,
      toPayport: { address: ADDRESSES[2] },
    })
  })
  it('resolveFromTo is correct for external address', async () => {
    expect(await tp.resolveFromTo(0, EXTERNAL_ADDRESS)).toEqual({
      fromAddress: ADDRESSES[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: ADDRESSES[0] },
      toAddress: EXTERNAL_ADDRESS,
      toIndex: null,
      toExtraId: undefined,
      toPayport: { address: EXTERNAL_ADDRESS },
    })
  })
  it('resolveFromTo is correct for internal address', async () => {
    expect(await tp.resolveFromTo(0, ADDRESSES[2])).toEqual({
      fromAddress: ADDRESSES[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: ADDRESSES[0] },
      toAddress: ADDRESSES[2],
      toIndex: null,
      toExtraId: undefined,
      toPayport: { address: ADDRESSES[2] },
    })
  })
  it('resolveFromTo throws for address as from', async () => {
    await expect(tp.resolveFromTo(EXTERNAL_ADDRESS as any, 0)).rejects.toThrow()
  })

  it('get transaction by hash with a fee', async () => {
    const tx = await tp.getTransactionInfo('209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c')
    assertTxInfo(tx, txInfo_209F8)
  })
  it('get transaction by hash without a fee', async () => {
    const tx = await tp.getTransactionInfo('a078736ab768b34dc06ca9048dddfa73383947aed0d93f1eff2adde4b7254f39')
    assertTxInfo(tx, txInfo_a0787)
  })
  it('fail to get an invalid transaction hash', async () => {
    await expect(tp.getTransactionInfo('123456abcdef')).rejects.toThrow('Transaction not found')
  })

  it('get a balance using xpub and index', async () => {
    expect(await tp.getBalance(1)).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      spendableBalance: '0',
      sweepable: false,
      requiresActivation: false,
      minimumBalance: '0.1',
    })
  })
  it('get a balance using an address', async () => {
    expect(await tp.getBalance({ address: 'TBR4KDPrN9BrnyjienckS2xixcTpJ9aP26' })).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      spendableBalance: '0',
      sweepable: false,
      requiresActivation: false,
      minimumBalance: '0.1',
    })
  })
  it('should not throw for unused address', async () => {
    expect(await tp.getBalance(12345678)).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      spendableBalance: '0',
      sweepable: false,
      requiresActivation: false,
      minimumBalance: '0.1',
    })
  })

  it('broadcast an existing sweep transaction', async () => {
    const result = await tp.broadcastTransaction(signedTx_valid)
    expect(result).toEqual({
      id: signedTx_valid.id,
      rebroadcast: true,
    })
  })
  it('broadcast should fail on invalid tx', async () => {
    await expect(tp.broadcastTransaction(signedTx_invalid)).rejects.toThrow('Transaction has expired')
  })
}
