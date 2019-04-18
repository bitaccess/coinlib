export var TRX_FEE_FOR_TRANSFER = Number.parseInt(process.env.TRX_FEE_FOR_TRANSFER || '1000');
export var TRX_FEE_FOR_TRANSFER_SUN = TRX_FEE_FOR_TRANSFER * 100;
export var DEFAULT_FULL_NODE = process.env.TRX_FULL_NODE_URL || 'http://54.236.37.243:8090';
export var DEFAULT_SOLIDITY_NODE = process.env.TRX_SOLIDITY_NODE_URL || 'http://47.89.187.247:8091';
export var DEFAULT_EVENT_SERVER = process.env.TRX_EVENT_SERVER_URL || 'https://api.trongrid.io';
export var DEFAULT_MAX_ADDRESS_SCAN = 10;
//# sourceMappingURL=constants.js.map