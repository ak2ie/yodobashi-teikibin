import { shallow, mount } from 'enzyme';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ProductList } from '../app/scripts/options';
import * as COMMON from '../app/scripts/common';
import * as moment from 'moment';

describe('UI', () => {
    it('商品一覧表 ヘッダ', () => {
        // ダミーデータ準備
        const dummyData = {
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

        chrome.storage.sync.get.mockImplementation((key, callback) => { callback(dummyData); });

        const wrapper = shallow(<ProductList />);
        const thead = wrapper.find('thead').find('tr').find('th');
        expect(thead.at(0).text()).toBe('商品名');
        expect(thead.at(1).text()).toBe('次回購入日');
        expect(thead.at(2).text()).toBe('購入方法');
        expect(thead.at(3).text()).toBe('数量');
        expect(thead.at(4).text()).toBe('購入頻度');
        expect(thead.at(5).text()).toBe('前回注文日');
    });

    xit('商品一覧表 内容', async () => {
        // ダミーデータ準備
        const dummyData = {
            ProductData: [{
                id: 9999,
                name: 'テスト商品名',
                buyNum: 3,
                buyInterval: 1,
                nextBuyDate: moment(new Date('2018-10-11T21:09:10')).toISOString(true), // Storageには文字列で保存されている
                buyType: COMMON.BuyType.Indivisual,
                isSellEnded: false,
                isPutInCartFailure: false
            }]
        };

        chrome.storage.sync.get.mockImplementation((key, callback) => { callback(dummyData); });

        const wrapper = mount(<ProductList />);
        const instance = wrapper.instance();
        if (instance.componentDidMount) {
            await instance.componentDidMount();
            console.log(instance.state);
            const tbody = wrapper.find('tbody').find('tr').find('td');
            expect(tbody.at(0).text()).toBe('テスト商品名');
            expect(tbody.at(1).text()).toBe('次回購入日');
            expect(tbody.at(2).text()).toBe('購入方法');
            expect(tbody.at(3).text()).toBe('数量');
            expect(tbody.at(4).text()).toBe('前回注文日');
        }
    });
});
