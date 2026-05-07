Component({
  properties: {
    data: {
      type: Array,
      value: [],
    },
  },

  data: {
    canvasWidth: 0,
    canvasHeight: 0,
  },

  lifetimes: {
    attached() {
      this.initCanvas();
    },
  },

  observers: {
    'data': function(data) {
      if (data && data.length > 0 && this.canvasCtx) {
        this.drawChart();
      }
    },
  },

  methods: {
    initCanvas() {
      const query = this.createSelectorQuery();
      query.select('.chart-canvas').boundingClientRect();
      query.exec((res) => {
        if (res && res[0]) {
          const rect = res[0];
          const dpr = wx.getSystemInfoSync().pixelRatio;
          this.setData({
            canvasWidth: rect.width,
            canvasHeight: rect.height,
          });
          this.canvasCtx = wx.createCanvasContext('trendCanvas', this);
          this.dpr = dpr;
          if (this.properties.data && this.properties.data.length > 0) {
            this.drawChart();
          }
        }
      });
    },

    drawChart() {
      const ctx = this.canvasCtx;
      const dpr = this.dpr || 1;
      const { canvasWidth, canvasHeight } = this.data;
      const data = this.properties.data;

      if (!ctx || !data || data.length === 0) return;

      const width = canvasWidth;
      const height = canvasHeight;

      // 高清适配
      ctx.scale(dpr, dpr);
      const w = width / dpr;
      const h = height / dpr;

      // 边距
      const padding = { top: 30, bottom: 30, left: 44, right: 16 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      // 清空
      ctx.clearRect(0, 0, w, h);

      // 计算数值范围
      const values = data.map(d => Number(d.value));
      let minVal = Math.min(...values);
      let maxVal = Math.max(...values);
      if (minVal === maxVal) {
        minVal = Math.max(0, minVal - 1);
        maxVal = maxVal + 1;
      }
      const range = maxVal - minVal || 1;
      const step = Math.ceil(range / 4);
      const yMin = Math.max(0, Math.floor(minVal - step * 0.2));
      const yMax = Math.ceil(maxVal + step * 0.2);
      const yRange = yMax - yMin || 1;

      // 绘制网格线和 Y 轴标签
      ctx.setStrokeStyle('#EEEEEE');
      ctx.setLineWidth(0.5);
      ctx.setFontSize(10);
      ctx.setFillStyle('#999999');
      ctx.setTextAlign('right');

      const gridCount = 4;
      for (let i = 0; i <= gridCount; i++) {
        const yVal = yMin + (yRange / gridCount) * i;
        const y = padding.top + chartH - (chartH / gridCount) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartW, y);
        ctx.stroke();
        ctx.fillText(String(Math.round(yVal * 10) / 10), padding.left - 6, y + 3);
      }

      // 计算点坐标
      const points = data.map((item, index) => {
        const x = padding.left + (chartW / (data.length - 1 || 1)) * index;
        const y = padding.top + chartH - ((Number(item.value) - yMin) / yRange) * chartH;
        return { x, y, value: item.value, date: item.date };
      });

      // 绘制折线
      ctx.setStrokeStyle('#2B6AFF');
      ctx.setLineWidth(2);
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // 绘制渐变填充区域
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      const grd = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grd.addColorStop(0, 'rgba(43, 106, 255, 0.12)');
      grd.addColorStop(1, 'rgba(43, 106, 255, 0.01)');
      ctx.setFillStyle(grd);
      ctx.fill();

      // 绘制数据点
      points.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.setFillStyle('#FFFFFF');
        ctx.fill();
        ctx.setStrokeStyle('#2B6AFF');
        ctx.setLineWidth(1.5);
        ctx.stroke();

        // 数值标签（最左和最右，以及最大值）
        if (i === 0 || i === points.length - 1 || p.value === maxVal) {
          ctx.setFillStyle('#2B6AFF');
          ctx.setFontSize(11);
          ctx.setTextAlign('center');
          ctx.fillText(String(p.value), p.x, p.y - 8);
        }
      });

      // X 轴日期标签
      ctx.setFillStyle('#999999');
      ctx.setFontSize(10);
      const showIndices = [0, Math.floor((points.length - 1) / 2), points.length - 1];
      showIndices.forEach(idx => {
        if (idx >= 0 && idx < points.length) {
          const p = points[idx];
          ctx.setTextAlign(idx === 0 ? 'left' : idx === points.length - 1 ? 'right' : 'center');
          const dateStr = p.date ? p.date.slice(5) : '';
          ctx.fillText(dateStr, p.x, padding.top + chartH + 14);
        }
      });

      ctx.draw();
    },
  },
});
