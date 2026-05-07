const { showLoading, hideLoading, toast, formatDate } = require('../../utils/util.js');

Page({
  data: {
    summaryData: null,
    loading: true,
    generatingImage: false,
  },

  onLoad() {
    this.loadSummary();
  },

  loadSummary() {
    this.setData({ loading: true });
    wx.cloud.callFunction({ name: 'getSummary' })
      .then(res => {
        const result = res.result;
        if (result && result.success) {
          this.setData({ summaryData: result.data, loading: false });
        } else {
          this.setData({ loading: false });
          toast('加载失败');
        }
      })
      .catch(err => {
        console.error('加载摘要失败', err);
        this.setData({ loading: false });
        toast('加载失败');
      });
  },

  onShareAppMessage() {
    return {
      title: '病程摘要',
      path: '/pages/summary/index',
    };
  },

  // 生成分享长图
  onGenerateImage() {
    const data = this.data.summaryData;
    if (!data) return;
    this.setData({ generatingImage: true });
    showLoading('生成中...');

    const query = wx.createSelectorQuery();
    query.select('.summary-content').boundingClientRect();
    query.exec((res) => {
      if (!res || !res[0]) {
        hideLoading();
        this.setData({ generatingImage: false });
        return;
      }
      this.drawLongImage(data, res[0]);
    });
  },

  drawLongImage(data, rect) {
    const dpr = wx.getSystemInfoSync().pixelRatio;
    const canvasWidth = 750; // 设计稿宽度
    const lineHeight = 56;
    const padding = 40;
    let y = padding;

    // 计算内容高度
    const sections = [
      { title: '患者信息', lines: 2 },
      { title: '指标变化', lines: data.psaList.length > 0 ? data.psaList.length + 1 : 1 },
      { title: '治疗记录', lines: data.treatments.length > 0 ? data.treatments.length : 1 },
      { title: '检查记录', lines: data.checks.length > 0 ? data.checks.length : 1 },
      { title: '医生建议', lines: data.visits.length > 0 ? data.visits.length : 1 },
      { title: '即将到期', lines: data.reminders.length > 0 ? data.reminders.length : 1 },
    ];
    const contentHeight = sections.reduce((sum, s) => sum + 60 + s.lines * lineHeight, 0) + padding * 3;
    const canvasHeight = contentHeight;

    const ctx = wx.createCanvasContext('summaryCanvas', this);
    const scale = canvasWidth / rect.width;

    // 白色背景
    ctx.setFillStyle('#FFFFFF');
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 标题
    ctx.setFillStyle('#333333');
    ctx.setFontSize(36);
    ctx.setTextAlign('center');
    ctx.fillText('病程摘要', canvasWidth / 2, y + 40);
    y += 100;

    // 患者信息
    ctx.setFillStyle('#666666');
    ctx.setFontSize(26);
    ctx.setTextAlign('left');
    ctx.fillText(`患者：${data.patientInfo ? data.patientInfo.name : ''}`, padding, y);
    y += lineHeight;
    ctx.fillText(`生成日期：${data.generatedAt}`, padding, y);
    y += lineHeight + 20;

    // 辅助函数：绘制区块
    const drawSection = (title, items, renderItem) => {
      ctx.setFillStyle('#333333');
      ctx.setFontSize(30);
      ctx.fillText(title, padding, y);
      y += 50;
      if (items.length === 0) {
        ctx.setFillStyle('#999999');
        ctx.setFontSize(26);
        ctx.fillText('暂无', padding, y);
        y += lineHeight;
      } else {
        items.forEach(item => {
          ctx.setFillStyle('#666666');
          ctx.setFontSize(26);
          const text = renderItem(item);
          // 简单截断
          ctx.fillText(text.slice(0, 40), padding, y);
          y += lineHeight;
        });
      }
      y += 20;
    };

    drawSection('指标变化（TPSA）', data.psaList, item => `${item.date}  ${item.value} ng/mL`);
    drawSection('治疗记录', data.treatments, item => `${item.date}  ${item.title}`);
    drawSection('检查记录', data.checks, item => `${item.date}  ${item.title}`);
    drawSection('医生建议', data.visits, item => `${item.date}  ${item.doctorAdvice || item.title}`);
    drawSection('即将到期', data.reminders, item => `${item.nextDate}  ${item.title}`);

    // 底部免责声明
    y += 20;
    ctx.setFillStyle('#AAAAAA');
    ctx.setFontSize(20);
    ctx.setTextAlign('center');
    ctx.fillText('本摘要仅用于病程整理，不作为医疗诊断依据', canvasWidth / 2, y);

    ctx.draw(false, () => {
      wx.canvasToTempFilePath({
        canvasId: 'summaryCanvas',
        success: (res) => {
          hideLoading();
          this.setData({ generatingImage: false });
          wx.previewImage({ urls: [res.tempFilePath] });
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => toast('已保存到相册', 'success'),
            fail: () => {},
          });
        },
        fail: (err) => {
          hideLoading();
          this.setData({ generatingImage: false });
          console.error('生成图片失败', err);
          toast('生成失败');
        },
      }, this);
    });
  },
});
