import { EthereumPaymentsFactory } from '../src/EthereumPaymentsFactory'
import { HdEthereumPayments } from '../src/HdEthereumPayments'
import { KeyPairEthereumPayments } from '../src/KeyPairEthereumPayments'
import { HdEthereumPaymentsConfig, KeyPairEthereumPaymentsConfig } from '../src/types'

import { hdAccount } from './fixtures/accounts'
import { deriveSignatory } from '../src/bip44'

describe('EthereumPaymentsFactory', () => {
  const factory = new EthereumPaymentsFactory()
  it('should instantiate HdEthereumPayments', () => {
    const config: HdEthereumPaymentsConfig = { hdKey: hdAccount.rootChild[0].xkeys.xprv }
    const hdP = factory.forConfig(config)

    expect(hdP).toBeInstanceOf(HdEthereumPayments)
    expect(hdP.getPublicConfig()).toStrictEqual({
      depositKeyIndex: 0,
      hdKey: deriveSignatory(hdAccount.rootChild[0].xkeys.xpub, 0).xkeys.xpub
    })
  })

  it('should instantiate KeyPairEthereumPayments', () => {
    const config: KeyPairEthereumPaymentsConfig = {
      keyPairs: [ hdAccount.rootChild[0].xkeys.xprv, hdAccount.rootChild[0].keys.prv, hdAccount.rootChild[0].address ]
    }
    const kP = factory.forConfig(config)

    expect(kP).toBeInstanceOf(KeyPairEthereumPayments)
    expect(kP.getPublicConfig()).toStrictEqual({
      keyPairs: { 0: hdAccount.rootChild[0].address }
    })
  })

  it('should fail to instantiate unrecognized config', () => {
    expect(() => factory.forConfig({} as any)).toThrow('Cannot instantiate ethereum payments for unsupported config')
  })
})
