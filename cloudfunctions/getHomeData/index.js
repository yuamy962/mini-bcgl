const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const today = formatDate(new Date());

  try {
    // 确定 patientId
    let patientId = openid;
    const patientRes = await db.collection('patients').where({ _openid: openid }).limit(1).get();
    if (patientRes.data.length === 0) {
      const familyRes = await db.collection('familyMembers').where({ memberOpenid: openid }).limit(1).get();
      if (familyRes.data.length > 0) {
        patientId = familyRes.data[0].patientId;
      }
    }

    const [mainPatientRes, psaRes, reminderRes, timelineRes] = await Promise.all([
      db.collection('patients').where({ _openid: patientId }).limit(1).get(),
      db.collection('indicators')
        .where({ patientId, indicatorType: 'TPSA' })
        .orderBy('date', 'desc')
        .limit(2)
        .get(),
      db.collection('reminders')
        .where({ patientId, isActive: true, nextDate: _.gte(today) })
        .orderBy('nextDate', 'asc')
        .limit(3)
        .get(),
      db.collection('timeline')
        .where({ patientId })
        .orderBy('date', 'desc')
        .limit(10)
        .get(),
    ]);

    const patientInfo = mainPatientRes.data[0] || null;
    const psaList = psaRes.data || [];
    const reminders = reminderRes.data || [];
    const timelineList = timelineRes.data || [];

    let psaTrend = { direction: '--', text: '暂无数据', color: 'gray' };
    if (psaList.length >= 2) {
      const latest = Number(psaList[0].value);
      const prev = Number(psaList[1].value);
      if (latest < prev) psaTrend = { direction: 'down', text: '下降 ↓', color: 'success' };
      else if (latest > prev) psaTrend = { direction: 'up', text: '上升 ↑', color: 'danger' };
      else psaTrend = { direction: 'stable', text: '稳定 →', color: 'stable' };
    } else if (psaList.length === 1) {
      psaTrend = { direction: 'stable', text: '首次记录', color: 'stable' };
    }

    const summary = buildSummary(timelineList, psaList);

    return {
      success: true,
      data: {
        patientInfo,
        latestPsa: psaList[0] || null,
        psaTrend,
        upcomingReminders: reminders,
        recentSummary: summary,
      },
    };
  } catch (err) {
    console.error('getHomeData error', err);
    return { success: false, msg: err.message };
  }
};

function buildSummary(timelineList, psaList) {
  const summary = { psaChange: null, recentTreatment: null, recentCheck: null, doctorAdvice: null };
  if (psaList.length >= 2) {
    summary.psaChange = {
      from: psaList[1].value,
      to: psaList[0].value,
      date: psaList[0].date,
      direction: Number(psaList[0].value) < Number(psaList[1].value) ? 'down' : 'up',
    };
  }
  for (const item of timelineList) {
    if (!summary.recentTreatment && ['injection', 'medicine'].includes(item.type)) summary.recentTreatment = item;
    if (!summary.recentCheck && item.type === 'check') summary.recentCheck = item;
    if (!summary.doctorAdvice && item.type === 'visit' && item.doctorAdvice) summary.doctorAdvice = item;
  }
  return summary;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
