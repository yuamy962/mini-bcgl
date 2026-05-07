const { showLoading, hideLoading, toast, formatDate } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    timelineGroups: [],
    loading: true,
    hasMore: false,
  },

  onLoad() {
    this.loadTimeline();
  },

  onShow() {
    if (app.globalData.shouldRefreshTimeline) {
      app.globalData.shouldRefreshTimeline = false;
      this.loadTimeline();
    }
  },

  onPullDownRefresh() {
    this.loadTimeline().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadTimeline() {
    this.setData({ loading: true });
    const db = wx.cloud.database();
    const patientId = app.globalData.currentPatientId || app.globalData.openid;

    db.collection('timeline')
      .where({ patientId })
      .orderBy('date', 'desc')
      .orderBy('createTime', 'desc')
      .limit(50)
      .get()
      .then(res => {
        const groups = this.groupByDate(res.data || []);
        this.setData({
          timelineGroups: groups,
          loading: false,
          hasMore: false,
        });
      })
      .catch(err => {
        hideLoading();
        console.error('加载时间轴失败', err);
        toast('加载失败');
        this.setData({ loading: false });
      });
  },

  groupByDate(list) {
    const map = {};
    const typeNameMap = {
      psa: '指标', check: '检查', injection: '打针',
      medicine: '用药', visit: '复诊', note: '备注',
    };
    list.forEach(item => {
      const date = item.date || formatDate(item.createTime);
      if (!map[date]) map[date] = [];
      map[date].push({ ...item, typeName: typeNameMap[item.type] || item.type });
    });
    return Object.keys(map)
      .sort((a, b) => b.localeCompare(a))
      .map(date => ({ date, items: map[date] }));
  },

  onAddRecord() {
    wx.navigateTo({ url: '/pages/record/index' });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/timeline/detail?id=${id}` });
  },
});
