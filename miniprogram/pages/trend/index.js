const { showLoading, hideLoading, toast } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    indicatorList: [],
    filteredList: [],
    recordList: [],
    loading: true,
    currentRange: 6,
    rangeOptions: [
      { label: '3次', value: 3 },
      { label: '6次', value: 6 },
      { label: '12次', value: 12 },
    ],
    riskInfo: null,
    trendSummary: '',
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
        console.log('【调试】indicators 查询结果条数:', list.length, list);
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
    const recordList = filtered.slice().reverse(); // 倒序用于列表展示
    this.setData({ filteredList: filtered, recordList });
    this.checkRisk(filtered);
    this.genTrendSummary(filtered);
  },

  genTrendSummary(list) {
    if (list.length < 2) {
      this.setData({ trendSummary: '' });
      return;
    }
    const first = Number(list[0].value);
    const last = Number(list[list.length - 1].value);
    const diff = last - first;
    const pct = first !== 0 ? Math.round(Math.abs(diff) / first * 100) : 0;
    const direction = diff < 0 ? '下降' : diff > 0 ? '上升' : '稳定';
    const times = list.length;
    let summary = `近${times}次 TPSA 呈${direction}趋势`;
    if (pct > 0) {
      summary += `，约 ${pct}%`;
    }
    this.setData({ trendSummary: summary });
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
      risk = { level: 'high', text: '建议持续关注指标变化，并结合医生意见定期复查' };
    } else if (value > 4) {
      risk = { level: 'medium', text: '建议持续关注指标变化，并结合医生意见定期复查' };
    }
    if (isRising) {
      risk = risk || { level: 'medium', text: '' };
      risk.text = risk.text ? risk.text + '，近期指标呈连续上升趋势，请留意后续变化' : '近期指标呈连续上升趋势，请留意后续变化';
    }
    this.setData({ riskInfo: risk });
  },

  onAcceptDisclaimer() {
    wx.setStorageSync('trend_disclaimer', true);
    this.setData({ disclaimerAccepted: true });
  },
});
