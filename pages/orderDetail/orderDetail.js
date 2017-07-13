
var app = getApp()

Page({
  data: {
    orderInfo: {},
    orderStatus: [
      { '0':'待付款', '1':'待发货', '2':'待收货', '3':'待评价', '4':'退款审核中', '5':'退款中', '6':'已完成', '7':'已关闭'},
      { '0':'待付款', '1':'待确认', '2':'待消费', '3':'待评价', '4':'退款审核中', '5':'退款中', '6':'已完成', '7':'已关闭'},
      { '0':'待付款', '1':'待接单', '2':'待送餐', '3':'待评价', '4':'退款审核中', '5':'退款中', '6':'已完成', '7':'已关闭'},
      { '0':'待付款', '1':'待商家确认', '2':'商家已确认', '3':'已完成', '4':'退款审核中', '5':'退款中', '6':'已完成', '7':'已关闭'}
    ],
    addressList: [],
    selectAddressId: '',
    addressDialogHidden: true,
    goodsAdditionalInfo: {},
    hasAdditionalInfo: false,
    customFields: [],
    isFromBack: false,
    orderId: '',
    isFromTemplateMsg: false,
    discountList: [],
    toStoreInfo: {},
    originalPrice: '',
    openBalance: true, //开启余额功能
    currentBalance: '', // 当前余额
    useBalance: '',
    freghtSwitch:'',
    freightAdress:{},
    delivery:'',
    express_fee:'',
    discount_cut_price: ''
  },
  // 每个页面在onLoad时检查是否已登录
  onLoad: function (options) {
    this.setData({
      orderId: options.detail,
      isFromTemplateMsg: options.from === 'template_msg' ? true : false,
      franchiseeId: options.franchisee || ''
    })
    app.checkLogin();
  },
  // 每个页面数据初始化函数 dataInitial
  dataInitial: function () {
    this.getOrderDetail(this.data.orderId);
    this.getFreigtAdress();
    this.initialAddressId();
  },
  onShow: function () {
    if(this.data.isFromBack){
      if (!!this.data.orderInfo.order_id) {
        this.getOrderDetail(this.data.orderInfo.order_id, 1);
      }
    } else {
      this.setData({
        isFromBack: true
      })
    }
  },
  getOrderDetail: function (orderId, isFromAddrSelect) {
    var that = this;
    app.getOrderDetail({
      data: {
        order_id: orderId,
        sub_shop_app_id: this.data.franchiseeId
      },
      success: function (res) {
        var form_data = res.data[0].form_data,
            hasAdditionalInfo = false,
            address_id = '';

        form_data.totalPay = form_data.total_price;

        if (!isFromAddrSelect) {
          for (var i = 0; i < form_data.goods_info.length; i++) {
            var deliveryId = form_data.goods_info[i].delivery_id;
            if (deliveryId && deliveryId != '0') {
              that.getGoodsCustomField(i, deliveryId);
              hasAdditionalInfo = true;
            }
          }
        }

        if (form_data.address_info && that.data.freghtSwitch) {
          address_id = form_data.address_info.address_id;
          that.setData({
            selectAddressId: address_id,
          })
        }
        if(form_data.tostore_data && form_data.tostore_data.appointed_time)
          form_data.tostore_data.format_appointed_time = form_data.tostore_data.appointed_time.substr(11,5);

        that.setData({
          orderInfo: form_data,
          discountList: form_data.can_use_benefit.data,
          index: form_data.can_use_benefit.selected_index,
          hasAdditionalInfo: hasAdditionalInfo,
          toStoreInfo: form_data.tostore_data,
          discount_cut_price: form_data.discount_cut_price,
          currentBalance: Number(res.data[0]['balance']),
          useBalance: Number(form_data['use_balance']),
          express_fee: res.data[0]['express_fee']
        });

        // 判断当前余额是否足够支付该订单(之前生成的使用余额的订单)
        if(that.data.franchiseeId){
          that.setData({
            openBalance: false
          })
        } else {
          // 非多商家
          if((that.data.orderInfo.status == 0) && (that.data.currentBalance < that.data.useBalance)){
            app.showToast({
                'title': '余额不足，请及时充值',
                'success': function(){
                  that.isUseBalance();
                }
            });
          }
        }
      }
    })
  },
  orderDelete: function (e) {
    var orderId = this.data.orderId,
    that = this,
      franchiseeId = this.data.franchiseeId;
    app.showModal({
      content: '订单删除后不可找回，确认删除？',
      showCancel: true,
      cancelText: '取消',
      confirmText: '确定',
      confirm: function () {
        app.sendRequest({
          url: '/index.php?r=AppShop/HideOrder',
          data: {
            order_id: orderId,
            sub_shop_app_id: franchiseeId
          },
          success: function (res) {
            app.turnBack()
          }
        })
      }
    })
  },
  getGoodsCustomField: function (goodsIndex, deliveryId) {
    var that = this;

    app.sendRequest({
      url: '/index.php?r=pc/AppShop/GetDelivery',
      data: {
        delivery_id: deliveryId
      },
      success: function (res) {
        var deliveryInfo = res.data.delivery_info,
            goodsId = that.data.orderInfo.goods_info[goodsIndex].goods_id,
            data = {},
            fields = [];
        data['goodsAdditionalInfo.' + goodsId + ''] = deliveryInfo;
        for (var i = 0; i < deliveryInfo.length; i++) {
          var info = {};
          info.type = deliveryInfo[i].type;
          info.title = deliveryInfo[i].name;
          fields.push(info);
        }
        data['customFields[' + goodsIndex + ']'] = fields;
        that.setData(data);
      }
    })
  },
  customFieldInput: function (e) {
    var dataset = e.currentTarget.dataset,
        goodsIndex = dataset.goodsIndex,
        fieldIndex = dataset.fieldIndex,
        value = e.detail.value,
        data = {};

    data['customFields[' + goodsIndex + '][' + fieldIndex + '].value'] = value;
    this.setData(data);
  },
  uploadCustomFieldImage: function (e) {
    var that = this,
        dataset = e.currentTarget.dataset,
        goodsIndex = dataset.goodsIndex,
        fieldIndex = dataset.fieldIndex,
        data = {};

    app.chooseImage(function (paths) {
      data['customFields[' + goodsIndex + '][' + fieldIndex + '].value'] = paths;
      that.setData(data);
    }, 9);
  },
  deleteCustomFieldImage: function (e) {
    var dataset = e.currentTarget.dataset,
        goodsIndex = dataset.goodsIndex,
        fieldIndex = dataset.fieldIndex,
        imageArray = this.data.customFields[goodsIndex][fieldIndex].value,
        imageIndex = dataset.imageIndex,
        data = {};

    imageArray.splice(imageIndex, 1);
    data['customFields[' + goodsIndex + '][' + fieldIndex + '].value'] = imageArray;
    this.setData(data);
  },
  sendDeliveryInfo: function () {
    var additional_info = {},
        goodsInfo = this.data.orderInfo.goods_info;

    for (var i = 0; i < goodsInfo.length; i++) {
      additional_info[goodsInfo[i].goods_id] = this.data.customFields[i];
    }
    app.sendRequest({
      url: '/index.php?r=AppShop/SetAdditional',
      method: 'POST',
      data: {
        order_id: this.data.orderInfo.order_id,
        additional_info: additional_info
      },
      success: function (res) {

      }
    });
  },
  cancelOrder: function (e) {
    var orderId = this.data.orderInfo.order_id,
        that = this;

    app.showModal({
      content: '是否取消订单？',
      showCancel: true,
      confirmText: '是',
      cancelText: '否',
      confirm: function () {
        app.sendRequest({
          url: '/index.php?r=AppShop/cancelOrder',
          data: {
            order_id: orderId,
            sub_shop_app_id: that.data.franchiseeId
          },
          success: function (res) {
            var data = {};

            data['orderInfo.status'] = 7;
            that.setData(data);
          }
        })
      }
    })
  },
  payOrder: function (e) {
    var address_info = this.data.orderInfo.address_info,
        that = this,
        orderId;

    if (!address_info && this.data.orderInfo.goods_type != 3) {
      app.showModal({
        content: '请选择邮寄地址'
      })
      return;
    }

    if (this.data.hasAdditionalInfo) {
      this.sendDeliveryInfo();
    }

    orderId = this.data.orderInfo.order_id;

    if (this.data.orderInfo.totalPay == 0) {
      app.sendRequest({
        url: '/index.php?r=AppShop/paygoods',
        data: {
          order_id: orderId,
          total_price: 0
        },
        success: function(res){
          app.showToast({
              'title': '支付成功',
              'success': function(){
                that.getOrderDetail(that.data.orderInfo.order_id);
              }
          });
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
        var param = res.data,
            orderId = that.data.orderInfo.order_id;

        param.orderId = orderId;
        param.goodsType = that.data.orderInfo.goods_type;
        param.success = function () {
          setTimeout(function(){
            that.getOrderDetail(orderId);
          }, 1500);
        };
        app.wxPay(param);
      }
    })
  },
  applyDrawback: function () {
    var orderId = this.data.orderInfo.order_id,
        that = this;

    app.showModal({
      content: '确定要申请退款？',
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      confirm: function () {
        app.sendRequest({
          url: '/index.php?r=AppShop/applyRefund',
          data: {
            order_id: orderId,
            sub_shop_app_id: that.data.franchiseeId
          },
          success: function (res) {
            var data = {};

            data['orderInfo.status'] = 4;
            that.setData(data);
          }
        })
      }
    })
  },
  receiveDrawback: function () {
    var orderId = this.data.orderInfo.order_id,
        that = this;

    app.showModal({
      content: '确定已收到退款？',
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      confirm: function () {
        app.sendRequest({
          url: '/index.php?r=AppShop/comfirmRefund',
          data: {
            order_id: orderId,
            sub_shop_app_id: that.data.franchiseeId
          },
          success: function (res) {
            var data = {};

            data['orderInfo.status'] = 7;
            that.setData(data);
          }
        })
      }
    })
  },
  checkLogistics: function () {
    var orderId = this.data.orderInfo.order_id;
    app.turnToPage('/pages/logisticsPage/logisticsPage?detail=' + orderId);
  },
  sureReceipt: function () {
    var orderId = this.data.orderInfo.order_id,
        that = this;

    app.showModal({
      content: '确定已收到货物？',
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      confirm: function () {
        app.sendRequest({
          url: '/index.php?r=AppShop/comfirmOrder',
          data: {
            order_id: orderId,
            sub_shop_app_id: that.data.franchiseeId
          },
          success: function (res) {
            var data = {};

            data['orderInfo.status'] = 3;
            that.setData(data);
          }
        })
      }
    })
  },
  makeComment: function () {
    var franchiseeId = this.data.franchiseeId,
        pagePath = '/pages/makeComment/makeComment?detail='+this.data.orderInfo.order_id+(franchiseeId ? '&franchisee='+franchiseeId : '');
    app.turnToPage(pagePath);
  },
  addAddress: function () {
    var orderId = this.data.orderInfo.order_id;
    app.turnToPage('/pages/addAddress/addAddress?oid=' + orderId);
  },
  selectAddress: function (e) {
    var index = e.currentTarget.dataset.index,
        orderId = this.data.orderInfo.order_id,
        newAddress = this.data.addressList[index],
        that = this;

    app.sendRequest({
      url: '/index.php?r=AppShop/setAddress',
      data: {
        order_id: orderId,
        address_id: newAddress.id,
        sub_shop_app_id: that.data.franchiseeId,
        is_self_delivery: delivery
      },
      success: function (res) {
        that.setData({
          'orderInfo.address_info': newAddress.address_info
        });
        that.hideAddressList();
        that.changeFreightWay();
      }
    });
  },
  editAddress: function (e) {
    var index = e.currentTarget.dataset.index,
        addressId = this.data.addressList[index].id,
        orderId = this.data.orderInfo.order_id;

    app.turnToPage('/pages/addAddress/addAddress?id=' + addressId + '&oid=' + orderId);
  },
  showAddressList: function () {
    var addressId = this.data.selectAddressId,
        orderId = this.data.orderInfo.order_id,
        franchiseeId = this.data.franchiseeId;

    app.turnToPage('/pages/myAddress/myAddress?id=' + addressId + '&oid=' + orderId + '&sub_shop_id=' + franchiseeId,true);
  },
  showAddAddress: function () {
    var orderId = this.data.orderInfo.order_id;
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
              countyName: res.countyName || '',
              order_id: orderId
            },
            success: function () {
              _this.dataInitial();
            },
          })
        }
      })
    } else {
      var orderId = this.data.orderInfo.order_id;
      app.turnToPage('/pages/addAddress/addAddress?oid=' + orderId);
    }
  },
  hideAddressList: function () {
    this.setData({
      addressDialogHidden: true
    })
  },
  deleteAddress: function (e) {
    var index = e.currentTarget.dataset.index,
        id = this.data.addressList[index].id,
        that = this;

    app.showModal({
      content: '确定要删除地址？',
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      confirm: function () {
        app.sendRequest({
          url: '/index.php?r=AppShop/delAddress',
          data: {
            address_id: id
          },
          success: function (res) {
            var list = that.data.addressList,
                data = {};

            list.splice(index, 1);
            data.addressList = list;
            if (id == that.data.orderInfo.address_info.id) {
              data['orderInfo.address_info'] = null;
            }
            that.setData(data);
          }
        })
      }
    })
  },
  previewImage: function (e) {
    app.previewImage({
      current: e.currentTarget.dataset.src
    });
  },
  goToHomepage: function () {
    var router = app.getHomepageRouter();
    app.turnToPage('/pages/' + router + '/' + router, true);
  },
  changeDiscount: function (e) {
    var _this = this;
    var index = _this.data.orderInfo.can_use_benefit.selected_index;
    var value = parseInt(e.detail.value);

    this.setData({
      index: value
    });

    var discount_type = _this.data.orderInfo.can_use_benefit.data[value].discount_type,
        coupon_id = _this.data.orderInfo.can_use_benefit.data[value].coupon_id;

    app.sendRequest({
      url: '/index.php?r=AppShop/ChangeOrder',
      data: {
        app_id: app.getAppId(),
        order_id: _this.data.orderInfo.order_id,
        discount_type: discount_type,
        coupon_id: coupon_id,
        sub_shop_app_id: _this.data.franchiseeId
      },
      success: function (res) {
        //console.log(res);
        _this.getOrderDetail(res.data[0].form_data.order_id);
      }
    });
  },
  verificationCode: function() {
    app.turnToPage('/pages/verificationCodePage/verificationCodePage?detail=' + this.data.orderInfo.order_id + '&sub_shop_app_id=' + this.data.franchiseeId);
  },
  customerConfirm: function(){
    var that = this;
    app.sendRequest({
      url: '/index.php?r=AppShop/CompleteTostoreOrder',
      data: {
        order_id: this.data.orderInfo.order_id
      },
      success: function(){
        var data = {};
        data['orderInfo.status'] = 6;
        that.setData(data);
      }
    })
  },
  isUseBalance: function(e){
    var _this = this;
    var isBalance = '';
    if(e){
      isBalance = Number(e.detail.value);
    } else {
      isBalance = 0;
    }
    app.sendRequest({
      url: '/index.php?r=AppShop/ChangeOrder',
      data: {
        app_id: app.getAppId(),
        order_id: _this.data.orderInfo.order_id,
        sub_shop_app_id: _this.data.franchiseeId,
        is_balance: isBalance
      },
      success: function (res) {
        _this.getOrderDetail(res.data[0].form_data.order_id);
      }
    });
  },
  // 运费
  freghtRadioChange:function(e){
    var data = '',
      _this = this,
      orderId = this.data.orderInfo.order_id,
      delivery = '';
    if (e.detail.value == 2){
      data = true;
      delivery = 1;
    }else{
      data = false;
      delivery = 0;
    }
    app.sendRequest({
      url: '/index.php?r=AppShop/setAddress',
      data: {
        is_self_delivery: delivery,
        order_id: orderId,
        address_id: _this.data.selectAddressId,
        sub_shop_app_id: _this.data.franchiseeId,
      },
      success: function (res) {
        _this.changeFreightWay();
      }
    });
    this.setData({
      freghtSwitch: data,
      delivery: delivery
    });
  },
  getFreigtAdress:function(){
    var that = this;
    app.sendRequest({
      url: '/index.php?r=AppShop/getAppShopLocationInfo',
      data: {
        app_id: app.getAppId()
      },
      success: function (res) {
        that.setData({
          freightAdress: res.data
        });
      }
    });
  },
  freightGoMap:function(){
    var _this = this,
      infor = _this.data.freightAdress.region_string + _this.data.freightAdress.shop_location;
    infor = infor.replace(/\s+/g,'');
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
  initialAddressId:function(){
    var that = this;
    app.sendRequest({
      url: '/index.php?r=AppShop/addressList',
      data: {
        app_id: app.getAppId()
      },
      success: function (res) {
        if(res.data.length){
          that.setData({
            selectAddressId: res.data[0].id
          });
        }
      }
    });
  },
  changeFreightWay:function(){
    var _this = this;
    var isBalance = Number(e.detail.value);
    app.sendRequest({
      url: '/index.php?r=AppShop/ChangeOrder',
      data: {
        app_id: app.getAppId(),
        order_id: _this.data.orderInfo.order_id,
        sub_shop_app_id: _this.data.franchiseeId
      },
      success: function (res) {
        _this.getOrderDetail(res.data[0].form_data.order_id);
      }
    });
  },
  freightPlayPhone:function(){
    var that = this;
    app.makePhoneCall(that.data.freightAdress.shop_contact)
  }
})
