
var app = getApp()
var util = require('../../utils/util.js')

Page({
  data: {
    goods_info: [],
    additional_info_obj: {},
    from: ''
  },
  delivery_id_arr: [],
  goods_id_arr: [],
  onLoad: function (options) {
    if(options.from){
      this.setData({
        from: options.from
      })
    }
    this.dataInitial();
  },
  dataInitial: function () {
    var goodsInfo = app.getPreviewGoodsInfo(),
      additional_info = app.getGoodsAdditionalInfo(),
      additionalInfoWrited = false;

    this.setData({
      goods_info: goodsInfo,
      additional_info_obj: additional_info
    });

    for (var key in additional_info) {
      if(key !== undefined){
        additionalInfoWrited = true;
        break;
      }
    }

    if(additionalInfoWrited){
      return;
    }
    for (var i = 0; i <= goodsInfo.length - 1; i++) {
      // var delivery_id = goodsInfo[i].delivery_id;
      if(this.goods_id_arr.indexOf(goodsInfo[i].id) == -1){
        this.goods_id_arr.push(goodsInfo[i].id);
        this.delivery_id_arr.push(goodsInfo[i].delivery_id);
      }
    }
    if(this.delivery_id_arr.length){
      this.getDeliveryInfo();
    }
  },
  getDeliveryInfo: function(){
    var that = this;
    app.sendRequest({
      hideLoading: true,
      url: '/index.php?r=pc/AppShop/GetDelivery',
      method: 'post',
      data: {
        delivery_ids: this.delivery_id_arr
      },
      success: function(res){
        var goods_info = that.data.goods_info,
          delivery_arr = res.data,
          additional_info_obj = {};

        for (var i = 0; i <= delivery_arr.length - 1; i++) {
          var goods_id = goods_info[i].id,
            delivery_info = delivery_arr[i].delivery_info;

          additional_info_obj[goods_id] = [];
          for (var j = 0; j <= delivery_info.length - 1; j++) {
            if(delivery_info[j].is_hidden == 1){        // is_hidden = 1 时不隐藏字段
              additional_info_obj[goods_id].push({
                title: delivery_info[j].name,
                type: delivery_info[j].type,
                value: ''
              })
            }
          }
        }
        that.setData({
          additional_info_obj: additional_info_obj
        });
      }
    })
  },
  inputFormControl: function(e){
    var goodsId = e.currentTarget.dataset.goodsId,
      additionalIndex = e.currentTarget.dataset.additionalIndex,
      value = e.detail.value,
      data = {};

    data['additional_info_obj.'+goodsId+'['+additionalIndex+'].value'] = value;
    this.setData(data);
  },
  uploadImg: function(e){
    var that = this,
      goodsId = e.currentTarget.dataset.goodsId,
      additionalIndex = e.currentTarget.dataset.additionalIndex,
      images = this.data.additional_info_obj[goodsId][additionalIndex].value || [];

    app.chooseImage(function(imageArr){
      var data = {};
      data['additional_info_obj.'+goodsId+'['+additionalIndex+'].value'] = images.concat(imageArr);
      that.setData(data);
    })
  },
  deleteImage: function(e){
    var dataset = e.currentTarget.dataset,
      goodsId = dataset.goodsId,
      additionalIndex = dataset.additionalIndex,
      imageIndex = dataset.imageIndex,
      images = this.data.additional_info_obj[goodsId][additionalIndex].value,
      data = {};

    images.splice(imageIndex, 1);
    data['additional_info_obj.'+goodsId+'['+additionalIndex+'].value'] = images;
    this.setData(data);
  },
  submitAdditionalInfo: function(){
    var additional_info_obj = this.data.additional_info_obj,
      completeInfo = true;

    for(var goodsId in additional_info_obj){
      if(!completeInfo){
        break;
      }
      if(additional_info_obj[goodsId]){
        var goods_additional_info = additional_info_obj[goodsId];
        for (var i = 0; i <= goods_additional_info.length - 1; i++) {
          if(!goods_additional_info[i].value || goods_additional_info[i].value.length == 0){
            completeInfo = false;
            break;
          }
        }
      }
    }

    if(!completeInfo){
      app.showModal({
        content: '请填写商品补充信息'
      })
      return;
    }

    var pages = getCurrentPages();
    pages[pages.length - 2].additional_info = this.data.additional_info_obj;
    app.turnBack();
  },
  previewImage: function(e){
    var dataset = e.currentTarget.dataset,
      goodsId = dataset.goodsId,
      additionalIndex = dataset.additionalIndex,
      imageIndex = dataset.imageIndex,
      urls = this.data.additional_info_obj[goodsId][additionalIndex].value;

    app.previewImage({
      current: urls[imageIndex],
      urls: urls
    });
  }
})
