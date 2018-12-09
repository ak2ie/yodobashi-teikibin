import { PRODUCT_DATA_KEY, parseToStringDateProductData, parseToProductData } from './common';
import * as moment from 'moment';
import { rejects } from 'assert';

const DEFAULT_DATE_FORMAT = 'YYYY/MM/DD HH:mm:ss';

/**
 * datastoreからデータを取得する
 * @param key 取得するデータのキー
 */
export const getDataFromStorage = (key: string[]) => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(key, (data: { [key: string]: any }) => {
            if (chrome.runtime.lastError) {
                reject();
            }

            if (key.indexOf(PRODUCT_DATA_KEY) !== -1) {
                for (let index = 0; index < data[PRODUCT_DATA_KEY].length; index++) {
                    data[PRODUCT_DATA_KEY][index] = parseToProductData(data[PRODUCT_DATA_KEY][index]);
                }
            }
            resolve(data);
        });
    });
};

/**
 * datastoreにデータを保存する
 * @param data 保存したいデータ
 */
export const saveDataToStorage = (data: { [key: string]: any }) => {
    return new Promise((resolve, reject) => {
        if (PRODUCT_DATA_KEY in data) {
            for (let index = 0; index < data[PRODUCT_DATA_KEY].length; index++) {
                data[PRODUCT_DATA_KEY][index] = parseToStringDateProductData(data[PRODUCT_DATA_KEY][index]);
            }
        }
        chrome.storage.sync.set(data, () => {
            if (chrome.runtime.lastError) {
                reject();
            }
            resolve();
        });
    });
};