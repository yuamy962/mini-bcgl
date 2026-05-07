const { showLoading, hideLoading, toast } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    indicatorList: [],
    filteredList: [],
    loading: true,
    currentRange: 6,
    rangeOptions: [
      { label: '3次', value: 3 },
      { label: '6次', value: 6 },
      { label: '12次', value: 12 },
    ],
    riskInfo: null,
    disclaimerAccepted: false,
  },

  onLoad() {
    this.loadIndicators();
    const accepted = wx.getStorageSync('trend_disclaimer');
    this.setData({ disclaimerAccepted: !!accepted });
  },

  onShow() {
    if (app.globalData.shouldRefreshTimeline) {
      app.globalData.shouldRefreshTimeline = false;
      this.loadIndicators();
    }
  },

  onPullDownRefresh() {
    this.loadIndicators().finally(() => wx.stopPullDownRefresh());
  },

  loadIndicators() {
    this.setData({ loading: true });
    const db = wx.cloud.database();
    const patientId = app.globalData.currentPatientId || app.globalData.openid;

    db.collection('indicators')
      .where({ patientId, indicatorType: 'TPSA' })
      .orderBy('date', 'desc')
      .limit(20)
      .get()
      .then(res => {
        const list = res.data || [];
        const ascList = list.slice().reverse();
        this.setData({ indicatorList: ascList, loading: false });
        this.filterData(this.data.currentRange);
      })
      .catch(err => {
        console.error('加载指标失败', err);
        this.setData({ loading: false });
        toast('加载失败');
      });
  },

  onRangeChange(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const range = this.data.rangeOptions[index].value;
    this.setData({ currentRange: range });
    this.filterData(range);
  },

  filterData(range) {
    const total = this.data.indicatorList.length;
    const start = Math.max(0, total - range);
    const filtered = this.data.indicatorList.slice(start);
    this.setData({ filteredList: filtered });
    this.checkRisk(filtered);
  },

  checkRisk(list) {
    if (!list || list.length === 0) {
      this.setData({ riskInfo: null });
      return;
    }
    const latest = list[list.length - 1];
    const value = Number(latest.value);
    let risk = null;
    let isRising = false;
    if (list.length >= 3) {
      const last3 = list.slice(-3);
      isRising = Number(last3[1].value) > Number(last3[0].value) && Number(last3[2].value) > Number(last3[1].value);
    }
    if (value > 10) {
      risk = { level: 'high', text: 'TPSA > 10，建议尽快就医检查' };
    } else if (value > 4) {
      risk = { level: 'medium', text: 'TPSA > 4，建议持续关注并结合医生意见复查' };
    }
    if (isRising) {
      risk = risk || { level: 'medium', text: '' };
      risk.text = risk.text ? risk.text + '；指标连续上升，请关注后续变化' : '指标连续上升，请关注后续变化';
    }
    this.setData({ riskInfo: risk });
  },

  onAcceptDisclaimer() {
    wx.setStorageSync('trend_disclaimer', true);
    this.setData({ disclaimerAccepted: true });
  },
});
