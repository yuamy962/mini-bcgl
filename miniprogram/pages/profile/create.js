const { validate, validators, toast, showLoading, hideLoading } = require('../../utils/util.js');

Page({
  data: {
    form: {
      name: '',
      age: '',
      gender: '男',
      cancerType: '前列腺癌',
      diagnosisDate: '',
      treatmentStatus: '',
      hospital: '',
      doctor: '',
    },
    genderOptions: ['男', '女'],
    cancerOptions: ['前列腺癌', '肺癌', '乳腺癌', '胃癌', '肝癌', '其他'],
    statusOptions: ['治疗中', '观察中', '康复期'],
    today: '',
  },

  onLoad() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.setData({ today: `${year}-${month}-${day}` });
  },

  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value });
  },

  onAgeInput(e) {
    this.setData({ 'form.age': e.detail.value });
  },

  onGenderChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({ 'form.gender': this.data.genderOptions[index] });
  },

  onCancerChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({ 'form.cancerType': this.data.cancerOptions[index] });
  },

  onDateChange(e) {
    this.setData({ 'form.diagnosisDate': e.detail.value });
  },

  onStatusChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({ 'form.treatmentStatus': this.data.statusOptions[index] });
  },

  onHospitalInput(e) {
    this.setData({ 'form.hospital': e.detail.value });
  },

  onDoctorInput(e) {
    this.setData({ 'form.doctor': e.detail.value });
  },

  validateForm() {
    const { form } = this.data;
    const result = validate([
      { value: form.name, validators: [validators.name] },
      { value: form.age, validators: [validators.age] },
      { value: form.diagnosisDate, validators: [(v) => v ? true : '请选择确诊时间'] },
    ]);
    return result;
  },

  onSubmit() {
    const validation = this.validateForm();
    if (!validation.valid) {
      toast(validation.msg);
      return;
    }

    showLoading('保存中...');
    const db = wx.cloud.database();
    const { form } = this.data;

    db.collection('patients')
      .add({
        data: {
          ...form,
          age: Number(form.age),
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
        },
      })
      .then((res) => {
        hideLoading();
        toast('创建成功', 'success');
        // 更新全局数据
        const app = getApp();
        app.globalData.patientInfo = { ...form, _id: res._id, _openid: app.globalData.openid };
        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({ url: '/pages/home/index' });
        }, 800);
      })
      .catch((err) => {
        hideLoading();
        console.error('创建档案失败', err);
        toast('创建失败，请重试');
      });
  },
});
