const formatTime = (date, format = 'YYYY-MM-DD') => {
  const d = typeof date === 'string' ? new Date(date.replace(/-/g, '/')) : new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
};

const formatDate = (date) => formatTime(date, 'YYYY-MM-DD');
const formatDateTime = (date) => formatTime(date, 'YYYY-MM-DD HH:mm');

// 计算两个日期的天数差
const daysDiff = (date1, date2) => {
  const d1 = new Date(date1.replace(/-/g, '/'));
  const d2 = new Date(date2.replace(/-/g, '/'));
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

// 日期加减天数
const addDays = (dateStr, days) => {
  const d = new Date(dateStr.replace(/-/g, '/'));
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

// 根据出生日期计算年龄
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate.replace(/-/g, '/'));
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// 表单校验
const validators = {
  required: (value, msg = '此项为必填项') => {
    if (value === '' || value === null || value === undefined) return msg;
    if (typeof value === 'string' && value.trim() === '') return msg;
    return true;
  },
  name: (value) => {
    if (!value || value.trim().length < 1) return '请输入患者姓名';
    if (value.trim().length > 20) return '姓名不能超过20个字符';
    return true;
  },
  age: (value) => {
    const age = Number(value);
    if (isNaN(age) || age < 1 || age > 150) return '请输入有效的年龄（1-150）';
    return true;
  },
  birthDate: (value) => {
    if (!value) return '请选择出生日期';
    const d = new Date(value.replace(/-/g, '/'));
    if (isNaN(d.getTime())) return '日期格式不正确';
    const now = new Date();
    if (d > now) return '出生日期不能晚于今天';
    return true;
  },
  number: (value, min, max) => {
    const num = Number(value);
    if (isNaN(num)) return '请输入有效的数字';
    if (min !== undefined && num < min) return `数值不能小于 ${min}`;
    if (max !== undefined && num > max) return `数值不能大于 ${max}`;
    return true;
  },
};

// 执行校验
const validate = (rules) => {
  for (const rule of rules) {
    const { value, validators: vds } = rule;
    for (const vd of vds) {
      const result = vd(value);
      if (result !== true) {
        return { valid: false, msg: result };
      }
    }
  }
  return { valid: true };
};

// 防抖
const debounce = (fn, delay = 300) => {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

// 显示轻提示
const toast = (title, icon = 'none', duration = 2000) => {
  wx.showToast({ title, icon, duration });
};

// 显示加载中
const showLoading = (title = '加载中...') => {
  wx.showLoading({ title, mask: true });
};

const hideLoading = () => {
  wx.hideLoading();
};

// 确认弹窗
const confirm = (title, content) => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => resolve(res.confirm),
    });
  });
};

module.exports = {
  formatTime,
  formatDate,
  formatDateTime,
  daysDiff,
  addDays,
  calculateAge,
  validators,
  validate,
  debounce,
  toast,
  showLoading,
  hideLoading,
  confirm,
};
