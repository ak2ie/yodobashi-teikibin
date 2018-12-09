// Enable chromereload by uncommenting this line:
// import 'chromereload/devonly';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as COMMON from './common';
import * as moment from 'moment';

const BUY_NUM_ID = 'teikibin-buy-num';
const BUY_INTERVAL_ID = 'teikibin-buy-interval';
/**
 * 商品ページのURL
 */
const PRODUCT_PAGE_URL = 'https://www.yodobashi.com/product/';
/**
 * カート投入後のURL
 */
const PUT_IN_CART_URL = 'https://order.yodobashi.com/yc/shoppingcart/recommend.html';
/**
 * 購入数量や「ショッピングカートに入れる」ボタンがあるエリアのクラス名
 */
const PUT_IN_CART_CLASS_NAME = 'pDetailBuyCol';

/* ----------------------------------------
 *  定期購入時に商品をカートに入れる
 * ---------------------------------------- */
let gotoShoppingCartArea = document.getElementsByClassName(PUT_IN_CART_CLASS_NAME);

// chrome.runtime.onConnect.addListener((port) => {
//     console.log('ポート開いた');
//     port.onMessage.addListener((message) => {
//         console.log(message);
//         switch (message.type) {
//             case COMMON.PUT_IN_CART:
//                 console.log('カートに入れる', message.data);
//                 document.addEventListener('DOMContentLoaded', () => {
//                     console.log('ロード完了');
//                     putInShoppingCart(message.data.buyNum);
//                 });
//                 break;

//             default:
//                 console.error('メッセージが想定外:', message.type);
//                 break;
//         }
//     });
// });

/**
 * 定期購入時に商品をカートに入れるため、
 * Background Scriptにロード完了通知を送る
 */
const loadComplete = () => {
    console.log('ロード完了');
    if (location.href.indexOf(PRODUCT_PAGE_URL) !== -1
        && location.href.indexOf(COMMON.TEIKIKONYU_URL_SUFFIX) !== -1) {
        // 定期購入時に商品ページを開いた場合

        displayOverlay();

        chrome.runtime.sendMessage({
            type: COMMON.CONTENTS_SCRIPT_LOADED,
            data: {
                url: window.location.href
            }
        }, () => { });
    } else if (location.href.indexOf(PUT_IN_CART_URL) !== -1) {
        // 定期購入時にカート投入完了ページへ遷移した場合

        // カート投入後の画面に遷移済のため、1つ前のURLを取得
        const previousUrl = document.referrer;

        if (previousUrl.indexOf(COMMON.TEIKIKONYU_URL_SUFFIX) !== -1) {
            // ページ遷移して、操作中の表示が消えてしまうので再表示
            displayOverlay();

            // 購入完了をバックグラウンドへ通知
            const product = new COMMON.PutInCartProductData(previousUrl, true);
            chrome.runtime.sendMessage({
                type: COMMON.PUT_IN_CART_COMPLETE,
                data: product
            }, () => { });

            window.close();
        }
    }
};

loadComplete();

/** ----------------------------------------
 *  定期購入商品　操作中の表示
 * ---------------------------------------- */
function displayOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'yodobashi-teikibin-overlay';
    const attensionText = document.createElement('p');
    attensionText.innerText = 'よどばし定期便\n操作完了しだい閉じます。';
    overlay.appendChild(attensionText);

    const body = document.getElementsByTagName('body');
    body[0].appendChild(overlay);
}

/* ----------------------------------------
 * メッセージ処理
 * ---------------------------------------- */
chrome.runtime.onMessage.addListener((mes, sender, response) => {
    console.log('通常メッセージ受信');
    // let putInCartLink = document.getElementById('js_m_submitRelated') as HTMLElement;
    // putInCartLink.click();

    switch (mes.type) {
        case COMMON.PUT_IN_CART:
            console.log('カートに入れる', mes.data);
            putInShoppingCart(mes.data.buyNum);
            break;

        default:
            console.error('メッセージが想定外:', mes.type);
            break;
    }
});

/**
 * 購入数量を選択する
 * @param num 購入数量
 */
const selectProductNum = (num: number) => {
    const productNumElement = document.getElementById('qtySel') as HTMLSelectElement;
    if (productNumElement !== null) {
        productNumElement.selectedIndex = num - 1;
        productNumElement.children[0].removeAttribute('selected');
        productNumElement.children[num - 1].setAttribute('selected', 'selected');

        // 購入数量はHidden要素で渡される
        // 2つの使い分けは不明
        const productNum1 = document.getElementById('qtyText') as HTMLElement;
        productNum1.setAttribute('value', num.toString());
        const productNum2 = document.getElementById('qtyTextNew') as HTMLElement;
        productNum2.setAttribute('value', num.toString());

        if ((num - 1) !== productNumElement.selectedIndex) {
            throw new Error('購入できない数量です：' + num);
        }
    } else {
        reportPutInCartError('購入数量設定不可');
    }
};

/**
 * 商品をカートに入れる
 * @param buyNum 購入数量
 */
const putInShoppingCart = (buyNum: number) => {
    // 販売終了であるかをチェック
    const salesInfo = document.getElementById('js_buyBoxMain') as HTMLElement;
    let isSalesEnd = false;
    if (salesInfo.children.length > 0) {
        const ulElement = salesInfo.children[0];
        if (ulElement.children.length > 0) {
            const liElement = ulElement.children[0];
            if (liElement.children.length > 0) {
                const divElement = liElement.children[0];
                if (divElement.className.indexOf('salesInfo') !== -1) {
                    console.log('販売終了・休止中 判定HTML:', divElement.innerHTML.trim());
                    if (divElement.innerHTML === '<p>販売を終了しました</p>') {
                        console.log('販売終了');
                        isSalesEnd = true;
                    } else if (divElement.innerHTML === '<p>販売休止中です</p>') {
                        console.log('販売休止中');
                        isSalesEnd = true;
                    }
                }
            }
        }
    }

    if (!isSalesEnd) {
        selectProductNum(buyNum);
        let putInCartLink = document.getElementById('js_m_submitRelated');
        if (putInCartLink !== null) {
            putInCartLink.click();
        } else {
            console.error('購入ボタン押下不可');
            reportPutInCartError('購入ボタン押下不可');
            window.close();
        }
    } else {
        reportPutInCartError(COMMON.PUT_IN_CART_ERROR_SALESEND);
        window.close();
    }
};

const reportPutInCartError = (reason: string) => {
    chrome.runtime.sendMessage({
        type: COMMON.PUT_IN_CART_ERROR,
        data: {
            url: window.location.href,
            reason: reason
        }
    });
};

export class App extends React.Component<{}, {
    isBuyPlanExist: boolean
    buyPlanNum: number,
    buyPlanInterval: number,
    buyPlanNextDate: string
}> {
    constructor(props: any, context: any) {
        super(props, context);
        this.state = {
            isBuyPlanExist: false,
            buyPlanNum: 1,
            buyPlanInterval: 4,
            buyPlanNextDate: '2018/10/28'
        };
    }

    generateSettingInfo = () => {
        return (
            <div>
                数量：{this.state.buyPlanNum}<br />
                頻度：{this.state.buyPlanInterval}<br />
                次回購入：{this.state.buyPlanNextDate}
            </div>
        );
    }

    /**
     * 定期購入ボタンハンドラー
     */
    teikikonyu() {
        console.log('定期購入設定');
        // 商品ID取得
        const regexProductId = /https:\/\/www\.yodobashi\.com\/product\/([0-9]+)\/.*/;
        const regexProductIdRes = regexProductId.exec(location.href);
        let productId = '';
        if (regexProductIdRes !== null) {
            productId = regexProductIdRes[1];
        }
        console.log(productId);

        // 商品名
        const productNameElement = document.getElementById('products_maintitle') as HTMLElement;
        let productName = '';
        for (let index = 0; index < productNameElement.children.length; index++) {
            if (productNameElement.children[index].getAttribute('itemprop') === 'name') {
                const name = productNameElement.children[index].textContent;
                if (name !== null) {
                    productName = name;
                } else {
                    productName = '';
                }
            }
        }
        console.log(productName);

        // 購入数量
        const buyNumElement = document.getElementById('yodobashi-teikibin-buy-num') as HTMLSelectElement;
        const buyNum = Number.parseInt(buyNumElement.value);
        console.log(buyNum);

        // 購入頻度
        const buyIntervalElement = document.getElementById('yodobashi-teikibin-buy-interval') as HTMLSelectElement;
        const buyInterval = Number.parseInt(buyIntervalElement.value);
        console.log(buyInterval);

        // 次回購入日
        const nextBuyDate = moment(new Date()).add(buyInterval, 'month').toDate();
        console.log(nextBuyDate);

        const productData = COMMON.parseToStringDateProductData(new COMMON.ProductData(
            productId,
            productName,
            buyNum,
            buyInterval,
            nextBuyDate,
            COMMON.BuyType.Indivisual,
            false,
            false,
            new Date(COMMON.LAST_BUY_DATE_NULL)  // 前回購入日は仮の値
        ));

        chrome.runtime.sendMessage({
            type: COMMON.ADD_TEIKI_KONYU_KEY,
            data: productData
        }, () => {
        });

        // 設定完了を通知
        const teikibinElement = document.getElementById('yodobashi-teikibin-box') as HTMLDivElement;
        const statusElement = document.createElement('div');
        statusElement.innerText = '\n設定完了しました';
        teikibinElement.appendChild(statusElement);
        setTimeout(() => {
            statusElement.remove();
        }, 700);
    }

    render() {
        return (
            <div id='yodobashi-teikibin-box'>
                {this.state.isBuyPlanExist === true ? this.generateSettingInfo() : ''}
                <div className='numIpt'>
                    <label htmlFor='yodobashi-teikibin-buy-num'>数量：</label>
                    <select id='yodobashi-teikibin-buy-num' className='ulSlct'>
                        <option value='1'>1</option>
                        <option value='2'>2</option>
                        <option value='3'>3</option>
                        <option value='4'>4</option>
                        <option value='5'>5</option>
                        <option value='6'>6</option>
                        <option value='7'>7</option>
                        <option value='8'>8</option>
                        <option value='9'>9</option>
                        <option value='10'>10</option>
                    </select>
                </div>
                <div className='numIpt'>
                    <label htmlFor='yodobashi-teikibin-buy-interval'>頻度：</label>
                    <select id='yodobashi-teikibin-buy-interval' className='ulSlct'>
                        <option value='1'>1ヶ月</option>
                        <option value='2'>2ヶ月</option>
                        <option value='3'>3ヶ月</option>
                        <option value='4'>4ヶ月</option>
                        <option value='5'>5ヶ月</option>
                        <option value='6'>6ヶ月</option>
                    </select>
                </div>
                <span className='buy-button-box'>
                    <span className='buy-button-inner-box'>
                        <a className='buy-button' href='#' onClick={this.teikikonyu}>定期購入</a>
                    </span>
                </span>
            </div>
        );
    }
}

// Inject our app to DOM and send response
if (location.href.indexOf(PRODUCT_PAGE_URL) !== -1) {
    injectApp();
}

function injectApp() {
    const newDiv = document.createElement('div');
    newDiv.setAttribute('id', 'yodobashi-teikibin');
    if (gotoShoppingCartArea !== null) {
        gotoShoppingCartArea[0].appendChild(newDiv);
        ReactDOM.render(<App />, newDiv);
    }
}