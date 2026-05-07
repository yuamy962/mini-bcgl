// app.js
const { envList } = require('./envList.js');

App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，无法使用云开发能力，请升级到最新微信版本后重试。',
        showCancel: false
      });
      return;
    }

    const env = (envList && envList.length > 0) ? envList[0].envId : '';
    wx.cloud.init({
      env: env,
      traceUser: true,
    });

    this.getOpenId();
  },

  getOpenId: function () {
    wx.cloud.callFunction({
      name: 'login',
    }).then(res => {
      const openid = res.result && res.result.openid;
      if (openid) {
        this.globalData.openid = openid;
        if (this.openidCallback) {
          this.openidCallback(openid);
        }
      }
    }).catch(err => {
      console.error('获取 openid 失败', err);
    });
  },

  // 检查档案与家庭关系，确定当前 patientId
  checkPatientProfile: function (callback) {
    const db = wx.cloud.database();
    const openid = this.globalData.openid;
    if (!openid) {
      this.openidCallback = (id) => {
        this._doCheckPatientProfile(id, db, callback);
      };
    } else {
      this._doCheckPatientProfile(openid, db, callback);
    }
  },

  _doCheckPatientProfile: function (openid, db, callback) {
    Promise.all([
      db.collection('patients').where({ _openid: openid }).limit(1).get(),
      db.collection('familyMembers').where({ memberOpenid: openid }).limit(1).get(),
    ]).then(([patientRes, familyRes]) => {
      let patientInfo = patientRes.data[0] || null;
      const familyInfo = familyRes.data[0] || null;

      // 确定当前数据归属的 patientId
      let patientId = openid;
      if (patientInfo) {
        patientId = openid;
        this.globalData.patientInfo = patientInfo;
        this.globalData.isMainUser = true;
      } else if (familyInfo) {
        patientId = familyInfo.patientId;
        this.globalData.familyInfo = familyInfo;
        this.globalData.isMainUser = false;
        // 被邀请者：尝试获取主用户的档案信息用于展示
        if (!patientInfo && familyInfo.patientId) {
          db.collection('patients').where({ _openid: familyInfo.patientId }).limit(1).get().then(pRes => {
            if (pRes.data[0]) {
              this.globalData.patientInfo = pRes.data[0];
            }
          });
        }
      }
      this.globalData.currentPatientId = patientId;

      // 有档案或是家庭成员，都视为已初始化
      const hasAccess = !!patientInfo || !!familyInfo;
      callback && callback(hasAccess, patientInfo);
    }).catch(err => {
      console.error('查询患者档案失败', err);
      callback && callback(false, null);
    });
  },

  globalData: {
    openid: '',
    patientInfo: null,
    userInfo: null,
    familyInfo: null,
    isMainUser: false,
    currentPatientId: '',
    shouldRefreshHome: false,
    shouldRefreshTimeline: false,
  }
});
