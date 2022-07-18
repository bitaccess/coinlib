import { DEFAULT_DERIVATION_PATH } from '../../src'

export { DEFAULT_DERIVATION_PATH }
export type AccountFixture = {
  xkeys: {
    xprv: string,
    xpub: string
  },
  children: {
    [index: number]: {
      address: string,
      keys: {
        prv: string,
        pub: string,
      }
    }
  }
}

export const DEFAULT_PATH_FIXTURE: AccountFixture = {
  xkeys: {
    xprv: 'xprv9zmyKoBX1c55iUJ4nRsNTkt76uNMv1oeH1ZHXr9WuA78WrDFRZvNrA4mcqdXFuAUT9iQMcz3jTEB6M6NHLfGcznegNzmZgMPF5DkW365Lop',
    xpub: 'xpub6DmKjJiQqydNvxNXtTQNptpqewCrKUXVeEUtLEZ8TVe7PeYPy7EdPxPFU8CgndT4xhowU5QUwjMm9JwanqF12z5n67jY2fd9qQXshybcRaq',
  },
  children: {
    0: {
      address: '0x1dCec4457F145eA1B2FA54B3c4F0A2d81D6a1C92',
      keys: {
        prv: '0x2c1c7f79f455b25b0d687ea4d464f58844a3c2a7ffed1c02a3e224f94ff50517',
        pub: '0x02c5028014e9ee4344319396db6e3f66fc52fb17fb636ff138a6b51a7f419f037b',
      },
    },
    1: {
      address: '0x8f0bb36577B19da9826fC726fEc2b4943c45e014',
      keys: {
        prv: '0x8195f08756bdb4324748d622fc821d9ddc34eb249fe152bba7e5b4539aff9cad',
        pub: '0x0383f4af96bfbb731d2ca34b6c0ce5136980f2fbcc87494b8f46d480f4108ea090',
      },
    }
  }
}

export const CUSTOM_DERIVATION_PATH = "m/44'/666'/5'"
export const CUSTOM_PATH_FIXTURE: AccountFixture = {
  xkeys: {
    xprv: 'xprv9ykjpw1vU9pWxFLFX3sTFnPKUWCBTaF5FGorCePr9RaS1xxR7mgGmUiVqMN7mnhFouuKntTqeT592YcD3S5QYhW3mDLYZNkSJCViZRqimgU',
    xpub: 'xpub6Ck6ESYpJXNpAjQid5QTcvL42Y2fs2xvcVjT12oThm7QtmHZfJzXKH2ygdqkSTycurZpp6HUm7Ucj2CgWPZRso2vdeE2WGH2eoyu1MnpFGd',
  },
  children: {
    0: {
      address: '0xAd7Ae42bD2A205354Ec72C2fEaC07c99d9B95EA5',
      keys: {
        prv: '0xd303dc2222c87c93c45e372d09d9d679e86439744f63c19611dc35ce3ae19fa7',
        pub: '0x033f31704eff6cb98595119a5f786a57062a796b88e280043f6ea62856c7f56d7b',
      }
    },
    1: {
      address: '0x663F6e4E3db1Afce6ac88524DAcbE11841ba7F27',
      keys: {
        prv: '0xf31ef247e5f17e9bd252f0353d137d0ffa67c15e3746f1f9c1f88ffa8f89d226',
        pub: '0x0302e110eb75b37008fac0d535eaf16df00d6ac71201649828f958bc6237757729',
      }
    },
    15: {
      address: '0x526F00d69e8b5617A4893C673F200d760d69897F',
      keys: {
        prv: '0x4d9adf3778c2e9b25580f86d9a1cdfc56dba88e02837c3f5e9af99fc3e4e4a42',
        pub: '0x03d226b0a39ad1788fe46481790b498a88227d2a994d74dea5d43377d27758c5fd',
      }
    },
  }
}

export const BBB_DERIVATION_PATH = "m/44'/888'/0'/0"
export const BBB_PATH_FIXTURE: AccountFixture = {
  xkeys: {
    xpub: 'xpub6EXMcCvrckxdxrjEEbtwLAjQKPbRjnBbkRNpX1Mj1PiCRuvinjJmfiNSaE6Q4VGPGyH7oxGjAYJoqsGuyjMNKj9bmLhQwvhuqLCb4qGBdNh',
    xprv: 'xprvA1Y1ChPxnPQLkNem8aMvy2nfmMkwLKTkPCTDicx7T4BDZ7baFBzX7v3xixXWE3zkqPjAFdxqCDt4fURCndvp6jSZC8J6e214adJYPyoKWCY',
  },
  children: {
    0: {
      address: '0x8c8320d84128f396531A79C9A3C590f07f334756',
      keys: {
        prv: '0xd0c066bbd459568bc2c11cd72f315e2566430788ce8b8717ee33c54f3979c57f',
        pub: '0x034e2b2d670a3a46904474f2c5d494ea12af1e45945c169b17f23303805985b68b',
      }
    }
  }
}

/**
 * The following fixtures were verified using the third party bip32 tool at https://iancoleman.io/bip39/ using the
 * root.KEYS.xprv in the "BIP32 Root Key" field and setting "Coin" to "Ethereum".
 */
export const hdAccount = {
  root: {
    SEED: 'fFwoLowuySpBbmZymT4NzNXgDqxdeGxzQhUr4BqV2GVSBYSiM4LmEmrAgyMaCdeMFD39Tsn8i3vTK8NHRD91Efn',
    KEYS: {
      xprv: 'xprv9s21ZrQH143K2enHCdFUPj1vHf6GMt2CpLYmr7vLjVWZxSyVXY8pEuUMkT4yK3uQ93M5xP4pp8gjgZGmpXrTGQtnS4YLvq4H71rTGcTr4qg',
      xpub: 'xpub661MyMwAqRbcF8rkJenUkrxeqgvkmLk4BZUNeWKxHq3YqFJe55T4nhnqbhjkwfrKjjSqj2uqpuDsTMG8mydy6sE1TSWwCvY7SATvSndEJvd'
    },
  },
  paths: {
    undefined: DEFAULT_PATH_FIXTURE,
    [DEFAULT_DERIVATION_PATH]: DEFAULT_PATH_FIXTURE,
    [CUSTOM_DERIVATION_PATH]: CUSTOM_PATH_FIXTURE,
    [BBB_DERIVATION_PATH]: BBB_PATH_FIXTURE,
  },
}
