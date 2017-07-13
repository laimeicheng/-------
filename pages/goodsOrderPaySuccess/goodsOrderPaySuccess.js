
var app = getApp()

Page({
  data: {
    totalPayment: ''
  },
  orderId: '',
  onLoad: function (options) {
    this.orderId = options.detail || '';
    this.franchiseeId = options.franchisee || '';
    // this.getOrderDetail();
  },
  // getOrderDetail: function(){
  //   var that = this;
  //   app.getOrderDetail({
  //     data: {
  //       order_id: this.orderId,
  //       sub_shop_app_id: this.franchiseeId
  //     },
  //     success: function (res) {
  //       that.setData({
  //         totalPayment: res.data[0].form_data.total_price
  //       })
  //     }
  //   })
  // },
  goToHomepage: function(){
    var router = app.getHomepageRouter();
    app.turnToPage('/pages/' + router + '/' + router, true);
  },
  goToOrderDetail: function(){
    app.turnToPage('/pages/goodsOrderDetail/goodsOrderDetail?detail='+this.orderId+(this.franchiseeId ? '&franchisee='+this.franchiseeId : ''), true);
  }
})
