// Enable chromereload by uncommenting this line:
// import 'chromereload/devonly'
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as COMMON from './common';
import { getDataFromStorage, saveDataToStorage } from './storage';
import { PRODUCT_DATA_KEY, isProductDataArray, BuyType, ProductData } from './common';
import * as moment from 'moment';
import * as Modal from 'react-modal';

const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)'
    }
};

// Make sure to bind modal to your appElement (http://reactcommunity.org/react-modal/accessibility/)
Modal.setAppElement('#yodobashi-teikibin-option');

export class ProductList extends React.Component<{}, { ProductList: ProductData[] | [], isLoading: boolean, modalIsOpen: boolean }> {
    constructor(props: any, context: any) {
        super(props, context);
        this.state = {
            ProductList: [],
            isLoading: true,
            modalIsOpen: false
        };
        this.openModal = this.openModal.bind(this);
        this.afterOpenModal = this.afterOpenModal.bind(this);
        this.closeModal = this.closeModal.bind(this);
    }

    openModal() {
        this.setState({ modalIsOpen: true });
    }

    afterOpenModal() {
        // references are now sync'd and can be accessed.
        // this.subtitle.style.color = '#f00';
    }

    closeModal() {
        this.setState({ modalIsOpen: false });
    }

    async loadProductList() {
        const productList = await getDataFromStorage([PRODUCT_DATA_KEY]);
        // console.log(JSON.stringify(productList, undefined, '\t'));
        if (isProductDataArray(productList)) {
            this.setState({ 'ProductList': productList[PRODUCT_DATA_KEY] });
            console.log('商品リスト読み込み完了');
        } else {
            console.error('商品リストが想定外');
        }
        this.setState({ isLoading: false });
    }

    async componentDidMount() {
        await this.loadProductList();
    }

    async deleteProduct(id: string) {
        // this.openModal();

        const productList = await getDataFromStorage([PRODUCT_DATA_KEY]);
        if (isProductDataArray(productList)) {
            // 商品を削除したリストを生成
            let newProductList: ProductData[] | [] = [];
            newProductList = productList[PRODUCT_DATA_KEY].filter(item => item.id !== id);

            // 保存
            await saveDataToStorage({ 'ProductData': newProductList });

            // 取得
            const removedProductList = await getDataFromStorage([PRODUCT_DATA_KEY]);

            if (isProductDataArray(removedProductList)) {
                this.setState({ 'ProductList': removedProductList[PRODUCT_DATA_KEY] });
            } else {
                this.setState({ 'ProductList': [] });
            }
            console.log('商品リスト読み込み完了');
        } else {
            console.error('商品リストが想定外');
            this.setState({ 'ProductList': [] });
        }
    }

    render() {
        let productListForDisplay = [];

        for (let index = 0; index < this.state.ProductList.length; index++) {
            const productItem = this.state.ProductList[index];
            const nextBuyDate = productItem.isSellEnded === false ? moment(productItem.nextBuyDate).format('YYYY/MM/DD') : '-';
            const buyType = productItem.buyType === BuyType.Indivisual ? '個別注文' : 'まとめて注文';
            const isSellEndedBadge = productItem.isSellEnded === true ? <span className='badge badge-secondary is-sell-ended-badge'>販売終了</span> : '';
            const buyInterval = productItem.buyInterval + 'ヶ月';
            const lastBuyDate = moment(productItem.lastBuyDate).isSame(COMMON.LAST_BUY_DATE_NULL) ? '-' : moment(productItem.lastBuyDate).format('YYYY/MM/DD');
            productListForDisplay.push(
                <tr key={index}>
                    <td><a href={'https://www.yodobashi.com/product/' + productItem.id + '/'} target='_blank'>{productItem.name}</a>{isSellEndedBadge}</td>
                    <td>{nextBuyDate}</td>
                    <td>{productItem.buyNum}</td>
                    <td>{buyInterval}</td>
                    <td>{lastBuyDate}</td>
                    <td><button type='button' className='btn btn-info' onClick={() => this.deleteProduct(productItem.id)}>削除</button></td>
                </tr>);
        }

        const productList = this.state.isLoading === true ? <tr></tr> : productListForDisplay;
        const loadingText = this.state.isLoading === true ? '読み込み中...' : '';

        return (
            <div>
                <table className='table' >
                    <thead>
                        <tr>
                            <th scope='col'>商品名</th>
                            <th scope='col'>次回購入日</th>
                            <th scope='col'>数量</th>
                            <th scope='col'>購入頻度</th>
                            <th scope='col'>前回注文日</th>
                            <th scope='col'></th>
                        </tr>
                    </thead>
                    <tbody>
                        {productList}
                    </tbody>
                </table>
                {loadingText}
                <Modal
                    isOpen={this.state.modalIsOpen}
                    onAfterOpen={this.afterOpenModal}
                    onRequestClose={this.closeModal}
                    style={customStyles}
                    contentLabel='Example Modal'
                >

                    <h2>Hello</h2>
                    <button onClick={this.closeModal}>close</button>
                    <div>I am a modal</div>
                    <form>
                        <input />
                        <button>tab navigation</button>
                        <button>stays</button>
                        <button>inside</button>
                        <button>the modal</button>
                    </form>
                </Modal>
            </div>
        );
    }
}

// Inject our app to DOM and send response
injectApp();

function injectApp() {
    const newDiv = document.createElement('div');
    newDiv.setAttribute('id', 'yodobashi-teikibin-option-box');
    const outer = document.getElementById('yodobashi-teikibin-option') as HTMLElement;
    if (outer !== null) {
        outer.appendChild(newDiv);
        ReactDOM.render(<ProductList />, newDiv);
    }
}