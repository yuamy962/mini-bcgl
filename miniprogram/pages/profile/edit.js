const { validate, validators, toast, showLoading, hideLoading, calculateAge } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    form: {
      name: '',
      birthDate: '',
      gender: '男',
      cancerType: '前列腺癌',
      diagnosisDate: '',
      treatmentStatus: '',
      hospital: '',
      doctor: '',
      initialPSA: '',
    },
    defaultBirthDate: '1985-01-01',
    age: null,
    genderOptions: ['男', '女'],
    cancerOptions: ['前列腺癌', '肺癌', '乳腺癌', '胃癌', '肝癌', '其他'],
    statusOptions: ['治疗中', '观察中', '康复期'],
    today: '',
    patientId: '',
  },

  onLoad() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.setData({ today: `${year}-${month}-${day}` });

    const patientInfo = app.globalData.patientInfo;
    if (patientInfo) {
      const birthDate = patientInfo.birthDate || '';
      this.setData({
        form: {
          name: patientInfo.name || '',
          birthDate: birthDate,
          gender: patientInfo.gender || '男',
          cancerType: patientInfo.cancerType || '前列腺癌',
          diagnosisDate: patientInfo.diagnosisDate || '',
          treatmentStatus: patientInfo.treatmentStatus || '',
          hospital: patientInfo.hospital || '',
          doctor: patientInfo.doctor || '',
          initialPSA: patientInfo.initialPSA || '',
        },
        patientId: patientInfo._id || '',
        age: calculateAge(birthDate),
      });
    }
  },

  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value });
  },

  onBirthDateChange(e) {
    const birthDate = e.detail.value;
    this.setData({
      'form.birthDate': birthDate,
      age: calculateAge(birthDate),
    });
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

  onInitialPSAInput(e) {
    this.setData({ 'form.initialPSA': e.detail.value });
  },

  validateForm() {
    const { form } = this.data;
    const result = validate([
      { value: form.name, validators: [validators.name] },
      { value: form.birthDate, validators: [validators.birthDate] },
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

    if (!this.data.patientId) {
      toast('档案信息异常，请重试');
      return;
    }

    showLoading('保存中...');
    const db = wx.cloud.database();
    const { form, patientId } = this.data;

    db.collection('patients')
      .doc(patientId)
      .update({
        data: {
          ...form,
          updateTime: db.serverDate(),
        },
      })
      .then(() => {
        hideLoading();
        toast('保存成功', 'success');
        app.globalData.patientInfo = { ...app.globalData.patientInfo, ...form };
        setTimeout(() => {
          wx.navigateBack();
        }, 800);
      })
      .catch((err) => {
        hideLoading();
        console.error('更新档案失败', err);
        toast('保存失败，请重试');
      });
  },
});
