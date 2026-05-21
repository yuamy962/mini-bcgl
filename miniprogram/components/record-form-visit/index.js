const { formatDate } = require('../../utils/util.js');

Component({
  properties: {
    editData: {
      type: Object,
      value: null,
    },
  },

  data: {
    form: {
      hospital: '',
      date: '',
      doctorAdvice: '',
      followUp: '',
      remark: '',
    },
    today: '',
  },

  lifetimes: {
    attached() {
      const today = formatDate(new Date());
      this.setData({ today, 'form.date': today });
      const editData = this.properties.editData;
      if (editData) {
        this.setData({
          'form.hospital': editData.hospital || '',
          'form.date': editData.date || today,
          'form.doctorAdvice': editData.doctorAdvice || '',
          'form.followUp': editData.followUp || '',
          'form.remark': editData.remark || '',
        });
      }
    },
  },

  methods: {
    onHospitalInput(e) {
      this.setData({ 'form.hospital': e.detail.value });
    },
    onDateChange(e) {
      this.setData({ 'form.date': e.detail.value });
    },
    onAdviceInput(e) {
      this.setData({ 'form.doctorAdvice': e.detail.value });
    },
    onFollowUpInput(e) {
      this.setData({ 'form.followUp': e.detail.value });
    },
    onRemarkInput(e) {
      this.setData({ 'form.remark': e.detail.value });
    },
    onSubmit() {
      if (!this.data.form.doctorAdvice.trim()) {
        wx.showToast({ title: '请填写医生建议', icon: 'none' });
        return;
      }
      this.triggerEvent('submit', { data: this.data.form });
    },
  },
});
