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
      drug: '',
      startDate: '',
      nextDate: '',
    },
    today: '',
  },

  lifetimes: {
    attached() {
      const today = formatDate(new Date());
      this.setData({ today, 'form.startDate': today });
      const editData = this.properties.editData;
      if (editData) {
        this.setData({
          'form.drug': editData.drug || '',
          'form.startDate': editData.startDate || today,
          'form.nextDate': editData.nextDate || '',
        });
      }
    },
  },

  methods: {
    onDrugInput(e) {
      this.setData({ 'form.drug': e.detail.value });
    },
    onStartDateChange(e) {
      this.setData({ 'form.startDate': e.detail.value });
    },
    onNextDateChange(e) {
      this.setData({ 'form.nextDate': e.detail.value });
    },
    onSubmit() {
      if (!this.data.form.drug.trim()) {
        wx.showToast({ title: '请输入药物名称', icon: 'none' });
        return;
      }
      this.triggerEvent('submit', { data: this.data.form });
    },
  },
});
