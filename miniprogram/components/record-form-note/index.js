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
      content: '',
      date: '',
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
          'form.content': editData.content || '',
          'form.date': editData.date || today,
        });
      }
    },
  },

  methods: {
    onContentInput(e) {
      this.setData({ 'form.content': e.detail.value });
    },
    onDateChange(e) {
      this.setData({ 'form.date': e.detail.value });
    },
    onSubmit() {
      if (!this.data.form.content.trim()) {
        wx.showToast({ title: '请输入备注内容', icon: 'none' });
        return;
      }
      this.triggerEvent('submit', { data: this.data.form });
    },
  },
});
