// Enable chromereload by uncommenting this line:
import 'chromereload/devonly';
import * as COMMON from './common';
import { saveDataToStorage, getDataFromStorage } from './storage';
import * as moment from 'moment';

// chrome.browserAction.setBadgeText({
//   text: `New`
// });

/* ----------------------------------------
 * メッセージ処理
   ---------------------------------------- */
chrome.runtime.onMessage.addListener(async (message, sender, resposne) => {
  if ('type' in message && typeof message.type === 'string') {
    const teikiKonyu = new TeikiKonyu();
    switch (message.type) {
      /* ----------------------------------------
       * 定期購入商品の登録
       ---------------------------------------- */
      case COMMON.ADD_TEIKI_KONYU_KEY:
        console.log('定期購入設定');
        console.log('定期購入商品', JSON.stringify(message.data, undefined, '\t'));
        await teikiKonyu.register(message.data);
        break;

      /* ----------------------------------------
       * 商品をカートに入れる
       ---------------------------------------- */
      case COMMON.CONTENTS_SCRIPT_LOADED:
        console.log('定期購入対象商品');
        await teikiKonyu.putInCart(message.data);
        break;

      /* ----------------------------------------
       * 商品をカートに投入完了
       ---------------------------------------- */
      case COMMON.PUT_IN_CART_COMPLETE:
        console.log('カートに投入完了');
        await teikiKonyu.updatePutInCartProduct(message.data);
        // 定期購入商品が残っていないか確認
        await teikiKonyu.order();
        break;

      case COMMON.PUT_IN_CART_ERROR:
        console.log('購入不可');
        await teikiKonyu.updatePutInCartProduct(message.data);
        await teikiKonyu.order();
        break;

      default:
        console.error('想定外のメッセージ');
        break;
    }
  } else {
    console.error('想定外のメッセージ', JSON.stringify(message, undefined, '\t'));
  }
});

export class TeikiKonyu {
  /**
   * 定期購入情報から商品の購入数を取得する
   * @param productId 商品ID
   */
  private async getBuyNum(productId: string) {
    let storageData = await getDataFromStorage([COMMON.PRODUCT_DATA_KEY]);
    let buyNum = 0;
    if (COMMON.PRODUCT_DATA_KEY in storageData && COMMON.isProductDataArray(storageData)) {
      const productData = storageData[COMMON.PRODUCT_DATA_KEY];
      for (const product of productData) {
        if (product.id === productId) {
          buyNum = product.buyNum;
        }
      }
    } else {
      new Error('Storageに商品データなし');
    }

    if (buyNum === 0) {
      new Error('商品購入数取得に失敗');
    }

    return buyNum;
  }

  /**
   * 購入タイミングが訪れた商品を購入する
   */
  public async order() {
    // 商品リスト
    const productDataFromStorage = await getDataFromStorage([COMMON.PRODUCT_DATA_KEY]);
    if (COMMON.isProductDataArray(productDataFromStorage)) {
      const productList = productDataFromStorage[COMMON.PRODUCT_DATA_KEY];

      // 注文対象商品
      const orderProductList = productList.filter(item =>
        moment(item.nextBuyDate).isBefore(moment(new Date())) && item.isPutInCartFailure === false && item.isSellEnded === false);

      if (orderProductList.length > 0) {
        this.putInCartProduct(orderProductList[0]);
      } else {
        // カート投入が完了または対象がない場合

        // カート投入成功商品があったか（あればtrue）
        let isRequireNotify = false;

        const settings = await getDataFromStorage([COMMON.SETTING_KEY]);
        if (COMMON.isSettingsData(settings)) {
          if (settings[COMMON.SETTING_KEY].isPutInCartOnThisCheck) {
            // 対象商品があった場合

            for (const product of productList) {
              let today = new Date();
              if (moment(product.lastBuyDate).isSame(moment(today), 'day')
                && product.isPutInCartFailure === false
                && product.isSellEnded === false) {
                // カートに投入した場合
                isRequireNotify = true;
                break;
              }
            }
          }
        }

        const productDataFromStorageUpdated = await getDataFromStorage([COMMON.PRODUCT_DATA_KEY]);
        if (COMMON.isProductDataArray(productDataFromStorageUpdated)) {
          // 投入失敗フラグを消す
          let productListUpdated = productDataFromStorageUpdated[COMMON.PRODUCT_DATA_KEY];
          for (let index = 0; index < productListUpdated.length; index++) {
            if (productListUpdated[index].isPutInCartFailure) {
              productListUpdated[index].isPutInCartFailure = false;
            }
          }
          await saveDataToStorage({ 'ProductData': productListUpdated });

          // カート投入成功なら通知
          if (isRequireNotify) {
            await this.notifyPutInCart();

            const settings = new COMMON.SettingsData(false);
            await saveDataToStorage({
              'TeikibinSetting': settings
            });
          }
        }
      }
    }
  }

  /**
   * カート投入を通知
   */
  private async notifyPutInCart() {
    chrome.notifications.onClicked.addListener(() => {
      chrome.tabs.create({ url: 'https://order.yodobashi.com/yc/shoppingcart/index.html' });
    });

    chrome.notifications.create('',
      {
        type: 'basic',
        title: 'よどばし定期便 商品購入',
        message: 'ヨドバシ.comのカートをご確認ください。',
        iconUrl: '../images/icon-128.png'
      },
      () => { });
  }

  /**
   * 定期購入商品を登録する
   * @param productData 商品情報
   */
  public async register(productData: COMMON.ProductDataForMessage) {
    const existedProductData = await getDataFromStorage([COMMON.PRODUCT_DATA_KEY]);
    let newProductData;
    const newProductItem = COMMON.parseToProductData(productData);
    if (COMMON.PRODUCT_DATA_KEY in existedProductData && COMMON.isProductDataArray(existedProductData)) {
      // Storageに定期購入商品が存在する場合

      /**
       * 新規登録商品であるか
       */
      let isNewIem = true;

      // 新規登録または既存更新の判断
      for (const product of existedProductData[COMMON.PRODUCT_DATA_KEY]) {
        if (product.id === newProductItem.id) {
          isNewIem = false;
          break;
        }
      }

      if (isNewIem) {
        // 新規登録の場合
        newProductData = existedProductData[COMMON.PRODUCT_DATA_KEY];
        newProductData.push(newProductItem);
      } else {
        // 既存更新の場合
        for (let index = 0; index < existedProductData[COMMON.PRODUCT_DATA_KEY].length; index++) {
          if (existedProductData[COMMON.PRODUCT_DATA_KEY][index].id === newProductItem.id) {
            existedProductData[COMMON.PRODUCT_DATA_KEY][index].buyNum = newProductItem.buyNum;
            existedProductData[COMMON.PRODUCT_DATA_KEY][index].buyInterval = newProductItem.buyInterval;
            if (moment(existedProductData[COMMON.PRODUCT_DATA_KEY][index].lastBuyDate).isSame(COMMON.LAST_BUY_DATE_NULL)) {
              // 購入設定後、1回も購入していない場合
              existedProductData[COMMON.PRODUCT_DATA_KEY][index].nextBuyDate = moment(new Date()).add(newProductItem.buyInterval, 'month').toDate();
            } else {
              // 1回は購入したことがある場合
              existedProductData[COMMON.PRODUCT_DATA_KEY][index].nextBuyDate = moment(existedProductData[COMMON.PRODUCT_DATA_KEY][index].lastBuyDate).add(newProductItem.buyInterval, 'month').toDate();
            }
          }
        }
        newProductData = existedProductData[COMMON.PRODUCT_DATA_KEY];
      }
    } else {
      // Storageに定期購入商品が1件もない場合
      newProductData = [newProductItem];
    }

    await saveDataToStorage({ 'ProductData': newProductData });
  }

  /**
   * タブで開いている商品をカートに入れる
   * @param data ContentScriptから送られたページの情報
   */
  public async putInCart(data: { [key: string]: string }) {
    if (data.url.indexOf(COMMON.TEIKIKONYU_URL_SUFFIX) !== -1) {
      chrome.tabs.query({
        url: data.url
      }, async (tab) => {
        const productId = this.getProductIdFromURL(data.url);
        const buyNum = await this.getBuyNum(productId);
        const tabId = tab[0].id;
        if (typeof tabId === 'number') {
          chrome.tabs.sendMessage(tabId, {
            type: COMMON.PUT_IN_CART,
            data: {
              buyNum: buyNum
            }
          });
          console.group('カートに投入指示');
          console.log('商品ID:', productId);
          console.log('品数:', buyNum);
          console.groupEnd();
        } else {
          new Error('タブID取得に失敗：' + tabId);
        }
      });
    }
  }

  /**
   * ヨドバシのURLから商品IDを抽出する
   * @param url URL
   */
  private getProductIdFromURL(url: string) {
    const regexProductId = /https:\/\/www\.yodobashi\.com\/product\/([0-9]+)\/.*/;
    const regexProductIdRes = regexProductId.exec(url);
    let productId = '';
    if (regexProductIdRes !== null && regexProductIdRes.length > 1) {
      productId = regexProductIdRes[1];
    } else {
      throw new Error('URLから商品ID取得に失敗:' + url);
    }

    return productId;
  }

  /**
   * 購入タイミングが来た商品をカートに入れる
   * @param product カートに入れる商品リスト
   */
  private putInCartProduct(product: COMMON.ProductData) {
    // for (const product of productList) {
    chrome.windows.create({
      height: 300,
      width: 500,
      focused: false,
      type: 'popup'
    }, window => {
      if (window !== undefined) {
        chrome.tabs.create({
          url: 'https://www.yodobashi.com/product/' + product.id + '/' + COMMON.TEIKIKONYU_URL_SUFFIX,
          active: true,
          windowId: window.id
        }, _ => {
          // ここではContent Scriptでメッセージを受信できない
          // （準備ができてないからか？原因不明）
        });
      }
    });
    // }
  }

  /**
   * 定期購入時に自動でカートに入れた商品情報をStorageに反映
   * @param data Content Scriptから送られた商品情報
   */
  public async updatePutInCartProduct(data: COMMON.PutInCartProductData) {
    const productId = this.getProductIdFromURL(data.url);
    const productList = await getDataFromStorage([COMMON.PRODUCT_DATA_KEY]);
    if (COMMON.isProductDataArray(productList)) {
      for (let index = 0; index < productList[COMMON.PRODUCT_DATA_KEY].length; index++) {
        if (productList[COMMON.PRODUCT_DATA_KEY][index].id === productId) {
          if (data.isSuccess) {
            // カートに入れた場合

            // 購入日を更新
            productList[COMMON.PRODUCT_DATA_KEY][index].nextBuyDate = moment(new Date()).add(productList[COMMON.PRODUCT_DATA_KEY][index].buyInterval, 'month').toDate();
            productList[COMMON.PRODUCT_DATA_KEY][index].lastBuyDate = new Date();
            productList[COMMON.PRODUCT_DATA_KEY][index].isPutInCartFailure = false;

            // カート投入成功の通知を出すように設定
            const settings = new COMMON.SettingsData(true);
            await saveDataToStorage({
              'TeikibinSetting': settings
            });
            break;
          } else {
            // カートに入れられなかった場合
            if (data.reason === COMMON.PUT_IN_CART_ERROR_SALESEND) {
              productList[COMMON.PRODUCT_DATA_KEY][index].isSellEnded = true;
            } else {
              productList[COMMON.PRODUCT_DATA_KEY][index].isPutInCartFailure = true;
            }
          }
        }
      }
      await saveDataToStorage(productList);

    } else {
      console.error('商品情報取得失敗');
    }
  }
}

/* ----------------------------------------
 * 商品の購入要否確認
 * ---------------------------------------- */
const teikiKonyu = new TeikiKonyu();
teikiKonyu.order();

/* ----------------------------------------
 * インストール時に説明ページを表示
 * ---------------------------------------- */
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({
    url: chrome.extension.getURL('pages/install.html')
  });
});