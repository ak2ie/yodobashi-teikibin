import { TeikiKonyu } from '../app/scripts/background';
import * as moment from 'moment';
import * as COMMON from '../app/scripts/common';
import * as storage from '../app/scripts/storage';
import { advanceTo, clear } from 'jest-date-mock';

const s = jest.mock('../app/scripts/storage');

describe('バックグラウンド', () => {
    afterEach(() => {
        clear();
    });

    xit('定期購入商品チェック', async () => {
        const dataFromStorage = {
            ProductData: [{
                id: 9999,
                name: 'test',
                buyNum: 3,
                buyInterval: 1,
                nextBuyDate: moment(new Date('2018-10-11T21:09:10')).toISOString(true), // Storageには文字列で保存されている
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false
            }]
        };
        chrome.storage.sync.get.mockImplementation((key, callback) => {
            callback(dataFromStorage);
        });
        const teikiKonyu = new TeikiKonyu();
        await teikiKonyu.order();
        // expect(chrome.tabs.sendMessage.mock.calls[0][0]).toBe(9999);
    });

    it('カート投入商品更新', async () => {
        // 次回購入日 当日
        advanceTo(new Date(2018, 9, 11, 21, 9, 0));

        const dataFromStorage = {
            ProductData: [{
                id: '9999',
                name: 'test',
                buyNum: 3,
                buyInterval: 1,
                nextBuyDate: moment(new Date('2018-10-11T21:09:10+09:00')).toDate(),
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false,
                lastBuyDate: moment(new Date('2018-09-11T21:09:10+09:00')).toDate()
            }]
        };

        const expectedData = {
            ProductData: [{
                id: '9999',
                name: 'test',
                buyNum: 3,
                buyInterval: 1,
                nextBuyDate: moment(new Date('2018-11-11T21:09:00')).toDate(), // 今日 + buyInterval後に更新
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false,
                lastBuyDate: new Date() // 今日に更新
            }]
        };

        jest.spyOn(storage, 'getDataFromStorage').mockImplementation(() => {
            return dataFromStorage;
        });

        jest.spyOn(storage, 'saveDataToStorage').mockImplementation((arg) => {
            if ('ProductData' in arg) {
                expect(arg).toEqual(expectedData);
            }
        });

        const teikiKonyu = new TeikiKonyu();
        const product = new COMMON.PutInCartProductData('https://www.yodobashi.com/product/9999/', true);
        await teikiKonyu.updatePutInCartProduct(product);
    });

    it('既存データ更新（前回購入日 設定済）', async () => {
        const dataFromStorage = {
            ProductData: [{
                id: '9999',
                name: 'test',
                buyNum: 3,
                buyInterval: 1,
                nextBuyDate: moment(new Date('2018-10-11T21:09:10+09:00')).toDate(), // Storageには文字列で保存されている
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false,
                lastBuyDate: moment(new Date('2018-09-11T21:09:10+09:00'))
            }]
        };

        const expectedData = {
            ProductData: [{
                id: '9999',
                name: 'test',
                buyNum: 1,
                buyInterval: 2,
                // 今日 + buyInterval 月後ではなく、lastBuyDate + buyInterval月後の日付
                nextBuyDate: moment(new Date('2018-11-11T21:09:10+09:00')).toDate(), // Storageには文字列で保存されている
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false,
                lastBuyDate: moment(new Date('2018-09-11T21:09:10+09:00'))
            }]
        };

        advanceTo(new Date('2018-10-12T09:00:00+09:00'));

        jest.spyOn(storage, 'getDataFromStorage').mockImplementation(() => {
            return dataFromStorage;
        });

        jest.spyOn(storage, 'saveDataToStorage').mockImplementation((arg) => {
            expect(arg).toEqual(expectedData);
        });

        const teikiKonyu = new TeikiKonyu();
        // 購入個数（3 -> 1）、購入頻度(1ヶ月 -> 2ヶ月)、次回購入日を更新
        await teikiKonyu.register(new COMMON.ProductDataForMessage(
            '9999',
            'test',
            1,
            2,
            '2018-10-11T21:09:10+09:00',
            COMMON.BuyType.Indivisual,
            false,
            false,
            '2018-09-11T21:09:10+09:00'
        ));
    });

    it('既存データ更新（前回購入日 未設定）', async () => {
        const dataFromStorage = {
            ProductData: [{
                id: '9999',
                name: 'test',
                buyNum: 3,
                buyInterval: 1,
                nextBuyDate: moment(new Date('2018-10-11T21:09:10+09:00')).toDate(), // Storageには文字列で保存されている
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false,
                lastBuyDate: moment(new Date('9999-12-31T00:00:00+09:00'))
            }]
        };

        const expectedData = {
            ProductData: [{
                id: '9999',
                name: 'test',
                buyNum: 1,
                buyInterval: 2,
                // 前回購入日未設定のため、今日 + buyInterval 月後
                nextBuyDate: moment(new Date('2018-12-12T09:00:00+09:00')).toDate(), // Storageには文字列で保存されている
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false,
                lastBuyDate: moment(new Date('9999-12-31T00:00:00+09:00'))
            }]
        };

        advanceTo(new Date('2018-10-12T09:00:00+09:00'));

        jest.spyOn(storage, 'getDataFromStorage').mockImplementation(() => {
            return dataFromStorage;
        });

        jest.spyOn(storage, 'saveDataToStorage').mockImplementation((arg) => {
            expect(arg).toEqual(expectedData);
        });

        const teikiKonyu = new TeikiKonyu();
        // 購入個数（3 -> 1）、購入頻度(1ヶ月 -> 2ヶ月)、次回購入日を更新
        await teikiKonyu.register(new COMMON.ProductDataForMessage(
            '9999',
            'test',
            1,
            2,
            '2018-10-11T21:09:10+09:00',
            COMMON.BuyType.Indivisual,
            false,
            false,
            '9999-12-31T00:00:00+09:00'
        ));
    });

    xit('カート投入指示', async () => {
        const dataFromStorage = {
            ProductData: [{
                id: '9999',
                name: 'test',
                buyNum: 1,
                buyInterval: 3,
                nextBuyDate: moment(new Date('2018-10-11T21:09:10+09:00')).toDate(), // Storageには文字列で保存されている
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false,
                lastBuyDate: moment(new Date('9999-12-31T00:00:00+09:00'))
            }]
        };

        const expectedData = {
            type: COMMON.PUT_IN_CART,
            data: {
                buyNum: 1
            }
        };

        jest.spyOn(storage, 'getDataFromStorage').mockImplementation(() => {
            return dataFromStorage;
        });

        const teikiKonyu = new TeikiKonyu();
        await teikiKonyu.putInCart({
            url: 'http://www.yodobashi.com/product/9999/?teikibin=true'
        });

        // expect(chrome.tabs.sendMessage.mock.calls[0][1]).toEqual(expectedData);
    });

    xit('カート投入通知', async () => {
        const dataFromStorage = {
            ProductData: [{
                id: '9999',
                name: 'test',
                buyNum: 1,
                buyInterval: 3,
                nextBuyDate: moment(new Date('2018-10-11T21:09:10+09:00')).toDate(), // Storageには文字列で保存されている
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false,
                lastBuyDate: moment(new Date('9999-12-31T00:00:00+09:00'))
            }]
        };

        const expectedData = {
            type: COMMON.PUT_IN_CART,
            data: {
                buyNum: 1
            }
        };

        jest.spyOn(storage, 'getDataFromStorage').mockImplementation(() => {
            return dataFromStorage;
        });


        const teikiKonyu = new TeikiKonyu();
        await teikiKonyu.order();

        expect(chrome.storage.sync.set.mock.calls[0][0]).toEqual(expectedData);
    });
});