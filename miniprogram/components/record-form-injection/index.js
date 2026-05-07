const { formatDate, addDays } = require('../../utils/util.js');

Component({
  data: {
    form: {
      drug: '诺雷得',
      date: '',
      cycleDays: 28,
      nextDate: '',
      hospital: '',
    },
    drugOptions: ['诺雷得', '达菲林', '戈舍瑞林', '其他'],
    cycleOptions: [
      { label: '每28天', value: 28 },
      { label: '每84天', value: 84 },
    ],
    today: '',
  },

  lifetimes: {
    attached() {
      const today = formatDate(new Date());
      const nextDate = addDays(today, 28);
      this.setData({
        today,
        cycleIndex: 0,
        'form.date': today,
        'form.nextDate': nextDate,
      });
    },
  },

  methods: {
    onDrugChange(e) {
      const index = parseInt(e.detail.value);
      this.setData({ 'form.drug': this.data.drugOptions[index] });
    },
    onDateChange(e) {
      const date = e.detail.value;
      const nextDate = addDays(date, this.data.form.cycleDays);
      this.setData({ 'form.date': date, 'form.nextDate': nextDate });
    },
    onCycleChange(e) {
      const index = parseInt(e.detail.value);
      const cycleDays = this.data.cycleOptions[index].value;
      const nextDate = addDays(this.data.form.date, cycleDays);
      this.setData({ cycleIndex: index, 'form.cycleDays': cycleDays, 'form.nextDate': nextDate });
    },
    onHospitalInput(e) {
      this.setData({ 'form.hospital': e.detail.value });
    },
    onSubmit() {
      this.triggerEvent('submit', { data: this.data.form });
    },
  },
});
