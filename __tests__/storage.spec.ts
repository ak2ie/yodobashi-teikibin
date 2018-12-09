import { saveDataToStorage, getDataFromStorage } from '../app/scripts/storage';
import * as COMMON from '../app/scripts/common';
import * as moment from 'moment';

describe('保存', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('通常', async () => {
        const data = {
            key: 'data3'
        };

        await saveDataToStorage(data);
        expect(chrome.storage.sync.set.mock.calls[0][0]).toEqual(data);
    });

    it('商品情報', async () => {
        const data = {
            ProductData: [{
                id: 9999,
                name: 'test',
                buyNum: 3,
                buyInterval: 1,
                nextBuyDate: new Date('2018-10-11T21:09:10'),
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false,
                lastBuyDate: new Date('2018-12-23T08:11:23')
            }]
        };

        const expected = {
            ProductData: [{
                id: 9999,
                name: 'test',
                buyNum: 3,
                buyInterval: 1,
                nextBuyDate: '2018-10-11T21:09:10.000+09:00', // Dateはstringに変換される
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false,
                lastBuyDate: '2018-12-23T08:11:23.000+09:00' // Dateはstringに変換される
            }]
        };

        await saveDataToStorage(data);
        expect(chrome.storage.sync.set.mock.calls[0][0]).toEqual(expected);
    });
});

describe('取得', () => {
    it('商品情報以外', async () => {
        const dataFromStorage = { test: 'OK' };
        chrome.storage.sync.get.mockImplementation((key, callback) => { callback(dataFromStorage); });
        const openedData = await getDataFromStorage(['test']);

        expect(openedData).toEqual(dataFromStorage);
    });

    it('商品情報', async () => {
        const dataFromStorage = {
            ProductData: [{
                id: 9999,
                name: 'test',
                buyNum: 3,
                buyInterval: 1,
                nextBuyDate: moment(new Date('2018-10-11T21:09:10')).toISOString(true), // Storageには文字列で保存されている
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false,
                lastBuyDate: moment(new Date('2018-03-22T01:22:24')).toISOString(true), // Storageには文字列で保存されている
            }]
        };

        const returnedValueFromFunc = {
            ProductData: [{
                id: 9999,
                name: 'test',
                buyNum: 3,
                buyInterval: 1,
                nextBuyDate: new Date('2018-10-11T21:09:10'),   // Dateオブジェクトに変換される
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false,
                lastBuyDate: new Date('2018-03-22T01:22:24')
            }]
        };
        chrome.storage.sync.get.mockImplementation((key, callback) => {
            callback(dataFromStorage);
        });
        const openedData = await getDataFromStorage(['ProductData']);

        expect(openedData).toEqual(returnedValueFromFunc);
    });
});