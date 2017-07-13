var appInstance = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    showResult: false, //搜索结果展示
    itemStyle: 1, //商品列表显示方式 单列显示 1  双列显示 2
    tab: 0,
    direction: 0,
    prevPage: 0,
    pageData: {},
    itemsList: [],
    history: [],
    inputContent: '',
    filterParam: {
      form: 'goods',
      page: 1,
      page_size: 10,
      sort_key: '',
      sort_direction: '',
      is_integral: '',
      idx_arr: {
        idx: '',
        idx_value: ''
      },
      search_value: '',
      region_id: ''
    },
    animationData: {},
    filter: false,
    locationList: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({options});
    var _this = this;
    wx.getStorage({
      key: 'history',
      success: function (res) {
        _this.setData({ history: res.data });
      }
    })

    this.getCategory();
    this.getLocations();
    this.getCurrentLocation();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    if (this.data.options.param) {
      this.data.filterParam.search_value = '';
      this.initialData();
      this.filterList();
    }
  },

  /**
   * 生命周期函数--监听页面销毁
   */
  onUnload: function () {
    this.setData({options:{}})
  },

  /**
   * 初始化过滤参数
   */
  initFilter: function () {
    this.setData({ tab: 0, prevPage: 0 });
    this.data.filterParam.page = 1;
    this.data.filterParam.sort_key = '';
    this.data.filterParam.sort_direction = '';
    this.data.filterParam.idx_arr.idx = '';
    this.data.filterParam.idx_arr.idx_value = '';
    this.data.filterParam.region_id = '';
    this.setData({ currentCategory: '', currentLocation: '' });
  },

  /**
   * 搜索方法
   */
  searchList: function () {
    this.initFilter();
    this.data.filterParam.search_value = this.data.inputContent;
    this.data.filterParam.page = 1;
    if (this.data.inputContent === '') { return };
    this.initialData();

    let history = this.data.history;
    history.push(this.data.inputContent);
    this.setData({ history: history });
    wx.setStorage({
      key: "history",
      data: history
    })
  },

  /**
   * 快速搜索方法
   */
  quickSearch: function (e) {
    this.initFilter();
    this.data.filterParam.search_value = e.target.dataset.tag;
    this.data.filterParam.page = 1;
    this.setData({ inputContent: e.target.dataset.tag })
    this.initialData();
  },

  /**
   * 添加到购物车
   */
  addToCart: function (e) {
    appInstance.sendRequest({
      url: '/index.php?r=AppShop/addCart',
      data: {
        goods_id: e.target.dataset.id,
        num: 1
      },
      success: function (res) {
        appInstance.showToast({
          title: '添加成功',
          icon: 'success',
          duration: 1000
        });
      }
    })
  },

  /**
   * 初始化数据
   */
  initialData: function () {
    let _this = this;
    this.data.filterParam.page = 1;
    this.setData({ prevPage: 0 });
    this.setData({ showResult: true, itemsList: [] });

    appInstance.sendRequest({
      url: '/index.php?r=AppShop/GetGoodsList',
      method: 'post',
      data: this.data.filterParam,
      success: function (res) {
        _this.setData({ itemsList: res.data });
        _this.setData({ pageData: res });
      }
    })
  },

  /**
   * 加载更多数据
   */
  getMoreItems: function (e) {
    //console.log(e.target.dataset.curpage);
    let _this = this;
    let curPage = e.target.dataset.curpage;

    if (this.data.prevPage != curPage && this.data.pageData.is_more != 0) {
      _this.data.filterParam.page = _this.data.filterParam.page + 1;
      this.setData({ prevPage: curPage });

      appInstance.sendRequest({
        url: '/index.php?r=AppShop/GetGoodsList',
        method: 'post',
        data: this.data.filterParam,
        success: function (res) {
          _this.setData({ pageData: res });
          let itemsList = _this.data.itemsList.concat(res.data);
          _this.setData({ itemsList: itemsList });
        }
      })
    };

  },

  /**
   * 默认排序 tab = 0
   */
  sortByDefault: function (e) {
    this.data.filterParam.sort_key = '';
    this.data.filterParam.sort_direction = 0;
    if (this.data.tab == 0) { return };
    this.initialData();
    this.setData({ tab: 0 });
  },

  /**
   * 按销量排序 tab = 1
   */
  sortBySales: function () {
    this.data.filterParam.sort_key = 'sales';
    this.data.filterParam.sort_direction = 0;
    if (this.data.tab == 1) { return };
    this.initialData();
    this.setData({ tab: 1 });
  },

  /**
   * 按价格排序 tab = 2
   */
  sortByPrice: function (e) {
    let direction = e.currentTarget.dataset.direction

    this.data.filterParam.sort_key = 'price';
    this.data.filterParam.sort_direction = direction;
    this.initialData();
    if (direction == 0) { direction = 1 } else { direction = 0 };
    this.setData({ tab: 2, direction: direction });
  },

  /**
   * 打开筛选侧边栏
   */
  filterList: function (e) {
    let _this = this;
    this.setData({ filter: !_this.data.filter });
    var animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease',
    });
    this.animation = animation;
    animation.right(0).step();
    this.setData({
      animationData: animation.export()
    })
  },

  /**
   * 隐藏筛选侧边栏
   */
  hideFilter: function () {
    let _this = this;
    this.setData({ filter: !_this.data.filter });
    var animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease',
    });
    this.animation = animation;
    animation.right('-540rpx').step();
    this.setData({
      animationData: animation.export()
    })
  },

  /**
   * 切换显示模式
   */
  switchStyle: function (e) {
    let type = e.currentTarget.dataset.type;
    if (type == 1) { this.setData({ itemStyle: 2 }) } else { this.setData({ itemStyle: 1 }) };
  },

  /**
   * 获取搜索关键词
   */
  bindChange: function (e) {
    this.setData({ inputContent: e.detail.value });
  },

  /**
   * 清空搜索框内容
   */
  clearSearch: function () {
    this.setData({ inputContent: '' });
    this.setData({ showResult: false });
  },

  /**
   * 清空历史搜索记录
   */
  clearHistory: function () {
    let _this = this;
    wx.removeStorage({
      key: 'history',
      success: function (res) {
        _this.setData({ history: [] });
      }
    })
  },

  /**
   * 跳转到详情页
   */
  turnToDetail: function (e) {
    let id = e.currentTarget.dataset.id;
    let goodsType = e.currentTarget.dataset.goodsType;
    switch (+goodsType) {
      case 0:
      case 1: appInstance.turnToPage('/pages/goodsDetail/goodsDetail?detail=' + id);
        break;
      case 3: appInstance.turnToPage('/pages/toStoreDetail/toStoreDetail?detail=' + id);
        break;
    }
  },

  /**
   * 获取定位列表
   */
  getLocations: function () {
    let _this = this;
    appInstance.sendRequest({
      url: '/index.php?r=AppRegion/getAllExistedDataRegionList&is_xcx=1',
      success: function (data) {
        _this.setData({ locationList: data.data });
      },
    });
  },

  /**
   * 获取手机当前定位 
   */
  getCurrentLocation: function () {
    let _this = this;
    appInstance.getLocation({
      success: function (res) {
        let latitude = res.latitude,
          longitude = res.longitude;
        appInstance.sendRequest({
          url: '/index.php?r=Region/GetAreaInfoByLatAndLng',
          data: {
            latitude: latitude,
            longitude: longitude
          },
          success: function (res) {
            _this.setData({ currentLocation: res.data.addressComponent.district });
          }
        })
      }
    });
  },

  /**
   * 返回前一页
   */
  navigateBack: function () {
    wx.navigateBack({
      delta: 1
    })
  },

  /**
   * 获取分类
   */
  getCategory: function () {
    let _this = this;
    appInstance.sendRequest({
      url: '/index.php?r=pc/AppAdminCategory/list',
      method: 'post',
      data: { form: 'goods' },
      success: function (res) {
        _this.setData({ cateData: res.data });
      }
    })
  },

  /**
   * 设置城市筛选
   */
  setLocationFilter: function (e) {
    let id = e.currentTarget.dataset.id;
    let name = e.currentTarget.dataset.name;
    if (id == this.data.filterParam.region_id) {
      this.setData({ currentLocation: '' });
      this.data.filterParam.region_id = '';
    } else {
      this.data.filterParam.region_id = id;
      this.setData({ currentLocation: name });
    };
  },

  /**
  * 设置分类筛选
  */
  setCategoryFilter: function (e) {
    let id = e.currentTarget.dataset.id;
    let idx = e.currentTarget.dataset.idx;
    if (id == this.data.filterParam.idx_arr.idx_value) {
      this.setData({ currentCategory: '' });
      this.data.filterParam.idx_arr.idx = '';
      this.data.filterParam.idx_arr.idx_value = '';
    } else {
      this.data.filterParam.idx_arr.idx = idx;
      this.data.filterParam.idx_arr.idx_value = id;
      this.setData({ currentCategory: id });
    };
  },

  /**
   * 确定按照过滤条件搜索
   */
  confirmFilter: function (e) {
    this.initialData();
    this.hideFilter();
  }

})