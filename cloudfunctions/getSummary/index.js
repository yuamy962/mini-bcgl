const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const today = formatDate(new Date());
  const threeMonthsAgo = formatDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));

  try {
    // 确定 patientId
    let patientId = openid;
    const patientRes = await db.collection('patients').where({ _openid: openid }).limit(1).get();
    if (patientRes.data.length === 0) {
      const familyRes = await db.collection('familyMembers').where({ memberOpenid: openid }).limit(1).get();
      if (familyRes.data.length > 0) patientId = familyRes.data[0].patientId;
    }

    const [patientInfoRes, psaRes, timelineRes, reminderRes] = await Promise.all([
      db.collection('patients').where({ _openid: patientId }).limit(1).get(),
      db.collection('indicators')
        .where({ patientId, indicatorType: 'TPSA' })
        .orderBy('date', 'desc')
        .limit(10)
        .get(),
      db.collection('timeline')
        .where({ patientId, date: _.gte(threeMonthsAgo) })
        .orderBy('date', 'desc')
        .limit(50)
        .get(),
      db.collection('reminders')
        .where({ patientId, isActive: true, nextDate: _.gte(today) })
        .orderBy('nextDate', 'asc')
        .limit(5)
        .get(),
    ]);

    const patientInfo = patientInfoRes.data[0] || null;
    const psaList = psaRes.data || [];
    const timelineList = timelineRes.data || [];
    const reminders = reminderRes.data || [];

    // 指标趋势
    const psaTrend = psaList.length >= 2
      ? { from: psaList[psaList.length - 1].value, to: psaList[0].value }
      : null;

    // 分类整理
    const treatments = timelineList.filter(i => ['injection', 'medicine'].includes(i.type));
    const checks = timelineList.filter(i => i.type === 'check');
    const visits = timelineList.filter(i => i.type === 'visit');
    const notes = timelineList.filter(i => i.type === 'note');

    return {
      success: true,
      data: {
        patientInfo,
        psaList,
        psaTrend,
        treatments,
        checks,
        visits,
        notes,
        reminders,
        generatedAt: today,
      },
    };
  } catch (err) {
    console.error('getSummary error', err);
    return { success: false, msg: err.message };
  }
};

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
