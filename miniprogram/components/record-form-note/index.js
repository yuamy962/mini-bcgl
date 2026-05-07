const { formatDate } = require('../../utils/util.js');

Component({
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
