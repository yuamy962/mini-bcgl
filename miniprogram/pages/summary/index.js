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

  // ===== Canvas 绘制 =====
  drawLongImage(data, rect) {
    const W = 750;
    const M = 32;
    const CW = W - M * 2;
    const CP = 32;
    const CG = 24;

    const C = {
      bg: '#F5F7FA',
      primary: '#4A7CFF',
      primaryLight: '#E8EEFF',
      white: '#FFFFFF',
      textMain: '#1A1A2E',
      textSecondary: '#6B7280',
      textTertiary: '#9CA3AF',
      border: '#F0F0F0',
      success: '#34D399',
      successBg: '#ECFDF5',
      danger: '#F87171',
      dangerBg: '#FEF2F2',
      warning: '#FBBF24',
      warningBg: '#FFF7ED',
      warningText: '#B45309',
      purple: '#A78BFA',
      purpleBg: '#F5F3FF',
      cyan: '#22D3EE',
      cyanBg: '#ECFEFF',
    };

    const ctx = wx.createCanvasContext('summaryCanvas', this);

    // ---- 辅助函数 ----
    const roundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const drawText = (text, x, y, color, size, align = 'left') => {
      ctx.setFillStyle(color);
      ctx.setFontSize(size);
      ctx.setTextAlign(align);
      ctx.fillText(text, x, y);
      ctx.setTextAlign('left');
    };

    const drawLine = (x1, y1, x2, y2, color, width = 1) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.setStrokeStyle(color);
      ctx.setLineWidth(width);
      ctx.stroke();
    };

    const measureText = (text, fontSize) => {
      ctx.setFontSize(fontSize);
      return ctx.measureText(text).width;
    };

    // ---- 计算总高度 ----
    const headerH = 200;
    const patientH = 140;

    let psaH = 0;
    if (data.psaList && data.psaList.length > 0) {
      const chartH = data.psaList.length >= 2 ? 200 : 0;
      psaH = CP * 2 + 60 + chartH + data.psaList.length * 56 + 20;
    }

    const listH = (items) => {
      const hasItems = items && items.length > 0;
      const lines = hasItems ? items.length : 1;
      return CP * 2 + 60 + lines * 56;
    };

    let reminderH = 0;
    if (data.reminders && data.reminders.length > 0) {
      reminderH = CP * 2 + 60 + data.reminders.length * 56;
    }

    const disclaimerH = 100;
    const totalH = headerH + patientH + psaH
      + listH(data.treatments)
      + listH(data.checks)
      + listH(data.visits)
      + reminderH
      + disclaimerH
      + CG * 6 + 40;

    // 全局背景
    ctx.setFillStyle(C.bg);
    ctx.fillRect(0, 0, W, totalH);

    let y = 0;

    // === 1. 顶部品牌色标题栏 ===
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, headerH - 40);
    ctx.quadraticCurveTo(W, headerH, W - 40, headerH);
    ctx.lineTo(40, headerH);
    ctx.quadraticCurveTo(0, headerH, 0, headerH - 40);
    ctx.closePath();
    ctx.setFillStyle(C.primary);
    ctx.fill();

    // 装饰圆
    ctx.beginPath();
    ctx.arc(W - 60, 50, 80, 0, Math.PI * 2);
    ctx.setFillStyle('rgba(255,255,255,0.06)');
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-30, headerH - 30, 60, 0, Math.PI * 2);
    ctx.setFillStyle('rgba(255,255,255,0.08)');
    ctx.fill();

    drawText('病程摘要', W / 2, 90, C.white, 48, 'center');
    drawText('Prostate Care Journey', W / 2, 138, 'rgba(255,255,255,0.65)', 22, 'center');

    y = headerH - 30;

    // === 2. 患者信息卡片 ===
    roundRect(M, y, CW, patientH, 20);
    ctx.setFillStyle(C.white);
    ctx.fill();

    // 阴影（简单模拟）
    ctx.setFillStyle('rgba(0,0,0,0.03)');
    roundRect(M, y + 4, CW, patientH, 20);
    ctx.fill();
    roundRect(M, y, CW, patientH, 20);
    ctx.setFillStyle(C.white);
    ctx.fill();

    const avatarX = M + CP;
    const avatarY = y + 30;
    const avatarR = 40;
    ctx.beginPath();
    ctx.arc(avatarX + avatarR, avatarY + avatarR, avatarR, 0, Math.PI * 2);
    ctx.setFillStyle(C.primaryLight);
    ctx.fill();

    const initial = (data.patientInfo && data.patientInfo.name) ? data.patientInfo.name.charAt(0) : '患';
    drawText(initial, avatarX + avatarR, avatarY + avatarR + 14, C.primary, 36, 'center');

    drawText(data.patientInfo ? data.patientInfo.name : '', avatarX + avatarR * 2 + 24, avatarY + 28, C.textMain, 34);
    drawText(`生成日期：${data.generatedAt || ''}`, avatarX + avatarR * 2 + 24, avatarY + 74, C.textSecondary, 24);

    y += patientH + CG;

    // === 3. PSA 指标卡片 ===
    if (data.psaList && data.psaList.length > 0) {
      const psaCardH = CP * 2 + 60 + (data.psaList.length >= 2 ? 200 : 0) + data.psaList.length * 56 + 20;

      roundRect(M, y, CW, psaCardH, 20);
      ctx.setFillStyle(C.white);
      ctx.fill();

      // 标题色条
      roundRect(M + CP, y + CP + 16, 6, 28, 3);
      ctx.setFillStyle(C.primary);
      ctx.fill();
      drawText('指标变化（TPSA）', M + CP + 18, y + CP + 40, C.textMain, 32);

      let cy = y + CP + 80;

      // 迷你趋势图
      if (data.psaList.length >= 2) {
        const chartM = 20;
        const chartW = CW - CP * 2 - chartM * 2;
        const chartH = 160;
        const chartX = M + CP + chartM;
        const chartY = cy;

        // 图表背景
        roundRect(chartX, chartY, chartW, chartH, 12);
        ctx.setFillStyle(C.primaryLight);
        ctx.fill();

        const values = data.psaList.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
        const maxV = Math.max(...values);
        const minV = Math.min(...values);
        const range = maxV === minV ? 1 : maxV - minV;
        const pad = range * 0.15;
        const top = maxV + pad;
        const bottom = Math.max(0, minV - pad);
        const scaleRange = top - bottom || 1;

        const points = data.psaList.map((d, i) => {
          const vx = chartX + 40 + (chartW - 80) * i / (data.psaList.length - 1);
          const vy = chartY + chartH - 30 - (chartH - 60) * (parseFloat(d.value) - bottom) / scaleRange;
          return { x: vx, y: vy, value: parseFloat(d.value), date: d.date };
        });

        // 网格线
        drawLine(chartX + 30, chartY + 20, chartX + chartW - 30, chartY + 20, 'rgba(74,124,255,0.08)', 1);
        drawLine(chartX + 30, chartY + chartH / 2, chartX + chartW - 30, chartY + chartH / 2, 'rgba(74,124,255,0.08)', 1);
        drawLine(chartX + 30, chartY + chartH - 40, chartX + chartW - 30, chartY + chartH - 40, 'rgba(74,124,255,0.08)', 1);

        // 渐变填充
        ctx.beginPath();
        ctx.moveTo(points[0].x, chartY + chartH - 40);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, chartY + chartH - 40);
        ctx.closePath();
        ctx.setFillStyle('rgba(74,124,255,0.12)');
        ctx.fill();

        // 折线
        ctx.beginPath();
        points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.setStrokeStyle(C.primary);
        ctx.setLineWidth(3);
        ctx.stroke();

        // 数据点 + 标签
        points.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.setFillStyle(C.white);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.setStrokeStyle(C.primary);
          ctx.setLineWidth(2);
          ctx.stroke();

          if (p.value === maxV) {
            drawText(String(p.value), p.x, p.y - 14, C.danger, 22, 'center');
          } else if (p.value === minV) {
            drawText(String(p.value), p.x, p.y - 14, C.success, 22, 'center');
          }
        });

        // X轴日期
        drawText(points[0].date, chartX + 30, chartY + chartH - 10, C.textTertiary, 20);
        drawText(points[points.length - 1].date, chartX + chartW - 30, chartY + chartH - 10, C.textTertiary, 20, 'right');

        cy += chartH + 24;
      }

      // 数据列表
      data.psaList.forEach((item, i) => {
        const isLast = i === data.psaList.length - 1;
        if (!isLast) {
          drawLine(M + CP, cy + 44, M + CW - CP, cy + 44, C.border, 1);
        }
        drawText(item.date, M + CP, cy + 30, C.textSecondary, 26);

        const prevVal = i > 0 ? parseFloat(data.psaList[i - 1].value) : null;
        const curVal = parseFloat(item.value);
        const valColor = (prevVal !== null && curVal > prevVal) ? C.danger : C.primary;
        drawText(`${item.value} ng/mL`, M + CW - CP, cy + 30, valColor, 28, 'right');
        cy += 56;
      });

      y += psaCardH + CG;
    }

    // === 4. 通用列表卡片 ===
    const drawListCard = (title, items, renderText, accentColor) => {
      const hasItems = items && items.length > 0;
      const lines = hasItems ? items.length : 1;
      const cardH = CP * 2 + 60 + lines * 56;

      roundRect(M, y, CW, cardH, 20);
      ctx.setFillStyle(C.white);
      ctx.fill();

      // 标题色条
      roundRect(M + CP, y + CP + 16, 6, 28, 3);
      ctx.setFillStyle(accentColor);
      ctx.fill();
      drawText(title, M + CP + 18, y + CP + 40, C.textMain, 32);

      let ly = y + CP + 80;
      if (!hasItems) {
        drawText('暂无记录', M + CP, ly + 30, C.textTertiary, 26);
      } else {
        items.forEach((item, i) => {
          const isLast = i === items.length - 1;
          if (!isLast) {
            drawLine(M + CP, ly + 44, M + CW - CP, ly + 44, C.border, 1);
          }
          drawText(item.date || item.nextDate || '', M + CP, ly + 30, C.textSecondary, 26);
          const text = renderText(item);
          const textW = measureText(text, 28);
          const maxTextW = CW - CP * 2 - 200;
          const displayText = textW > maxTextW ? text.slice(0, Math.floor(text.length * maxTextW / textW)) + '...' : text;
          drawText(displayText, M + CW - CP, ly + 30, C.textMain, 28, 'right');
          ly += 56;
        });
      }

      y += cardH + CG;
    };

    drawListCard('治疗记录', data.treatments, item => item.title, C.success);
    drawListCard('检查记录', data.checks, item => item.title || (item.checkType ? item.checkType + '检查' : '检查'), C.purple);
    drawListCard('医生建议', data.visits, item => item.doctorAdvice || '常规复诊', C.cyan);

    // === 5. 提醒卡片（特殊样式）===
    if (data.reminders && data.reminders.length > 0) {
      const reminderH = CP * 2 + 60 + data.reminders.length * 56;

      roundRect(M, y, CW, reminderH, 20);
      ctx.setFillStyle(C.warningBg);
      ctx.fill();

      // 标题色条
      roundRect(M + CP, y + CP + 16, 6, 28, 3);
      ctx.setFillStyle(C.warning);
      ctx.fill();
      drawText('即将到期', M + CP + 18, y + CP + 40, C.textMain, 32);

      let ry = y + CP + 80;
      data.reminders.forEach((item, i) => {
        const isLast = i === data.reminders.length - 1;
        if (!isLast) {
          drawLine(M + CP, ry + 44, M + CW - CP, ry + 44, 'rgba(251,191,36,0.3)', 1);
        }
        drawText(item.nextDate, M + CP, ry + 30, C.textSecondary, 26);
        drawText(item.title, M + CW - CP, ry + 30, C.warningText, 28, 'right');
        ry += 56;
      });

      y += reminderH + CG;
    }

    // === 6. 底部免责声明 ===
    y += 20;
    roundRect(M, y, CW, 80, 16);
    ctx.setFillStyle('#F0F0F0');
    ctx.fill();

    // 医疗十字图标（简单几何）
    const iconX = W / 2 - measureText('本摘要仅用于病程整理，不作为医疗诊断依据', 22) / 2 - 28;
    const iconY = y + 36;
    ctx.setFillStyle(C.textTertiary);
    ctx.fillRect(iconX, iconY + 6, 14, 4);
    ctx.fillRect(iconX + 5, iconY, 4, 14);

    drawText('本摘要仅用于病程整理，不作为医疗诊断依据', W / 2, y + 50, C.textTertiary, 22, 'center');

    y += 120;

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
