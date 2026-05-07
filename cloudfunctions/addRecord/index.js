const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const TYPE_CONFIG = {
  psa: { title: 'PSA记录', icon: '📊' },
  check: { title: '检查记录', icon: '📋' },
  injection: { title: '打针记录', icon: '💉' },
  medicine: { title: '用药记录', icon: '💊' },
  visit: { title: '复诊记录', icon: '🏥' },
  note: { title: '备注记录', icon: '📝' },
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { type, data } = event;

  if (!TYPE_CONFIG[type]) {
    return { success: false, msg: '未知的记录类型' };
  }

  // 确定 patientId
  let patientId = openid;
  const patientRes = await db.collection('patients').where({ _openid: openid }).limit(1).get();
  if (patientRes.data.length === 0) {
    const familyRes = await db.collection('familyMembers').where({ memberOpenid: openid }).limit(1).get();
    if (familyRes.data.length > 0) {
      patientId = familyRes.data[0].patientId;
    }
  }

  const config = TYPE_CONFIG[type];
  const now = db.serverDate();

  try {
    const timelineData = {
      _openid: openid,
      patientId,
      type,
      title: buildTitle(type, data),
      date: data.date || formatDate(new Date()),
      icon: config.icon,
      ...data,
      createTime: now,
      updateTime: now,
    };

    const timelineRes = await db.collection('timeline').add({ data: timelineData });
    const timelineId = timelineRes._id;

    let indicatorId = null;
    if (type === 'psa') {
      const indicatorRes = await db.collection('indicators').add({
        data: {
          _openid: openid,
          patientId,
          indicatorType: data.indicatorType || 'TPSA',
          value: Number(data.value),
          date: data.date,
          hospital: data.hospital || '',
          sourceId: timelineId,
          createTime: now,
        },
      });
      indicatorId = indicatorRes._id;
    }

    let reminderId = null;
    if (type === 'injection' && data.nextDate) {
      const reminderRes = await db.collection('reminders').add({
        data: {
          _openid: openid,
          patientId,
          type: 'injection',
          title: `${data.drug || '打针'}提醒`,
          nextDate: data.nextDate,
          cycleDays: data.cycleDays || 28,
          isActive: true,
          sourceId: timelineId,
          createTime: now,
        },
      });
      reminderId = reminderRes._id;
    }

    await db.collection('operations').add({
      data: {
        patientId,
        operatorOpenid: openid,
        operatorName: patientId === openid ? '本人' : '家庭成员',
        action: 'add',
        content: `添加了${config.title}：${timelineData.title}`,
        createTime: now,
      },
    });

    return {
      success: true,
      timelineId,
      indicatorId,
      reminderId,
    };
  } catch (err) {
    console.error('addRecord error', err);
    return { success: false, msg: err.message };
  }
};

function buildTitle(type, data) {
  switch (type) {
    case 'psa': return `${data.indicatorType || 'TPSA'}：${data.value}`;
    case 'check': return `${data.checkType || '检查'}记录`;
    case 'injection': return `注射${data.drug || ''}`;
    case 'medicine': return `用药：${data.drug || ''}`;
    case 'visit': return `复诊：${data.hospital || ''}`;
    case 'note': return data.content ? (data.content.length > 20 ? data.content.slice(0, 20) + '...' : data.content) : '备注';
    default: return '记录';
  }
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
