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
      indicatorType: 'TPSA',
      value: '',
      date: '',
      hospital: '',
    },
    indicatorOptions: ['TPSA', 'FPSA'],
    today: '',
    recentHospitals: [],
  },

  lifetimes: {
    attached() {
      const today = formatDate(new Date());
      this.setData({ today, 'form.date': today });
      const editData = this.properties.editData;
      if (editData) {
        this.setData({
          'form.indicatorType': editData.indicatorType || 'TPSA',
          'form.value': editData.value !== undefined ? String(editData.value) : '',
          'form.date': editData.date || today,
          'form.hospital': editData.hospital || '',
        });
      }
      const recent = wx.getStorageSync('recentHospitals') || [];
      this.setData({ recentHospitals: recent });
    },
  },

  methods: {
    onTypeChange(e) {
      const index = parseInt(e.detail.value);
      this.setData({ 'form.indicatorType': this.data.indicatorOptions[index] });
    },
    onValueInput(e) {
      this.setData({ 'form.value': e.detail.value });
    },
    onDateChange(e) {
      this.setData({ 'form.date': e.detail.value });
    },
    onHospitalInput(e) {
      this.setData({ 'form.hospital': e.detail.value });
    },
    onSelectRecentHospital(e) {
      this.setData({ 'form.hospital': e.currentTarget.dataset.name });
    },
    onSubmit() {
      const { form } = this.data;
      if (!form.value || isNaN(Number(form.value))) {
        wx.showToast({ title: '请输入有效的数值', icon: 'none' });
        return;
      }
      // 保存最近医院
      if (form.hospital && form.hospital.trim()) {
        let recent = wx.getStorageSync('recentHospitals') || [];
        recent = recent.filter(h => h !== form.hospital.trim());
        recent.unshift(form.hospital.trim());
        if (recent.length > 3) recent = recent.slice(0, 3);
        wx.setStorageSync('recentHospitals', recent);
      }
      this.triggerEvent('submit', {
        data: {
          ...form,
          value: Number(form.value),
          unit: 'ng/mL',
        },
      });
    },
  },
});
