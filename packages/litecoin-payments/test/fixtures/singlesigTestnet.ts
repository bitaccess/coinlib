import { AddressType } from '../../src'
export default {
  [AddressType.Legacy]: {
    xpub: 'tpubDCz5wky3psxq4G8Qi2Sjv1wez22YuX3H58EdEznYzdBmeYbRfRAA7535igwfwzpSuEJVQfLKeq2VbdAQPC5x9hUUo1nceqMV3gg8z3xXEfC',
    sweepTxSize: 192,
    addresses: {
      0: 'n3wgJ2rTxYRztj7beStr1rpAjzDNpEqLwQ',
      5: 'mmYniFoqjwGcccQrtzvYEo12ZWXzRPjhD4',
      6: 'mwPtwGYknwZJCdr3s6XWpkiZDD7Cc3g4db',
      7: 'mzf5eD6daCgRkNrfA7jfJeriv17Sza7DU1',
      8: 'mgqpJcg7xFcips6QEf6csXwJfayRvef31K',
    },
  },
  [AddressType.SegwitP2SH]: {
    xpub: 'tpubDC5hys6ovnQBcSQRZqTqqL3GTFR9DsqwYikdRkgnSUzpZEBtLmKLat5E7ajDx2XcSetWYF4pGnzHMGV8PzzhHRYu8CWd15i68rXfaZhvcQ5',
    sweepTxSize: 133,
    addresses: {
      0: '2MtMKaY4zqBCDWj779hRxLBQTsu6CUzB2QV',
      5: '2NBTG7rKa7hUAkvPbyvFnGAzkeWgG46DN3U',
      6: '2N28wafqcqe2TpE851x1Vom5and13sKxkxt',
      7: '2N53QmVdZQCT6QtJr1izS1pfGezwvcGytWN',
      8: '2N1SWMZwDgX6cvbRZgvsBUPfWjAxBLH3n6A',
    },
  },
  [AddressType.SegwitNative]: {
    xpub: 'tpubDCZ6govMJByz66aB6pf1khYtKCNEJ5oSeoKuqisRZmiMaiM379vjgoVSPh1Xzc9ksgpZXbxipvKPA9mEFSv2oimtECKse8w9zWuw5VE7ZRk',
    sweepTxSize: 109,
    addresses: {
      0: 'litecointestnet1qg74w9nz40sks6l6xga2rqqfwc9jp2zv4l8a6a6',
      5: 'litecointestnet1q9e95sfgdf57qmpw4vhualgcgt76duy3adwplw9',
      6: 'litecointestnet1qdq5m72h0nxdgpv6ka24fupwkxapm336lhtth4p',
      7: 'litecointestnet1quc08hfq6usrwm9p4zv9k04ml6l50pp4andme3t',
      8: 'litecointestnet1qt508qz0266pl9ssf8nt5xsdsywsz0v7tw4vp0m',
    },
  }
}
