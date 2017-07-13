
var app = getApp()
var util = require('../../utils/util.js')
var WxParse = require('../../components/wxParse/wxParse.js');

Page({
  data: {
    goodsInfo: {},
    addToShoppingCartCount: 0,
    selectModelInfo: {
      models: [],
      stock: '',
      price: '',
      buyCount: 0
    },
    defaultPhoto: '',
    addToShoppingCartHidden: true,
    ifAddToShoppingCart: true,
    priceDiscountStr: '',
    cartGoodsNum: 0,
    cartGoodsTotalPrice: 0,
    pageNavigating: false
  },
  numChangeTimeout: '',
  goodsId: '',
  cart_id: '',
  fromBack: false,
  franchiseeId: '',
  touchStartPos: {},
  onLoad: function(options){
    var contact = options.contact,
        defaultPhoto = app.getDefaultPhoto();

    this.setData({
      contact: contact,
      defaultPhoto: defaultPhoto,
    })
    this.goodsId = options.detail || '';
    this.franchiseeId = options.franchisee || '';
    app.checkLogin();
  },
  dataInitial: function() {
    this.getGoodsDetail();
  },
  getGoodsDetail: function(){
    var that = this;
    app.sendRequest({
      url: '/index.php?r=AppShop/getGoods',
      data: {
        data_id: this.goodsId,
        sub_shop_app_id: this.franchiseeId
      },
      success: function(res){
        that.modifyGoodsDetail(res);
        that.getCartList();
      }
    })
  },
  getCartList: function(){
    var that = this;
    app.sendRequest({
      url: '/index.php?r=AppShop/cartList',
      data: {
        page: 1,
        page_size: 100,
        sub_shop_app_id: this.franchiseeId,
        parent_shop_app_id: this.franchiseeId?app.globalData.appId:''
      },
      success: function(res){
        var price = 0,
            num = 0,
            addToShoppingCartCount = 0,
            tostoreTypeFlag = false;

        for (var i = res.data.length - 1; i >= 0; i--) {
          var data = res.data[i];
          price += +data.num * +data.price;
          num   += +data.num;
          if (data.goods_type == 3) {
            tostoreTypeFlag = true;
          }
          if(that.goodsId == data.goods_id){
            addToShoppingCartCount = data.num;
            that.cart_id = data.id;
          }
        }
        that.setData({
          tostoreTypeFlag: tostoreTypeFlag,
          cartGoodsNum: num,
          cartGoodsTotalPrice: price.toFixed(2),
          addToShoppingCartCount: addToShoppingCartCount
        });
      }
    })
  },
  onShow: function(){
    if(this.fromBack){
      this.getCartList();
      this.resetSelectCountPrice();
    }
    else
      this.fromBack = true;
  },
  onShareAppMessage: function(){
    var goodsId = this.goodsId,
        contact = this.data.contact,
        franchiseeId = this.franchiseeId,
        url = '/pages/goodsDetail/goodsDetail?detail='+ goodsId + (franchiseeId ? '&franchisee='+franchiseeId : '');

    return {
      title: app.getAppTitle() || '即速应用',
      desc: app.getAppDescription() || '即速应用，拖拽生成app，无需编辑代码，一键打包微信小程序',
      path: url
    }
  },
  goToShoppingCart: function(){
    var franchiseeId = this.franchiseeId,
        pagePath = '/pages/shoppingCart/shoppingCart'+(franchiseeId ? '?franchisee='+franchiseeId : '');
    app.turnToPage(pagePath);
  },
  modifyGoodsDetail: function(res){
    var pages = getCurrentPages(),
        _this = pages[pages.length - 1],
        goods = res.data[0].form_data,
        description = goods.description,
        goodsModel = [],
        selectModels = [],
        price = 0,
        discountStr = '',
        data = {},
        that = this,
        selectStock, selectPrice, selectModelId, matchResult,
        i, j;

    WxParse.wxParse('wxParseDescription', 'html', description, _this, 10);
    if (goods.business_time && goods.business_time.business_time){
      var goodBusinesssTime = goods.business_time.business_time,
        businesssTimeString = '';
      for (var i = 0; i < goodBusinesssTime.length;i++){
        businesssTimeString += goodBusinesssTime[i].start_time.substring(0, 2) + ':' + goodBusinesssTime[i].start_time.substring(2, 4) + '-' + goodBusinesssTime[i].end_time.substring(0, 2) + ':' + goodBusinesssTime[i].end_time.substring(2, 4) + '/';
      }
      businesssTimeString = '出售时间：'+businesssTimeString.substring(0, businesssTimeString.length - 1);
      that.setData({
        businesssTimeString: businesssTimeString
      })
    }


    if(goods.model_items.length){
      var items = goods.model_items;
      selectPrice = items[0].price;
      selectStock = items[0].stock;
      selectModelId = items[0].id;
    } else {
      selectPrice = goods.price;
      selectStock = goods.stock;
    }
    for(var key in goods.model){
      if(key){
        var model = goods.model[key];
        goodsModel.push(model);
        selectModels.push(model.subModelId[0]);
      }
    }
    goods.model = goodsModel;
    if (Number(goods.max_can_use_integral) != 0 ) {
      discountStr = '（积分可抵扣' + (Number(goods.max_can_use_integral) / 100) + '元）';
    }
    data = {
      goodsInfo: goods,
      'selectModelInfo.models': selectModels,
      'selectModelInfo.stock': selectStock,
      'selectModelInfo.price': selectPrice,
      'selectModelInfo.modelId': selectModelId,
      priceDiscountStr: discountStr,
    };
    goods.model.length ? (data.showSelectModel = true) : (data.showChangeCount = true);
    _this.setData(data);
  },
  hiddeAddToShoppingCart: function(){
    this.setData({
      addToShoppingCartHidden: true
    })
  },
  selectSubModel: function(e){
    var dataset = e.target.dataset,
        modelIndex = dataset.modelIndex,
        submodelIndex = dataset.submodelIndex,
        data = {};

    data['selectModelInfo.models['+modelIndex+']'] = this.data.goodsInfo.model[modelIndex].subModelId[submodelIndex];
    this.setData(data);
    this.resetSelectCountPrice();
  },
  resetSelectCountPrice: function(){
    var selectModelIds = this.data.selectModelInfo.models.join(','),
        modelItems = this.data.goodsInfo.model_items,
        data = {};
    data['selectModelInfo.buyCount'] = 0;
    for (var i = modelItems.length - 1; i >= 0; i--) {
      if(modelItems[i].model == selectModelIds){
        data['selectModelInfo.stock'] = modelItems[i].stock;
        data['selectModelInfo.price'] = modelItems[i].price;
        data['selectModelInfo.modelId'] = modelItems[i].id;
        break;
      }
    }
    this.setData(data);
  },
  clickMinusButton: function(e){
    if(+this.data.addToShoppingCartCount <= 0) return;
    this.changeCartGoodsNum('minus');
  },
  clickPlusButton: function(e){
    this.changeCartGoodsNum('plus');
  },
  changeCartGoodsNum: function(type){
    clearTimeout(this.numChangeTimeout);

    var goods = this.data.goodsInfo,
        currentGoodsNum = +this.data.addToShoppingCartCount,
        targetGoodsNum = type == 'plus' ? currentGoodsNum + 1 : currentGoodsNum - 1,
        currentCartNum = +this.data.cartGoodsNum,
        targetCartNum = type == 'plus' ? currentCartNum + 1 : currentCartNum - 1,
        currentTotalPrice = +this.data.cartGoodsTotalPrice,
        targetTotalPrice = type == 'plus' ? currentTotalPrice + +goods.price : currentTotalPrice - +goods.price,
        that = this,
        param;

    if (targetGoodsNum > +goods.stock){
      app.showModal({
        content: '库存不足'
      });
      return;
    }
    // this.setData({
    //   addToShoppingCartCount: targetGoodsNum,
    //   cartGoodsNum: targetCartNum,
    //   cartGoodsTotalPrice: targetTotalPrice.toFixed(2)
    // });

    if(targetGoodsNum == 0 && type == 'minus'){
      app.sendRequest({
        hideLoading: true,
        url : '/index.php?r=AppShop/deleteCart',
        method: 'post',
        data: {
          cart_id_arr: [that.cart_id],
          sub_shop_app_id: that.franchiseeId
        },
        success:function(res){
          that.getCartList();
        },
        fail: function(res){
          that.setData({
            addToShoppingCartCount: currentGoodsNum,
            cartGoodsNum: currentCartNum,
            cartGoodsTotalPrice: currentTotalPrice
          });
        }
      });
      return;
    }
    param = {
      _app_id: app.getAppId(),
      app_id: app.getAppId(),
      goods_id: goods.id,
      model_id: goods.modelId || '',
      num: targetGoodsNum,
      sub_shop_app_id: that.franchiseeId,
      session_key: app.getSessionKey()
    };
    // app.sendRequest({
    //   hideLoading: true,
    //   url: '/index.php?r=AppShop/addCart',
    //   data: param,
    //   success: function(res){
    //     that.cart_id = res.data;
    //   },
    //   fail: function(res){
    //     that.setData({
    //       addToShoppingCartCount: currentGoodsNum,
    //       cartGoodsNum: currentCartNum,
    //       cartGoodsTotalPrice: currentTotalPrice
    //     });
    //   }
    // })
    wx.request({
      url: app.getSiteBaseUrl() + '/index.php?r=AppShop/addCart',
      data: param,
      success: function (res) {
        if (res.data.status == 0) {
          that.cart_id = res.data;
          that.getCartList();
        } else {
          if (res.data.status == 401 || res.data.status == 2) {
              // 未登录
              app.login();
              return;
            }
          that.setData({
            'selectModelInfo.buyCount': 0
          });
          app.showModal({
            content: res.data.data
          })
        }
      }
    })
  },
  clickModelMinusButton: function(){
    var count = this.data.selectModelInfo.buyCount,
        that = this;
    if (count <= 0){
      return;
    }
    if(count <= 1){
      app.sendRequest({
        hideLoading: true,
        url: '/index.php?r=AppShop/deleteCart',
        method: 'post',
        data: {
          cart_id_arr: [that.cart_id],
          sub_shop_app_id: that.franchiseeId
        },
        success: function () {
          that.setData({
            'selectModelInfo.buyCount': count - 1
          })
          that.getCartList();
        },
        fail: function (res) {
          that.setData({
            addToShoppingCartCount: currentGoodsNum,
            cartGoodsNum: currentCartNum,
            cartGoodsTotalPrice: currentTotalPrice
          });
        }
      });
      return;
    }
    // this.setData({
    //   'selectModelInfo.buyCount': count - 1
    // });
    this.sureAddToShoppingCart();
  },
  clickModelPlusButton: function(){
    var selectModelInfo = this.data.selectModelInfo,
        count = selectModelInfo.buyCount;

    if (count + 1 >= selectModelInfo.stock){
      app.showModal({
        content: '库存不足'
      });
      return;
    }

    // this.setData({
    //   'selectModelInfo.buyCount': count + 1
    // });
    this.sureAddToShoppingCart('plus');
  },
  sureAddToShoppingCart: function(type){
    var that = this,
        addcount = this.data.selectModelInfo.buyCount;
        if(type == 'plus'){
          addcount = addcount + 1;
        }else{
          addcount = addcount - 1;
        }
     var  param = {
          _app_id: app.getAppId(),
          app_id: app.getAppId(),
          goods_id: this.goodsId,
          model_id: this.data.selectModelInfo.modelId || '',
          num: addcount,
          sub_shop_app_id: this.franchiseeId || '',
          session_key: app.getSessionKey()
        };

    // app.sendRequest({
    //   url: '/index.php?r=AppShop/addCart',
    //   data: param,
    //   success: function(res){
    //     that.cart_id = res.data;
    //     that.getCartList();
    //   }
    // })
    wx.request({
      url: app.getSiteBaseUrl() + '/index.php?r=AppShop/addCart',
      data: param,
      success: function (res) {
        if (res.data.status == 0){
          that.cart_id = res.data;
          that.setData({
            'selectModelInfo.buyCount': addcount
          });
          that.getCartList();
        }else{
          if (res.data.status == 401 || res.data.status == 2) {
              // 未登录
              app.login();
              return;
            }
          that.setData({
            'selectModelInfo.buyCount': 0
          });
          app.showModal({
            content:res.data.data
          })
        }
      }
    })


  },
  readyToPay: function(){
    if (this.data.cartGoodsNum <= 0 || !this.data.tostoreTypeFlag) return;
    var franchiseeId = this.franchiseeId,
        pagePath = '/pages/previewOrderDetail/previewOrderDetail'+(franchiseeId ? '?franchisee='+franchiseeId : '');
    app.turnToPage(pagePath);
  },
  getValidateTostore: function () {
    var that = this;
    wx.request({
      url: app.getSiteBaseUrl() + '/index.php?r=AppShop/precheckShoppingCart',
      data: {
        _app_id: app.getAppId(),
        app_id: app.getAppId(),
        session_key: app.getSessionKey(),
        sub_shop_app_id: that.franchiseeId || '',
        parent_shop_app_id: that.franchiseeId ? app.getAppId() : ''
      },
      success: function (res) {
        if (res.data.status == 0) {
          that.readyToPay();
        } else if (res.data.status == 401 || res.data.status == 2) {
          // 未登录
          app.login();
          return;
        } else if (res.data.status == 1) {
          app.showModal({
            content: res.data.data,
            confirm: function () {
              that.goToShoppingCart();
            }
          })
        } else {
          app.showModal({
            content: res.data.data
          })
        }
      }
    })
  },
  pageTouchStart: function(e){
    var touches = e.touches;
    if(touches.length > 1)
      return;

    this.touchStartPos = {
      clientX: touches[0].clientX,
      clientY: touches[0].clientY
    };
  },
  pageTouchMove: function(e){
    // var touches = e.touches;
    // if(touches.length > 1)
    //   return;

    // if(touches[0].clientX - this.touchStartPos.clientX > 100){
    //   if(this.pageNavigating)
    //     return;
    //   this.pageNavigating = true;
    //   wx.navigateBack();
    // }
  },
  stopPropagation: function(){}
})
