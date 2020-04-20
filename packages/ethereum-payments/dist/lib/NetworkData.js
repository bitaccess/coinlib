import * as request from 'request-promise-native';
import { BigNumber } from 'bignumber.js';
import Web3 from 'web3';
import { DEFAULT_GAS_PRICE_IN_WEI, GAS_STATION_URL, SPEED, PRICES, } from './constants';
export class NetworkData {
    constructor(gasStationUrl = GAS_STATION_URL, parityUrl, infuraUrl) {
        this.gasStationUrl = gasStationUrl;
        this.parityUrl = parityUrl;
        this.infuraUrl = infuraUrl;
        this.eth = (new Web3(infuraUrl)).eth;
    }
    async getNetworkData(action, from, to, speed) {
        const pricePerGasUnit = await this.getGasPrice(speed);
        const nonce = await this.getNonce(from);
        const amountOfGas = await this.estimateGas(from, to, action);
        return {
            pricePerGasUnit,
            amountOfGas,
            nonce,
        };
    }
    async getNonce(address) {
        const web3Nonce = await this.getWeb3Nonce(address) || '0';
        const parityNonce = await this.getParityNonce(address) || '0';
        const nonce = BigNumber.maximum(web3Nonce, parityNonce);
        return nonce.toNumber() ? nonce.toString() : '0';
    }
    async getGasPrice(speed) {
        let gasPrice = await this.getGasStationGasPrice(speed);
        if (gasPrice)
            return gasPrice;
        gasPrice = await this.getWeb3GasPrice();
        if (gasPrice)
            return gasPrice;
        return DEFAULT_GAS_PRICE_IN_WEI;
    }
    async estimateGas(from, to, action) {
        let gas = PRICES[action];
        if (gas)
            return gas;
        try {
            gas = new BigNumber(await this.eth.estimateGas({ from, to }));
        }
        catch (e) {
            return PRICES.ETHEREUM_TRANSFER;
        }
        return gas.toNumber() ? gas.toString() : PRICES.ETHEREUM_TRANSFER;
    }
    async getWeb3Nonce(address) {
        try {
            const nonce = await this.eth.getTransactionCount(address, 'pending');
            return (new BigNumber(nonce)).toString();
        }
        catch (e) {
            return '';
        }
    }
    async getParityNonce(address) {
        const data = {
            method: 'parity_nextNonce',
            params: [address],
            id: 1,
            jsonrpc: '2.0'
        };
        const options = {
            url: this.parityUrl || '',
            json: data
        };
        let body;
        try {
            body = await request.post(options);
        }
        catch (e) {
            return '';
        }
        if (!body || !body.result) {
            return '';
        }
        return (new BigNumber(body.result, 16)).toString();
    }
    async getGasStationGasPrice(speed) {
        const options = {
            url: `${this.gasStationUrl}/json/ethgasAPI.json`,
            json: true,
            timeout: 5000
        };
        let body;
        try {
            body = await request.get(options);
        }
        catch (e) {
            return '';
        }
        if (!(body && body.blockNum && body[SPEED[speed]])) {
            return '';
        }
        const price10xGwei = body[SPEED[speed]];
        return (new BigNumber(price10xGwei)).dividedBy(10).multipliedBy(1e9).toString(10);
    }
    async getWeb3GasPrice() {
        try {
            return await this.eth.getGasPrice();
        }
        catch (e) {
            return '';
        }
    }
}
//# sourceMappingURL=NetworkData.js.map