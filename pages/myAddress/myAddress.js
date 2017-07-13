
var app = getApp()

Page({
  data: {
    selectAddressId: '',
    orderId: '',
    addressList: [],
    afterInitial: false,
    isFromBack: false,
    from: ''
  },
  subShopId: '',
  onLoad: function(options){
    var that = this,
        selectAddressId = options.id,
        orderId = options.oid,
        from = options.from;

    this.subShopId = options.sub_shop_id || '';

    app.sendRequest({
      url: '/index.php?r=AppShop/addressList',
      success: function(res){
        var address = res.data,
            addressList = [];

        for(var i = 0, j = address.length-1 ; i <= j; i++){
          addressList.push(address[i]);
        }
        that.setData({
          addressList: addressList,
          selectAddressId: selectAddressId,
          orderId: orderId,
          afterInitial: true,
          from: from
        })
      }
    })
  },
  onShow: function(){
    if(this.data.isFromBack){
      var that = this;
      app.sendRequest({
        url: '/index.php?r=AppShop/addressList',
        success: function(res){
          var address = res.data,
              addressList = [];

          for(var i = 0, j = address.length-1 ; i <= j; i++){
            addressList.push(address[i]);
          }
          that.setData({
            addressList: addressList
          })
        }
      })
    } else {
      this.setData({
        isFromBack: true
      })
    };
    // app.checkIfBindPhone();
  },
  addAddress : function(){
    var _this = this;
    if(wx.chooseAddress){
      wx.chooseAddress({
        success : function(res){
          app.sendRequest({
            method : 'post',
            url : '/index.php?r=AppShop/AddWxAddress',
            data : {
              detailInfo : res.detailInfo || '',
              cityName : res.cityName || '',
              provinceName : res.provinceName || '',
              UserName : res.userName || '',
              telNumber : res.telNumber || '',
              district : res.district || '',
              countyName : res.countyName || ''
            },
            success : function(){
              app.sendRequest({
                url : '/index.php?r=AppShop/addressList',
                success : function(res){
                  var address = res.data,
                      addressList = [];
                  for(var i = 0, j = address.length - 1; i <= j; i++){
                    addressList.push(address[i]);
                  }
                  _this.setData({
                    addressList : addressList
                  })
                }
              })
            }
          })
        }
      })
    } else {
      app.turnToPage('/pages/addAddress/addAddress');
    }
  },
  deleteAddress: function(e){
    var that = this,
        deleteId = e.target.dataset.id;

    app.showModal({
      content: '确定要删除地址？',
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      confirm: function(){
        app.sendRequest({
          url: '/index.php?r=AppShop/delAddress',
          data: {
            address_id: deleteId
          },
          success: function(res){
            var addressList = that.data.addressList;

            for (var i = 0; i <= addressList.length - 1; i++) {
              if(addressList[i].id == deleteId){
                addressList.splice(i, 1);
              }
            }
            that.setData({
              addressList: addressList
            })
          }
        })
      }
    })
  },
  selectAddress: function(e){
    var addressId = e.currentTarget.dataset.id,
        orderId = this.data.orderId,
        that = this;

    this.setData({
      selectAddressId: addressId
    })

    if(orderId){
      // 修改订单详情地址
      app.sendRequest({
        url: '/index.php?r=AppShop/setAddress',
        data: {
          order_id: orderId,
          address_id: addressId,
          sub_shop_app_id: that.subShopId
        },
        success: function(res){
          that.changeFreightWay();
        }
      });

    } else {
      // 修改结算页面地址
      var pages = getCurrentPages(),
          prePage = pages[pages.length - 2],
          addressList = this.data.addressList;

      for (var i = addressList.length - 1; i >= 0; i--) {
        if(addressList[i].id == addressId){
          prePage.setData({
            selectAddress: addressList[i]
          });
        }
      };
      app.turnBack();
    }
  },
  changeFreightWay:function(){
    var _this = this;
    app.sendRequest({
      url: '/index.php?r=AppShop/ChangeOrder',
      data: {
        order_id: _this.data.orderId,
        sub_shop_app_id: _this.subShopId
      },
      success: function (res) {
        let router = 'orderDetail';
        let url = '/pages/' + router + '/' + router + '?detail=' + res.data[0].form_data.order_id +'&franchisee=' + _this.subShopId;
        app.turnToPage(url, true);
      }
    });
  },
  editAddress: function(e){
    var addressId = e.currentTarget.dataset.id;

    app.turnToPage('/pages/addAddress/addAddress?id='+addressId);
  }
})
