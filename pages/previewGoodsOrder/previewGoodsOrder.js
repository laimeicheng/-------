
var app = getApp()
var util = require('../../utils/util.js')

Page({
  data: {
    goodsList: [],
    selectAddress: {},
    discountList: [],
    selectDiscountInfo: {},
    selectDiscountIndex: '',
    orderRemark: '',
    is_self_delivery: 0,
    express_fee: '',
    balance: '',
    useBalance: true,
    deduction: '',
    discount_cut_price: '',
    original_price: '',
    totalPayment: '',
    shopAddress: '',
    noAdditionalInfo: true
  },
  isFromBack: false,
  franchisee_id: '',
  cart_id_arr: [],
  cart_data_arr: [],
  requesting: false,
  additional_info: {},
  onLoad: function (options) {
    this.franchisee_id = options.franchisee || '';
    this.cart_id_arr = options.cart_arr ? decodeURIComponent(options.cart_arr).split(',') : [];
    this.dataInitial();
  },
  dataInitial: function () {
    this.getCalculationInfo();
    this.getShopAddress();
    this.getCartList();
  },
  onShow: function(){
    if(this.isFromBack){
      this.getCalculationInfo();
    } else {
      this.isFromBack = true;
    }
  },
  getCartList: function () {
    var that = this,
        franchisee_id = this.franchisee_id;

    app.sendRequest({
      url: '/index.php?r=AppShop/cartList',
      data: {
        page: 1,
        page_size: 100,
        sub_shop_app_id: franchisee_id,
        parent_shop_app_id: franchisee_id ? app.globalData.appId : ''
      },
      success: function(res){
        var data = [];
        if(that.cart_id_arr.length){
          for (var i = 0; i <= res.data.length - 1; i++) {
            if(that.cart_id_arr.indexOf(res.data[i].id) >= 0){
              data.push(res.data[i]);
            }
          }
        } else {
          data = res.data;
        }

        for (var i = 0; i <= data.length - 1; i++) {
          var goods = data[i],
              modelArr = goods.model_value;
          goods.model_value_str = modelArr && modelArr.join ? '('+modelArr.join('|')+')' : '';
          that.cart_data_arr.push({
            cart_id: goods.id,
            goods_id: goods.goods_id,
            model_id: goods.model_id,
            num: goods.num
          });
        }
        that.setData({
          goodsList: data
        });
      }
    })
  },
  getCalculationInfo: function(){
    var _this = this;

    app.sendRequest({
      url: '/index.php?r=AppShop/calculationPrice',
      method: 'post',
      data: {
        sub_shop_app_id: this.franchisee_id,
        address_id: this.data.selectAddress.id,
        cart_id_arr: this.cart_id_arr,
        is_balance: this.data.useBalance ? 1 : 0,
        is_self_delivery: this.data.is_self_delivery,
        selected_benefit: this.data.selectDiscountInfo
      },
      success: function(res){
        var info = res.data,
            benefits = info.can_use_benefit.data,
            goods_info = info.goods_info,
            additional_info_goods = [],
            additional_goodsid_arr = [],
            selectDiscountIndex,
            selectDiscountInfo;

        if(benefits.length){
          benefits.unshift({
            title: '不使用优惠',
            name: '无',
            no_use_benefit: 1
          });
        }

        if(_this.data.selectDiscountInfo && _this.data.selectDiscountInfo.no_use_benefit == 1){
          selectDiscountInfo = _this.data.selectDiscountInfo;
          selectDiscountIndex = 0;
        } else {
          selectDiscountInfo = info.selected_benefit_info;
          if(selectDiscountInfo && selectDiscountInfo.discount_type){
            for (var i = 0; i <= benefits.length - 1; i++) {
              if(selectDiscountInfo.discount_type === benefits[i].discount_type){
                if(selectDiscountInfo.discount_type === 'coupon') {
                  if(selectDiscountInfo.coupon_id === benefits[i].coupon_id){
                    selectDiscountIndex = i;
                    break;
                  }
                } else {
                  selectDiscountIndex = i;
                  break;
                }
              }
            }
          }
        }

        for (var i = 0; i <= goods_info.length - 1; i++) {
          if(goods_info[i].delivery_id && goods_info[i].delivery_id != 0 && additional_goodsid_arr.indexOf(goods_info[i].id) == -1){
            additional_goodsid_arr.push(goods_info[i].id);
            additional_info_goods.push(goods_info[i]);
          }
        }
        _this.setData({
          selectAddress: info.address,
          discountList: benefits,
          selectDiscountIndex: selectDiscountIndex,
          selectDiscountInfo: selectDiscountInfo,
          express_fee: info.express_fee,
          discount_cut_price: info.discount_cut_price,
          balance: info.balance,
          deduction: info.use_balance,
          original_price: info.original_price,
          totalPayment: info.price,
          noAdditionalInfo: additional_info_goods.length ? false : true
        })
        app.setPreviewGoodsInfo(additional_info_goods);
      }
    });
  },
  getShopAddress:function(){
    var that = this;
    app.sendRequest({
      url: '/index.php?r=AppShop/getAppShopLocationInfo',
      success: function (res) {
        that.setData({
          shopAddress: res.data
        });
      }
    });
  },
  remarkInput: function (e) {
    var value = e.detail.value;

    this.setData({
      orderRemark: value
    });
  },
  previewImage: function (e) {
    app.previewImage({
      current: e.currentTarget.dataset.src
    });
  },
  clickMinusButton: function(e){
    var index = e.currentTarget.dataset.index,
        goods = this.data.goodsList[index];
    if(+goods.num <= 0) return;
    this.changeGoodsNum(index, 'minus');
  },
  clickPlusButton: function(e){
    var index = e.currentTarget.dataset.index;
    this.changeGoodsNum(index, 'plus');
  },
  changeGoodsNum: function(index, type){
    var goods = this.data.goodsList[index],
        currentNum = +goods.num,
        targetNum = type == 'plus' ? currentNum + 1 : currentNum - 1,
        that = this,
        data = {},
        param;

    if(targetNum == 0 && type == 'minus'){
      app.showModal({
        content: '确定从购物车删除该商品？',
        showCancel: true,
        confirm: function(){
          that.cart_data_arr[index].num = targetNum;
          data['goodsList['+index+'].num'] = targetNum;
          that.setData(data);
          that.deleteGoods(index);
        }
      })
      return;
    }

    that.cart_data_arr[index].num = targetNum;
    data['goodsList['+index+'].num'] = targetNum;
    that.setData(data);

    param = {
      goods_id: goods.goods_id,
      model_id: goods.model_id || '',
      num: targetNum,
      sub_shop_app_id: that.franchisee_id
    };
    app.sendRequest({
      hideLoading: true,
      url: '/index.php?r=AppShop/addCart',
      data: param,
      success: function(res){
        that.getCalculationInfo();
      },
      fail: function(res){
        data = {};
        that.cart_data_arr[index].num = currentNum;
        data['goodsList['+index+'].num'] = currentNum;
        that.setData(data);
      }
    })
  },
  deleteGoods: function(index){
    var goodsList = this.data.goodsList,
        that = this,
        listExcludeDelete;

    app.sendRequest({
      url : '/index.php?r=AppShop/deleteCart',
      method: 'post',
      data: {
        cart_id_arr: [this.cart_data_arr[index].cart_id],
        sub_shop_app_id: this.franchisee_id
      },
      success: function(res){
        (listExcludeDelete = goodsList.concat([])).splice(index, 1);
        if(listExcludeDelete.length == 0){
          app.turnBack();
          return;
        }

        var deleteGoodsId = goodsList[index],
            noSameGoodsId = true;

        for (var i = listExcludeDelete.length - 1; i >= 0; i--) {
          if(listExcludeDelete[i].id == deleteGoodsId){
            noSameGoodsId = false;
            break;
          }
        }
        if(noSameGoodsId){
          delete that.additional_info[deleteGoodsId];
        }
        that.cart_data_arr.splice(index, 1);
        that.setData({
          goodsList: listExcludeDelete,
        })
        that.getCalculationInfo();
      }
    });
  },
  confirmPayment: function(e){
    var list = this.data.goodsList,
        that = this,
        selected_benefit = this.data.selectDiscountInfo,
        hasWritedAdditionalInfo = false;

    if(this.data.is_self_delivery == 0 && !this.data.selectAddress.id){
      app.showModal({
        content: '请选择地址'
      });
      return;
    }

    for(var key in this.additional_info){
      if(key !== undefined){
        hasWritedAdditionalInfo = true;
        break;
      }
    }
    if(!this.data.noAdditionalInfo && !hasWritedAdditionalInfo){
      app.showModal({
        content: '请填写商品补充信息'
      });
      return;
    }

    if(this.requesting){
      return;
    }
    this.requesting = true;

    app.sendRequest({
      url : '/index.php?r=AppShop/addCartOrder',
      method: 'post',
      data: {
        cart_arr: this.cart_data_arr,
        formId: e.detail.formId,
        sub_shop_app_id: this.franchisee_id,
        selected_benefit: selected_benefit,
        is_balance: this.data.useBalance ? 1 : 0,
        is_self_delivery: this.data.is_self_delivery,
        remark: this.data.orderRemark,
        address_id: this.data.selectAddress.id,
        additional_info: this.additional_info
      },
      success: function(res){
        that.payOrder(res.data);
      },
      complete: function(){
        that.requesting = false;
      }
    });
  },
  payOrder: function(orderId){
    var that = this;

    function paySuccess() {
      var pagePath = '/pages/goodsOrderPaySuccess/goodsOrderPaySuccess?detail=' + orderId + (that.franchisee_id ? '&franchisee='+that.franchisee_id : '');
      app.turnToPage(pagePath, 1);
    }

    function payFail(){
      app.turnToPage('/pages/goodsOrderDetail/goodsOrderDetail?detail=' + orderId, 1);
    }

    if(this.data.totalPayment == 0){
      app.sendRequest({
        url: '/index.php?r=AppShop/paygoods',
        data: {
          order_id: orderId,
          total_price: 0
        },
        success: function(res){
          paySuccess();
        },
        fail: function(){
          payFail();
        }
      });
      return;
    }
    app.sendRequest({
      url: '/index.php?r=AppShop/GetWxWebappPaymentCode',
      data: {
        order_id: orderId
      },
      success: function (res) {
        var param = res.data;

        param.orderId = orderId;
        param.goodsType = 3;
        param.success = paySuccess;
        param.fail = payFail;
        that.wxPay(param);
      }
    })
  },
  wxPay: function(param){
    var that = this;
    wx.requestPayment({
      'timeStamp': param.timeStamp,
      'nonceStr': param.nonceStr,
      'package': param.package,
      'signType': 'MD5',
      'paySign': param.paySign,
      success: function(res){
        app.wxPaySuccess(param);
        param.success();
      },
      fail: function(res){
        if(res.errMsg === 'requestPayment:fail cancel'){
          param.fail();
          return;
        }
        app.showModal({
          content: '支付失败',
          complete: param.fail
        })
        app.wxPayFail(param, res.errMsg);
      }
    })
  },
  discountChange: function(e){
    var index = e.detail.value;

    this.setData({
      selectDiscountInfo: this.data.discountList[index],
      selectDiscountIndex: index
    })
    this.getCalculationInfo();
  },
  goToMyAddress: function () {
    var addressId = this.data.selectAddress.id;

    app.turnToPage('/pages/myAddress/myAddress?id=' + addressId);
  },
  showAddAddress: function () {
    var _this = this;

    if (wx.chooseAddress) {
      wx.chooseAddress({
        success: function (res) {
          app.sendRequest({
            method: 'post',
            url: '/index.php?r=AppShop/AddWxAddress',
            data: {
              detailInfo: res.detailInfo || '',
              cityName: res.cityName || '',
              provinceName: res.provinceName || '',
              UserName: res.userName || '',
              telNumber: res.telNumber || '',
              district: res.district || '',
              countyName: res.countyName || ''
            },
            success: function () {
              _this.dataInitial();
            },
          })
        }
      })
    } else {
      app.turnToPage('/pages/addAddress/addAddress');
    }
  },
  makeStorePhoneCall: function(){
    app.makePhoneCall(this.data.shopAddress.shop_contact);
  },
  openStoreLocation: function(){
    var infor = this.data.shopAddress.region_string + this.data.shopAddress.shop_location;

    infor = infor.replace(/\s/g,'');
    app.sendRequest({
      url: '/index.php?r=Map/GetLatAndLngByAreaInfo',
      data: {
        location_info: infor
      },
      success: function (res) {
        if (res.result){
          wx.openLocation({
            latitude: res.result.location.lat,
            longitude: res.result.location.lng
          })
        }
      }
    });
  },
  useBalanceChange: function(e){
    this.setData({
      useBalance: e.detail.value
    });
    this.getCalculationInfo();
  },
  deliveryWayChange: function(e){
    this.setData({
      is_self_delivery: e.detail.value
    })
    this.getCalculationInfo();
  },
  goToAdditionalInfo: function(){
    app.setGoodsAdditionalInfo(this.additional_info);
    app.turnToPage('/pages/goodsAdditionalInfo/goodsAdditionalInfo');
  }
})
