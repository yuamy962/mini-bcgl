const { toast, showLoading, hideLoading, formatDate } = require('../../utils/util.js');

Page({
  data: {
    currentType: '',
    currentTypeLabel: '',
    recordTypes: [
      { key: 'psa', label: 'PSA记录', icon: '📊' },
      { key: 'check', label: '检查记录', icon: '📋' },
      { key: 'injection', label: '打针记录', icon: '💉' },
      { key: 'medicine', label: '用药记录', icon: '💊' },
      { key: 'visit', label: '复诊记录', icon: '🏥' },
      { key: 'note', label: '备注记录', icon: '📝' },
    ],
    editMode: false,
    editId: '',
    editData: null,
    loading: false,
  },

  onLoad(options) {
    if (options.mode === 'edit' && options.id) {
      this.loadEditData(options.id);
    } else if (options.type) {
      const typeItem = this.data.recordTypes.find(t => t.key === options.type);
      if (typeItem) {
        this.setData({ currentType: options.type, currentTypeLabel: typeItem.label });
      }
    }
  },

  loadEditData(id) {
    this.setData({ loading: true });
    const db = wx.cloud.database();
    db.collection('timeline').doc(id).get()
      .then(res => {
        const data = res.data;
        if (!data) {
          toast('记录不存在');
          wx.navigateBack();
          return;
        }
        const typeItem = this.data.recordTypes.find(t => t.key === data.type);
        this.setData({
          currentType: data.type,
          currentTypeLabel: typeItem ? typeItem.label : '',
          editMode: true,
          editId: id,
          editData: data,
          loading: false,
        });
      })
      .catch(err => {
        console.error('加载记录失败', err);
        toast('加载失败');
        wx.navigateBack();
      });
  },

  onSelectType(e) {
    const type = e.currentTarget.dataset.type;
    const typeItem = this.data.recordTypes.find(t => t.key === type);
    this.setData({ currentType: type, currentTypeLabel: typeItem ? typeItem.label : '' });
  },

  onBackToType() {
    if (this.data.editMode) {
      wx.navigateBack();
    } else {
      this.setData({ currentType: '' });
    }
  },

  onClose() {
    wx.navigateBack();
  },

  preventClose() {
    // 阻止冒泡
  },

  onFormSubmit(e) {
    const { data } = e.detail;
    if (this.data.editMode) {
      this.doUpdate(this.data.editId, this.data.currentType, data);
    } else {
      this.doSubmit(this.data.currentType, data);
    }
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

  doUpdate(id, type, data) {
    showLoading('保存中...');
    const db = wx.cloud.database();
    const patientId = getApp().globalData.currentPatientId;

    db.collection('timeline').doc(id).update({
      data: { ...data, updateTime: db.serverDate() },
    }).then(() => {
      // 如果是 PSA，同步更新 indicators
      if (type === 'psa' && data.value !== undefined && data.date) {
        return db.collection('indicators')
          .where({ patientId, indicatorType: 'TPSA', date: data.date })
          .get()
          .then(res => {
            if (res.data.length > 0) {
              return db.collection('indicators').doc(res.data[0]._id).update({
                data: {
                  value: data.value,
                  date: data.date,
                  updateTime: db.serverDate(),
                },
              });
            }
          });
      }
    }).then(() => {
      hideLoading();
      toast('修改成功', 'success');
      const app = getApp();
      app.globalData.shouldRefreshHome = true;
      app.globalData.shouldRefreshTimeline = true;
      setTimeout(() => {
        wx.navigateBack();
      }, 600);
    }).catch(err => {
      hideLoading();
      console.error('更新失败', err);
      toast('保存失败');
    });
  },
});
