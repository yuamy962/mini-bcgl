const app = getApp();
const { showLoading, hideLoading, toast } = require('../../utils/util.js');

Page({
  data: {
    hasProfile: false,
    loading: true,
    patientInfo: null,
    homeData: null,
  },

  onLoad(options) {
    // 保存邀请参数
    if (options.action === 'accept' && options.patientId) {
      app.globalData.pendingInvite = { patientId: options.patientId };
    }
    this.checkProfile();
  },

  onShow() {
    if (app.globalData.shouldRefreshHome) {
      app.globalData.shouldRefreshHome = false;
      this.loadHomeData();
    }
    // 处理待处理的邀请
    if (app.globalData.pendingInvite && app.globalData.openid) {
      const invite = app.globalData.pendingInvite;
      app.globalData.pendingInvite = null;
      this.acceptInvite(invite.patientId);
    }
  },

  onPullDownRefresh() {
    this.loadHomeData().finally(() => wx.stopPullDownRefresh());
  },

  checkProfile() {
    showLoading();
    app.checkPatientProfile((hasProfile, patientInfo) => {
      hideLoading();
      if (hasProfile) {
        this.setData({ hasProfile: true, patientInfo, loading: false });
        this.loadHomeData();
      } else {
        this.setData({ loading: false });
        wx.redirectTo({ url: '/pages/profile/create' });
      }
    });
  },

  loadHomeData() {
    return wx.cloud.callFunction({ name: 'getHomeData' })
      .then(res => {
        const result = res.result;
        if (result && result.success) {
          this.setData({ homeData: result.data });
          if (result.data.patientInfo) {
            app.globalData.patientInfo = result.data.patientInfo;
            this.setData({ patientInfo: result.data.patientInfo });
          }
        }
      })
      .catch(err => {
        console.error('加载首页数据失败', err);
      });
  },

  acceptInvite(patientId) {
    if (patientId === app.globalData.openid) {
      toast('不能邀请自己');
      return;
    }
    wx.cloud.callFunction({
      name: 'acceptFamilyInvite',
      data: { patientId },
    }).then(res => {
      const result = res.result;
      if (result.success) {
        toast('加入家庭成功', 'success');
        app.globalData.currentPatientId = patientId;
        app.globalData.isMainUser = false;
        this.loadHomeData();
      } else {
        toast(result.msg || '加入失败');
      }
    }).catch(err => {
      console.error('接受邀请失败', err);
      toast('加入失败');
    });
  },

  goToEditProfile() {
    wx.navigateTo({ url: '/pages/profile/edit' });
  },

  goToTimeline() { wx.switchTab({ url: '/pages/timeline/index' }); },
  goToTrend() { wx.switchTab({ url: '/pages/trend/index' }); },
  goToReminder() { wx.switchTab({ url: '/pages/reminder/index' }); },
  goToFamily() { wx.navigateTo({ url: '/pages/family/index' }); },

  onAddRecord() {
    wx.navigateTo({ url: '/pages/record/index' });
  },

  goToSummary() {
    wx.navigateTo({ url: '/pages/summary/index' });
  },
});
