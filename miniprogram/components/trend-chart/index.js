Component({
  properties: {
    data: {
      type: Array,
      value: [],
    },
  },

  data: {},

  lifetimes: {
    attached() {
      this._initPending = true;
      this.initCanvas();
    },
  },

  observers: {
    'data': function(data) {
      if (data && data.length > 0) {
        this._pendingData = data;
        this.tryDraw();
      }
    },
  },

  methods: {
    initCanvas() {
      const query = this.createSelectorQuery();
      query.select('.trend-chart-wrap').boundingClientRect();
      query.exec((res) => {
        if (res && res[0]) {
          const rect = res[0];
          this.canvasWidth = rect.width;
          this.canvasHeight = rect.height;
          this.dpr = wx.getSystemInfoSync().pixelRatio;
          this.canvasCtx = wx.createCanvasContext('trendCanvas', this);
          this._initPending = false;
          this.tryDraw();
        }
      });
    },

    tryDraw() {
      if (this._initPending || !this.canvasCtx) return;
      if (this._pendingData && this._pendingData.length > 0) {
        this.drawChart(this._pendingData);
        this._pendingData = null;
      }
    },

    drawChart(data) {
      const ctx = this.canvasCtx;
      const dpr = this.dpr || 1;
      const width = this.canvasWidth;
      const height = this.canvasHeight;

      if (!ctx || !data || data.length === 0) return;

      ctx.scale(dpr, dpr);
      const w = width / dpr;
      const h = height / dpr;

      const padding = { top: 36, bottom: 36, left: 48, right: 20 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      ctx.clearRect(0, 0, w, h);

      // 数值范围
      const values = data.map(d => Number(d.value));
      let minVal = Math.min(...values);
      let maxVal = Math.max(...values);
      if (minVal === maxVal) {
        minVal = Math.max(0, minVal - 1);
        maxVal = maxVal + 1;
      }
      const yMin = Math.max(0, Math.floor(minVal - (maxVal - minVal) * 0.15));
      const yMax = Math.ceil(maxVal + (maxVal - minVal) * 0.15);
      const yRange = yMax - yMin || 1;

      // 网格线 + Y轴标签
      ctx.setStrokeStyle('#F0F0F0');
      ctx.setLineWidth(0.5);
      ctx.setFontSize(10);
      ctx.setFillStyle('#BBBBBB');
      ctx.setTextAlign('right');

      const gridCount = 4;
      for (let i = 0; i <= gridCount; i++) {
        const yVal = yMin + (yRange / gridCount) * i;
        const y = padding.top + chartH - (chartH / gridCount) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartW, y);
        ctx.stroke();
        ctx.fillText(String(Math.round(yVal * 10) / 10), padding.left - 8, y + 3);
      }

      // 计算点坐标
      const points = data.map((item, index) => {
        const x = padding.left + (chartW / (data.length - 1 || 1)) * index;
        const y = padding.top + chartH - ((Number(item.value) - yMin) / yRange) * chartH;
        return { x, y, value: item.value, date: item.date };
      });

      // 平滑折线
      ctx.setStrokeStyle('#4A7CFF');
      ctx.setLineWidth(2.5);
      ctx.setLineJoin('round');
      ctx.setLineCap('round');
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // 渐变填充
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      const grd = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grd.addColorStop(0, 'rgba(74, 124, 255, 0.15)');
      grd.addColorStop(1, 'rgba(74, 124, 255, 0.02)');
      ctx.setFillStyle(grd);
      ctx.fill();

      // 数据点
      points.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.setFillStyle('#FFFFFF');
        ctx.fill();
        ctx.setStrokeStyle('#4A7CFF');
        ctx.setLineWidth(2);
        ctx.stroke();

        // 数值标签
        if (i === 0 || i === points.length - 1 || p.value === maxVal) {
          ctx.setFillStyle('#4A7CFF');
          ctx.setFontSize(11);
          ctx.setTextAlign('center');
          ctx.fillText(String(p.value), p.x, p.y - 10);
        }
      });

      // X轴日期
      ctx.setFillStyle('#BBBBBB');
      ctx.setFontSize(10);
      const showIndices = [0, Math.floor((points.length - 1) / 2), points.length - 1];
      showIndices.forEach(idx => {
        if (idx >= 0 && idx < points.length) {
          const p = points[idx];
          ctx.setTextAlign(idx === 0 ? 'left' : idx === points.length - 1 ? 'right' : 'center');
          const dateStr = p.date ? p.date.slice(5) : '';
          ctx.fillText(dateStr, p.x, padding.top + chartH + 16);
        }
      });

      ctx.draw();
    },
  },
});
