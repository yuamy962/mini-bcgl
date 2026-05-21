const { showLoading, hideLoading, toast, formatDateTime } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    members: [],
    operations: [],
    loading: true,
    patientId: '',
    isMainUser: false,
    showShareTip: false,
  },

  onLoad() {
    this.setData({
      patientId: app.globalData.currentPatientId,
      isMainUser: app.globalData.isMainUser,
    });
    this.loadFamilyData();
  },

  onShow() {
    this.loadFamilyData();
  },

  loadFamilyData() {
    this.setData({ loading: true });
    const db = wx.cloud.database();
    const patientId = app.globalData.currentPatientId;

    Promise.all([
      db.collection('familyMembers').where({ patientId }).get(),
      db.collection('operations').where({ patientId }).orderBy('createTime', 'desc').limit(20).get(),
    ]).then(([memberRes, opRes]) => {
      const members = memberRes.data || [];
      const operations = (opRes.data || []).map(item => ({
        ...item,
        timeStr: item.createTime ? formatDateTime(item.createTime) : '',
      }));
      this.setData({ members, operations, loading: false });
    }).catch(err => {
      console.error('加载家庭数据失败', err);
      this.setData({ loading: false });
      toast('加载失败');
    });
  },

  onInvite() {
    // 显示分享引导
    this.setData({ showShareTip: true });
  },

  closeShareTip() {
    this.setData({ showShareTip: false });
  },

  preventClose() {
    // 阻止冒泡
  },

  onShareAppMessage() {
    const patientId = app.globalData.currentPatientId;
    return {
      title: '邀请您共同维护病程记录',
      path: `/pages/home/index?action=accept&patientId=${patientId}`,
      imageUrl: '',
    };
  },

  onTogglePermission(e) {
    if (!this.data.isMainUser) return;
    const { id, current } = e.currentTarget.dataset;
    const items = ['可编辑', '仅查看'];
    const values = ['edit', 'view'];
    const index = values.indexOf(current);

    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        if (res.tapIndex === index) return;
        const newPermission = values[res.tapIndex];
        showLoading('更新中...');
        const db = wx.cloud.database();
        db.collection('familyMembers').doc(id).update({
          data: { permission: newPermission },
        }).then(() => {
          hideLoading();
          toast('权限已更新', 'success');
          this.loadFamilyData();
        }).catch((err) => {
          hideLoading();
          console.error('更新权限失败', err);
          toast('更新失败');
        });
      },
    });
  },

  onLeaveFamily() {
    wx.showModal({
      title: '确认退出',
      content: '退出后将无法查看和编辑该患者的病程',
      success: (res) => {
        if (res.confirm) {
          this.doLeave();
        }
      },
    });
  },

  doLeave() {
    showLoading('处理中...');
    const db = wx.cloud.database();
    const openid = app.globalData.openid;
    const patientId = app.globalData.currentPatientId;

    db.collection('familyMembers')
      .where({ patientId, memberOpenid: openid })
      .get()
      .then(res => {
        if (res.data.length > 0) {
          return db.collection('familyMembers').doc(res.data[0]._id).remove();
        }
      })
      .then(() => {
        hideLoading();
        toast('已退出家庭', 'success');
        // 重置为自身
        app.globalData.currentPatientId = openid;
        app.globalData.isMainUser = true;
        app.globalData.familyInfo = null;
        wx.switchTab({ url: '/pages/home/index' });
      })
      .catch(err => {
        hideLoading();
        console.error('退出失败', err);
        toast('操作失败');
      });
  },
});
