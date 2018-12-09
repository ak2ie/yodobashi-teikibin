import * as moment from 'moment';

/**
 * datastoreに保存されている商品データのキー
 */
export const PRODUCT_DATA_KEY = 'ProductData';
/**
 * 定期購入追加情報をメッセージで交換する際のキー
 */
export const ADD_TEIKI_KONYU_KEY = 'add_teiki_konyu';

export const PUT_IN_CART = 'put_in_cart';

export const CONTENTS_SCRIPT_LOADED = 'contents_script_loaded';

/**
 * 定期購入新規登録時の前回購入日
 */
export const LAST_BUY_DATE_NULL = new Date(9999, 11, 31);
/**
 * Content Scriptで商品をカート投入完了
 */
export const PUT_IN_CART_COMPLETE = 'put_in_cart_complete';
/**
 * 定期購入商品ページのURL末尾に付ける文字列
 */
export const TEIKIKONYU_URL_SUFFIX = '?teikibin=true';
/**
 * datastoreに保存する設定情報のキー
 */
export const SETTING_KEY = 'TeikibinSetting';
/**
 * 定期購入時にエラーが発生
 */
export const PUT_IN_CART_ERROR = 'put_in_cart_error';
/**
 * 定期購入時エラー理由：販売終了
 */
export const PUT_IN_CART_ERROR_SALESEND = 'put_in_cart_error_sales_end';

export const isProductDataArray = (item: any): item is { 'ProductData': ProductData[] } => {
    if (typeof item === 'object' && 'ProductData' in item) {
        for (let i = 0; i < item.ProductData.length; i++) {
            const productDataItem = item.ProductData[i];
            const keys = Object.keys(productDataItem);
            if (keys.indexOf('id') !== -1
                && keys.indexOf('name') !== -1
                && keys.indexOf('buyNum') !== -1) {
                return true;
            } else {
                return false;
            }
        }
        return false;
    } else {
        return false;
    }
};

export enum BuyType {
    Indivisual,
    Omatome
}

/**
 * 商品データ
 */
export class ProductData {
    /**
     * 商品ID
     */
    id: string;
    /**
     * 商品名
     */
    name: string;
    /**
     * 購入数
     */
    buyNum: number;
    /**
     * 購入間隔月数
     */
    buyInterval: number;
    /**
     * 次回購入日（時刻は無視）
     */
    nextBuyDate: Date;
    /**
     * 購入方法
     */
    buyType: BuyType;
    /**
     * 販売終了商品であるか（trueなら終了）
     */
    isSellEnded: boolean;
    /**
     * カート投入に失敗したか（trueなら失敗）
     */
    isPutInCartFailure: boolean;
    /**
     * 前回購入日（日時は無視）
     */
    lastBuyDate: Date;

    constructor(id: string, name: string, buyNum: number, buyInterval: number, nextBuyDate: Date, buyType: BuyType, isSellEnded: boolean, isPutInCartFailure: boolean, lastBuyDate: Date) {
        this.id = id;
        this.name = name;
        this.buyNum = buyNum;
        this.buyInterval = buyInterval;
        this.nextBuyDate = nextBuyDate;
        this.buyType = buyType;
        this.isSellEnded = isSellEnded;
        this.isPutInCartFailure = isPutInCartFailure;
        this.lastBuyDate = lastBuyDate;
    }
}

/**
 * 商品データ（メッセージでの交換用にDate -> Stringに変更）
 */
export class ProductDataForMessage {
    /**
     * 商品ID
     */
    id: string;
    /**
     * 商品名
     */
    name: string;
    /**
     * 購入数
     */
    buyNum: number;
    /**
     * 購入間隔月数
     */
    buyInterval: number;
    /**
     * 次回購入日（時刻は無視）
     */
    nextBuyDate: string;
    /**
     * 購入方法
     */
    buyType: BuyType;
    /**
     * 販売終了商品であるか（trueなら終了）
     */
    isSellEnded: boolean;
    /**
     * カート投入に失敗したか（trueなら失敗）
     */
    isPutInCartFailure: boolean;
    /**
     * 前回購入日（日時は無視）
     */
    lastBuyDate: string;

    constructor(id: string, name: string, buyNum: number, buyInterval: number, nextBuyDate: string, buyType: BuyType, isSellEnded: boolean, isPutInCartFailure: boolean, lastBuyDate: string) {
        this.id = id;
        this.name = name;
        this.buyNum = buyNum;
        this.buyInterval = buyInterval;
        this.nextBuyDate = nextBuyDate;
        this.buyType = buyType;
        this.isSellEnded = isSellEnded;
        this.isPutInCartFailure = isPutInCartFailure;
        this.lastBuyDate = lastBuyDate;
    }
}

export const parseToStringDateProductData = (productData: ProductData): ProductDataForMessage => {
    return new ProductDataForMessage(
        productData.id,
        productData.name,
        productData.buyNum,
        productData.buyInterval,
        moment(productData.nextBuyDate).toISOString(true),
        productData.buyType,
        productData.isSellEnded,
        productData.isPutInCartFailure,
        moment(productData.lastBuyDate).toISOString(true)
    );
};

export const parseToProductData = (productData: ProductDataForMessage): ProductData => {
    return new ProductData(
        productData.id,
        productData.name,
        productData.buyNum,
        productData.buyInterval,
        moment(productData.nextBuyDate).toDate(),
        productData.buyType,
        productData.isSellEnded,
        productData.isPutInCartFailure,
        moment(productData.lastBuyDate).toDate()
    );
};

/**
 * 定期購入時に自動でカートに入れた商品情報
 */
export class PutInCartProductData {
    /**
     * 商品ページのURL
     */
    url: string;
    /**
     * 購入が成功したか（成功ならtrue）
     */
    isSuccess: boolean;
    /**
     * 購入失敗理由
     */
    reason?: string;

    constructor(url: string, isSuccess: boolean, reason?: string) {
        this.url = url;
        this.isSuccess = isSuccess;
        if (reason !== undefined) {
            this.reason = reason;
        }
    }
}

/**
 * 設定
 */
export class SettingsData {
    /**
     * カート投入を指示したか（毎チェック時に初期化。対象商品がなければfalse）
     */
    isPutInCartOnThisCheck: boolean;

    constructor(isPutInCartOnThisCheck: boolean) {
        this.isPutInCartOnThisCheck = isPutInCartOnThisCheck;
    }
}

export const isSettingsData = (item: any): item is {TeikibinSetting: SettingsData} => {
    if (SETTING_KEY in item) {
        if ('isPutInCartOnThisCheck' in item[SETTING_KEY]) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
};