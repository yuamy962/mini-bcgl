const { showLoading, hideLoading, toast, confirm, formatDate } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    detail: null,
    loading: true,
    id: '',
  },

  onLoad(options) {
    const id = options.id;
    if (!id) {
      toast('参数错误');
      wx.navigateBack();
      return;
    }
    this.setData({ id });
    this.loadDetail(id);
  },

  loadDetail(id) {
    showLoading();
    const db = wx.cloud.database();
    db.collection('timeline').doc(id).get()
      .then(res => {
        hideLoading();
        const typeNameMap = {
          psa: '指标记录',
          check: '检查记录',
          injection: '打针记录',
          medicine: '用药记录',
          visit: '复诊记录',
          note: '备注记录',
        };
        const detail = res.data;
        if (detail) {
          detail.typeName = typeNameMap[detail.type] || detail.type;
          detail.createTimeStr = detail.createTime ? formatDate(detail.createTime) : '';
        }
        this.setData({ detail, loading: false });
      })
      .catch(err => {
        hideLoading();
        console.error('加载详情失败', err);
        toast('加载失败');
        wx.navigateBack();
      });
  },

  onDelete() {
    confirm('确认删除', '删除后不可恢复，是否继续？').then(ok => {
      if (!ok) return;
      this.doDelete();
    });
  },

  doDelete() {
    showLoading('删除中...');
    const db = wx.cloud.database();
    const { id } = this.data;

    db.collection('timeline').doc(id).remove()
      .then(() => {
        hideLoading();
        toast('已删除', 'success');
        app.globalData.shouldRefreshTimeline = true;
        setTimeout(() => wx.navigateBack(), 600);
      })
      .catch(err => {
        hideLoading();
        console.error('删除失败', err);
        toast('删除失败');
      });
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.detail.images || [];
    wx.previewImage({ current: url, urls });
  },
});
