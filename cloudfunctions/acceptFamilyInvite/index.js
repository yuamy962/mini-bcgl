const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { patientId } = event;

  if (!patientId) {
    return { success: false, msg: '缺少患者ID' };
  }

  try {
    // 检查是否已经是家庭成员
    const existRes = await db.collection('familyMembers')
      .where({ patientId, memberOpenid: openid })
      .limit(1)
      .get();

    if (existRes.data.length > 0) {
      return { success: false, msg: '您已经是该家庭的成员' };
    }

    // 获取主用户信息
    const patientRes = await db.collection('patients').where({ _openid: patientId }).limit(1).get();
    const patientName = patientRes.data[0] ? patientRes.data[0].name : '';

    await db.collection('familyMembers').add({
      data: {
        patientId,
        inviterOpenid: patientId,
        memberOpenid: openid,
        patientName,
        role: 'member',
        permission: 'edit',
        createTime: db.serverDate(),
      },
    });

    // 记录操作
    await db.collection('operations').add({
      data: {
        patientId,
        operatorOpenid: openid,
        operatorName: '家庭成员',
        action: 'join',
        content: '加入了家庭协同',
        createTime: db.serverDate(),
      },
    });

    return { success: true };
  } catch (err) {
    console.error('acceptFamilyInvite error', err);
    return { success: false, msg: err.message };
  }
};
