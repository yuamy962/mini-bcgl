const { toast, showLoading, hideLoading } = require('../../utils/util.js');

Page({
  data: {
    currentType: '',
    recordTypes: [
      { key: 'psa', label: 'PSA记录', icon: '📊' },
      { key: 'check', label: '检查记录', icon: '📋' },
      { key: 'injection', label: '打针记录', icon: '💉' },
      { key: 'medicine', label: '用药记录', icon: '💊' },
      { key: 'visit', label: '复诊记录', icon: '🏥' },
      { key: 'note', label: '备注记录', icon: '📝' },
    ],
  },

  onLoad(options) {
    if (options.type) {
      const typeItem = this.data.recordTypes.find(t => t.key === options.type);
      if (typeItem) {
        this.setData({ currentType: options.type, currentTypeLabel: typeItem.label });
      }
    }
  },

  onSelectType(e) {
    const type = e.currentTarget.dataset.type;
    const typeItem = this.data.recordTypes.find(t => t.key === type);
    this.setData({ currentType: type, currentTypeLabel: typeItem ? typeItem.label : '' });
  },

  onBackToType() {
    this.setData({ currentType: '' });
  },

  onClose() {
    wx.navigateBack();
  },

  preventClose() {
    // 阻止冒泡
  },

  onFormSubmit(e) {
    const { data } = e.detail;
    const type = this.data.currentType;
    this.doSubmit(type, data);
  },

  doSubmit(type, data) {
    showLoading('保存中...');
    wx.cloud.callFunction({
      name: 'addRecord',
      data: { type, data },
    }).then(res => {
      hideLoading();
      const result = res.result;
      if (result && result.success) {
        toast('保存成功', 'success');
        // 触发全局刷新标记
        const app = getApp();
        app.globalData.shouldRefreshHome = true;
        app.globalData.shouldRefreshTimeline = true;
        setTimeout(() => {
          wx.navigateBack();
        }, 600);
      } else {
        toast(result.msg || '保存失败');
      }
    }).catch(err => {
      hideLoading();
      console.error('提交失败', err);
      toast('保存失败，请重试');
    });
  },
});
