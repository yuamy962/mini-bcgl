const { formatDate } = require('../../utils/util.js');

Component({
  data: {
    form: {
      checkType: 'CT',
      date: '',
      hospital: '',
      remark: '',
    },
    checkOptions: ['CT', 'MRI', 'PET-CT', '骨扫描', '其他'],
    today: '',
  },

  lifetimes: {
    attached() {
      const today = formatDate(new Date());
      this.setData({ today, 'form.date': today });
    },
  },

  methods: {
    onTypeChange(e) {
      const index = parseInt(e.detail.value);
      this.setData({ 'form.checkType': this.data.checkOptions[index] });
    },
    onDateChange(e) {
      this.setData({ 'form.date': e.detail.value });
    },
    onHospitalInput(e) {
      this.setData({ 'form.hospital': e.detail.value });
    },
    onRemarkInput(e) {
      this.setData({ 'form.remark': e.detail.value });
    },
    onSubmit() {
      this.triggerEvent('submit', { data: this.data.form });
    },
  },
});
