const { showLoading, hideLoading, toast, confirm, formatDate } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    reminders: [],
    loading: true,
    showForm: false,
    editingId: '',
    form: { type: 'check', title: '', nextDate: '', cycleDays: '' },
    typeOptions: [
      { value: 'check', label: '复查提醒' },
      { value: 'medicine', label: '用药提醒' },
      { value: 'injection', label: '打针提醒' },
    ],
    today: '',
    typeIndex: 0,
  },

  onLoad() {
    const today = formatDate(new Date());
    this.setData({ today, typeIndex: 0 });
    this.loadReminders();
  },

  onShow() {
    this.loadReminders();
  },

  onPullDownRefresh() {
    this.loadReminders().finally(() => wx.stopPullDownRefresh());
  },

  loadReminders() {
    this.setData({ loading: true });
    const db = wx.cloud.database();
    const patientId = app.globalData.currentPatientId || app.globalData.openid;

    db.collection('reminders')
      .where({ patientId })
      .orderBy('nextDate', 'asc')
      .get()
      .then(res => {
        this.setData({ reminders: res.data || [], loading: false });
      })
      .catch(err => {
        console.error('加载提醒失败', err);
        this.setData({ loading: false });
        toast('加载失败');
      });
  },

  onAdd() {
    this.setData({
      showForm: true,
      editingId: '',
      form: { type: 'check', title: '', nextDate: this.data.today, cycleDays: '' },
      typeIndex: 0,
    });
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.reminders.find(r => r._id === id);
    if (!item) return;
    const typeIdx = this.data.typeOptions.findIndex(t => t.value === item.type);
    this.setData({
      showForm: true,
      editingId: id,
      form: {
        type: item.type || 'check',
        title: item.title || '',
        nextDate: item.nextDate || '',
        cycleDays: item.cycleDays ? String(item.cycleDays) : '',
      },
      typeIndex: typeIdx >= 0 ? typeIdx : 0,
    });
  },

  onCancel() {
    this.setData({ showForm: false });
  },

  preventClose() {},

  onTypeChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({ typeIndex: index, 'form.type': this.data.typeOptions[index].value });
  },

  onTitleInput(e) {
    this.setData({ 'form.title': e.detail.value });
  },

  onDateChange(e) {
    this.setData({ 'form.nextDate': e.detail.value });
  },

  onCycleInput(e) {
    this.setData({ 'form.cycleDays': e.detail.value });
  },

  validateForm() {
    const { form } = this.data;
    if (!form.title.trim()) return '请输入提醒标题';
    if (!form.nextDate) return '请选择下次提醒日期';
    return true;
  },

  onSubmit() {
    const valid = this.validateForm();
    if (valid !== true) { toast(valid); return; }

    showLoading('保存中...');
    const db = wx.cloud.database();
    const { form, editingId } = this.data;
    const patientId = app.globalData.currentPatientId || app.globalData.openid;
    const data = {
      type: form.type,
      title: form.title.trim(),
      nextDate: form.nextDate,
      cycleDays: form.cycleDays ? Number(form.cycleDays) : 0,
      isActive: true,
      patientId,
      updateTime: db.serverDate(),
    };

    const promise = editingId
      ? db.collection('reminders').doc(editingId).update({ data })
      : db.collection('reminders').add({ data: { ...data, createTime: db.serverDate() } });

    promise.then(() => {
      hideLoading();
      toast('保存成功', 'success');
      this.setData({ showForm: false });
      this.loadReminders();
      getApp().globalData.shouldRefreshHome = true;
    }).catch(err => {
      hideLoading();
      console.error('保存提醒失败', err);
      toast('保存失败');
    });
  },

  onToggle(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.reminders.find(r => r._id === id);
    if (!item) return;
    const newStatus = !item.isActive;
    const db = wx.cloud.database();
    db.collection('reminders').doc(id).update({
      data: { isActive: newStatus },
    }).then(() => {
      const reminders = this.data.reminders.map(r =>
        r._id === id ? { ...r, isActive: newStatus } : r
      );
      this.setData({ reminders });
      getApp().globalData.shouldRefreshHome = true;
    }).catch(err => {
      console.error('切换状态失败', err);
      toast('操作失败');
    });
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    confirm('确认删除', '删除后不可恢复').then(ok => {
      if (!ok) return;
      showLoading('删除中...');
      const db = wx.cloud.database();
      db.collection('reminders').doc(id).remove()
        .then(() => {
          hideLoading();
          toast('已删除', 'success');
          this.loadReminders();
          getApp().globalData.shouldRefreshHome = true;
        })
        .catch(err => {
          hideLoading();
          console.error('删除失败', err);
          toast('删除失败');
        });
    });
  },
});
