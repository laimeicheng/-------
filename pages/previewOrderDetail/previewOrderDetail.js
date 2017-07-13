
var app = getApp()
var util = require('../../utils/util.js')

Page({
  data: {
    goodsList: [],
    wayOfDine: 1,  // 1: 点餐, 2: 预约
    discountDialogHidden: true,
    discountList: [],
    selectDiscountInfo: {},
    selectDiscountIndex: -1,
    appointmentTime: '',
    phone: '',
    orderRemark: '',
    optionalTimeStart: '',
    optionalTimeEnd: '',
    location_data_arr:'',
    locationNum:'',
    locationId: 0,
    changeValue: 0,
    selectLocationId:'',
    locationTitle:''
  },
  changeNumTimeout: [],
  franchiseeId: '',
  cart_id_arr: [],
  cart_data_arr: [],
  isPaysuccessFlag: false,
  onLoad: function (options) {
    this.franchiseeId = options.franchisee || '';
    this.cart_id_arr = options.cart_arr ? decodeURIComponent(options.cart_arr).split(',') : [];
    this.dataInitial();
    if(app.globalData.urlLocationId){
      this.setData({
        locationId:app.globalData.urlLocationId,
        changeValue: 2
      })
      this.getDataId();
    }

  },
  dataInitial: function () {
    this.getCartList();
    this.location();
  },
  getCartList: function () {
    var that = this,
        franchiseeId = this.franchiseeId;

    app.sendRequest({
      url: '/index.php?r=AppShop/cartList',
      data: {
        page: 1,
        page_size: 100,
        sub_shop_app_id: franchiseeId,
        parent_shop_app_id: franchiseeId ? app.globalData.appId : ''
      },
      success: function(res){
        var data = [],
            tostoreData = [];
        if(that.cart_id_arr.length){
          for (var i = 0; i <= res.data.length - 1; i++) {
            if(that.cart_id_arr.indexOf(res.data[i].id) >= 0){
              tostoreData.push(res.data[i]);
            }
          }

        } else {
          tostoreData = res.data;
        }
        
        for (var i = 0; i < tostoreData.length;i++){
          if (tostoreData[i].goods_type == 3){
            data.push(tostoreData[i]);
          }
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
          goodsList: data,
          phone: app.getUserInfo().phone
        });

        that.getBenefit();
        that.getOptionalTime();
      }
    })
  },
  calculateCountPrice: function(){
    var list = this.data.goodsList,
        selectDiscountInfo = this.data.selectDiscountInfo,
        // totalCount = 0,
        price = 0;

    for (var i = 0; i <= list.length - 1; i++) {
      var goods = list[i];
      // totalCount += +goods.num;
      price += +goods.price * +goods.num;
    }

    switch(selectDiscountInfo.discount_type){
      case 'coupon':
        price = selectDiscountInfo.type == 0 ? price - +selectDiscountInfo.value : price*(+selectDiscountInfo.value)/10;
        break;
      case 'vip':
        price = price*(+selectDiscountInfo.value)/10;
        break;
      case 'integral':
        price -= +selectDiscountInfo.value;
        break;
      default :
        price = price;
        break;
    }

    this.setData({
      // goodsCountToPay: totalCount,
      totalPayment: (Math.floor(price*100)/100).toFixed(2)
    })
  },
  getBenefit: function(){
    var that = this;

    app.sendRequest({
      hideLoading: true,
      url: '/index.php?r=AppShop/GetCartCanUseBenefit',
      method: 'post',
      data: {
        cart_arr: this.cart_data_arr
      },
      success: function(res){
        var discounts = res.data.benefit_result.data;
        if(!discounts.length) return;
        discounts.unshift({
          discount_type: "none",
          title:"无优惠"
        })
        that.setData({
          discountList: discounts,
          selectDiscountInfo: res.data.selected_benefit
        });
      },
      complete: function(){
        that.calculateCountPrice();
      }
    })
  },
  getOptionalTime: function(){
    var that = this;
    app.sendRequest({
      url: '/index.php?r=AppShop/GetTostoreNearestAppointmentTime',
      success: function(res){
        that.setData({
          optionalTimeStart: res.data.substr(11,5)
        });
      }
    })
  },
  remarkInput: function (e) {
    var value = e.detail.value;
    if (value.length > 30){
      this.setData({
        remarkColor: 'red'
      })
    }else{
      this.setData({
        remarkColor: ''
      })
    }
    this.setData({
      orderRemark: value,
      remarkLength: value.length
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
    clearTimeout(this.changeNumTimeout[index]);
    var goods = this.data.goodsList[index],
        currentNum = +goods.num,
        targetNum = type == 'plus' ? currentNum + 1 : currentNum - 1,
        that = this,
        data = {},
        param;

    this.changeNumTimeout[index] = setTimeout(function(){
      if(targetNum == 0 && type == 'minus'){
        app.showModal({
          content: '确定从购物车删除该商品？',
          showCancel: true,
          confirm: function(){
            that.deleteGoods(index);
          }
        })
        return;
      }
      that.cart_data_arr[index].num = targetNum;
      // data['goodsList['+index+'].num'] = targetNum;
      // that.setData(data);
      param = {
        _app_id: app.getAppId(),
        app_id: app.getAppId(),
        session_key: app.getSessionKey(),
        goods_id: goods.goods_id,
        model_id: goods.model_id || '',
        num: targetNum,
        sub_shop_app_id: that.franchiseeId
      };
      // app.sendRequest({
      //   hideLoading: true,
      //   url: '/index.php?r=AppShop/addCart',
      //   data: param,
      //   success: function(res){
      //     // data = {};
      //     // that.cart_data_arr[index].cart_id = res.data;
      //     // data['goodsList['+index+'].cart_id'] = res.data;
      //     // that.setData(data);
      //     that.getBenefit();
      //   },
      //   fail: function(res){
      //     data = {};
      //     that.cart_data_arr[index].num = currentNum;
      //     data['goodsList['+index+'].num'] = currentNum;
      //     that.setData(data);
      //   }
      // })
      wx.request({
        url: app.getSiteBaseUrl() + '/index.php?r=AppShop/addCart',
        data: param,
        success: function (res) {
          if (res.data.status == 0) {
            that.cart_data_arr[index].num = targetNum;
            data['goodsList[' + index + '].num'] = targetNum;
            that.setData(data);
            that.getBenefit();
          } else {
            if (res.data.status == 401 || res.data.status == 2) {
              // 未登录
              app.login();
              return;
            }
            data = {};
            that.cart_data_arr[index].num = targetNum;
            data['goodsList[' + index + '].num'] = targetNum;
            data['goodsList[' + index + '].num'] = currentNum;
            that.setData(data);
            app.showModal({
              content: res.data.data
            })
          }
        },
        fail: function(res){
          data = {};
          that.cart_data_arr[index].num = currentNum;
          data['goodsList['+index+'].num'] = currentNum;
          that.setData(data);
        }
      })

    }, 500);
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
        sub_shop_app_id: this.franchiseeId
      },
      success: function(res){
        (listExcludeDelete = goodsList.concat([])).splice(index, 1);
        if(listExcludeDelete.length == 0){
          app.turnBack();
        }

        that.changeNumTimeout.splice(index, 1);
        that.cart_data_arr.splice(index, 1);
        that.setData({
          goodsList: listExcludeDelete,
          // goodsCount: listExcludeDelete.length
        })
        that.getBenefit();
      }
    });
  },
  confirmPayment: function(e){
    var list = this.data.goodsList,
        appointmentTime = this.data.appointmentTime,
        that = this,
        locationId = this.data.locationId;
    if(!util.isPhoneNumber(this.data.phone)){
      app.showModal({
        content: '请填写正确的手机号码'
      });
      return;
    }
    if (this.data.orderRemark.length > 30) {
      app.showModal({
        content: '备注字数超过限制'
      });
      return;
    }
    if(this.data.wayOfDine == 2){
      if(!appointmentTime){
        app.showModal({
          content: '请选择预约时间'
        });
        return;
      }
      appointmentTime = util.formatTime(new Date()).slice(0, 11) + appointmentTime;
    }
    if (that.isPaysuccessFlag){
      return;
    }
    that.isPaysuccessFlag = true;
    wx.request({
      url: app.getSiteBaseUrl() + '/index.php?r=AppShop/addCartOrder',
      method: 'post',
      header: {
        'content-type': 'application/x-www-form-urlencoded;'
      },
      data: app.modifyPostParam({
        _app_id: app.getAppId(),
        app_id: app.getAppId(),
        session_key: app.getSessionKey(),
        cart_arr: this.cart_data_arr,
        formId: e.detail.formId,
        sub_shop_app_id: this.franchiseeId,
        selected_benefit: this.data.selectDiscountInfo,
        tostore_order_type: this.data.wayOfDine,
        tostore_appointment_time: appointmentTime,
        tostore_buyer_phone: this.data.phone,
        tostore_remark: this.data.orderRemark,
        location_id: locationId
      }),
      success: function(res){
        if(res.data.status == 0){
          that.payOrder(res.data.data);
          return;
        } else if (res.data.status == 1 || res.data.status == 12){
          // var goodsId = res.data.expired_goods_arr;
          // for (var j=0;i<that.cart_data_arr.length;i++){
          //   var id = that.cart_data_arr[j].goods_id;
          //   for (var i = 0; i < goodsId.length; i++) {
          //     if (id == goodsId[i].goods_id){
          //       that.deleteGoods(i);
          //     }
      
          //   }
          // }
          app.showModal({
            content: res.data.data,
            confirm: function(){
              app.turnBack();
            }
          })
        }else if (res.data.status == 401 || res.data.status == 2) {
          // 未登录
          app.login();
          return;
        }
      }
    });
  },
  payOrder: function(orderId){
    var that = this;

    function paySuccess() {
      var pagePath = '/pages/paySuccess/paySuccess?detail=' + orderId + (that.franchiseeId ? '&franchisee='+that.franchiseeId : '');

      setTimeout(function(){
        app.turnToPage(pagePath, 1);
      }, 1500);
    }

    function payFail(){
      app.turnToPage('/pages/tostoreOrderDetail/tostoreOrderDetail?detail=' + orderId, 1);
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
  showDiscount: function(){
    this.setData({
      discountDialogHidden: false
    })
  },
  hideDiscount: function(){
    this.setData({
      discountDialogHidden: true
    })
  },
  chooseWayOfDine: function(e){
    var wayOfDine = e.currentTarget.dataset.way,
        that = this;
    this.setData({
      wayOfDine: wayOfDine
    });
    if (wayOfDine == 2){
      var cart_data_arr = this.cart_data_arr,
          goods_ids = [];
      for (var i = 0; i < cart_data_arr.length;i++){
        goods_ids.push(cart_data_arr[i].goods_id);
      }
      app.sendRequest({
        url: '/index.php?r=AppShop/getAvaliableTostoreAppointBusinessTime',
        method: 'post',
        data: {
          good_ids: goods_ids
        },
        success: function (res) {
          if (res.data.length) {
            var businesssTimeString = '';
            for (var i = 0; i < res.data.length; i++) {
              businesssTimeString += res.data[i].start_time.substring(0, 2) + ':' + res.data[i].start_time.substring(2, 4) + '-' + res.data[i].end_time.substring(0, 2) + ':' + res.data[i].end_time.substring(2, 4) + '/';
            }
            businesssTimeString = '可预约时间：' + businesssTimeString.substring(0, businesssTimeString.length - 1);
            that.setData({
              businesssTimeString: businesssTimeString
            })
          }
        }
      })
    }
  },
  bindTimeChange: function(e){
    var time = e.detail.value;
    this.setData({
      appointmentTime: time
    });
  },
  inputPhone: function(e){
    var phone = e.detail.value;
    this.setData({
      phone: phone
    });
    app.setUserInfoStorage({
      phone: phone
    })
  },
  discountChange: function(e){
    var index = e.detail.value,
        that = this;

    setTimeout(function(){
      that.setData({
        selectDiscountInfo: that.data.discountList[index],
        selectDiscountIndex: index,
        discountDialogHidden: true
      })
      that.calculateCountPrice();
    }, 500);
  },
  location:function(e){
    var that = this;
    app.sendRequest({
      url: '/index.php?r=AppShop/locationDataList',
      data: {
        page_size:1000
      },
      success:function(res){
        if (res.data.length){
          that.setData({
            location_data_arr: res.data
          })
        }
      }
    })
  },
  bindLocationChange:function(e){
    var that = this;
    that.setData({
      locationNum:that.data.location_data_arr[e.detail.value].title,
      selectLocationId:that.data.location_data_arr[e.detail.value].id,
      locationId:that.data.location_data_arr[e.detail.value].id,
      locationSelect:true,
      changeValue: 1
    })

  },
  radioLocationChange:function(e){
    var that = this,
        locationId = '';
     if(e.detail.value == 0){
      locationId = 0;
      changeValue = 0;
    }else if(e.detail.value == 1){
      locationId = that.data.selectLocationId;
      changeValue = 1;
    }else{
      locationId = app.globalData.urlLocationId;
      changeValue = 2;
    }
    that.setData({
      locationId:locationId,
      changeValue: changeValue
    })
  },
  getDataId:function(e){
    var that = this;
    app.sendRequest({
      url: '/index.php?r=AppShop/getLocationData',
      data: {
        id:app.globalData.urlLocationId
      },
      success:function(res){
        that.setData({
          locationTitle:res.data.title
        })
      }
    })
  }
})
