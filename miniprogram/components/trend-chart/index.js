Component({
  properties: {
    data: {
      type: Array,
      value: [],
    },
  },

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
        if (res && res[0] && res[0].width > 0) {
          this.canvasWidth = res[0].width;
          this.canvasHeight = res[0].height;
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

      const padding = { top: 48, bottom: 44, left: 52, right: 28 };
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
      const paddingY = (maxVal - minVal) * 0.2;
      const yMin = Math.max(0, Math.floor(minVal - paddingY));
      const yMax = Math.ceil(maxVal + paddingY);
      const yRange = yMax - yMin || 1;

      // 网格线（水平 4 条）
      ctx.setStrokeStyle('#F0F0F0');
      ctx.setLineWidth(0.5);
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + chartH - (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartW, y);
        ctx.stroke();
      }

      // Y 轴标签
      ctx.setFontSize(11);
      ctx.setFillStyle('#BBBBBB');
      ctx.setTextAlign('right');
      for (let i = 0; i <= 4; i++) {
        const yVal = yMin + (yRange / 4) * i;
        const y = padding.top + chartH - (chartH / 4) * i;
        ctx.fillText(String(Math.round(yVal * 10) / 10), padding.left - 10, y + 4);
      }

      // 计算点坐标
      const count = data.length;
      const points = data.map((item, index) => {
        const x = count === 1
          ? padding.left + chartW / 2
          : padding.left + (chartW / (count - 1)) * index;
        const y = padding.top + chartH - ((Number(item.value) - yMin) / yRange) * chartH;
        return { x, y, value: item.value, date: item.date };
      });

      // 渐变填充区域
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      const grd = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grd.addColorStop(0, 'rgba(74, 124, 255, 0.18)');
      grd.addColorStop(1, 'rgba(74, 124, 255, 0.02)');
      ctx.setFillStyle(grd);
      ctx.fill();

      // 折线
      ctx.setStrokeStyle('#4A7CFF');
      ctx.setLineWidth(3);
      ctx.setLineJoin('round');
      ctx.setLineCap('round');
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // 数据点 + 标签
      points.forEach((p, i) => {
        // 外圈
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.setFillStyle('#FFFFFF');
        ctx.fill();
        ctx.setStrokeStyle('#4A7CFF');
        ctx.setLineWidth(2.5);
        ctx.stroke();

        // 数值标签（所有点都显示，但避免和折线重叠：放在上方）
        const isHighest = Number(p.value) === maxVal;
        const labelY = isHighest ? p.y - 14 : p.y - 14;
        ctx.setFillStyle(isHighest ? '#FF6B6B' : '#4A7CFF');
        ctx.setFontSize(13);
        ctx.setTextAlign('center');
        ctx.fillText(String(p.value), p.x, labelY);
      });

      // X 轴日期（去重，避免重复绘制）
      ctx.setFillStyle('#BBBBBB');
      ctx.setFontSize(11);
      const showSet = new Set();
      // 只显示第一个和最后一个，中间均匀取一个
      const indicesToShow = [];
      indicesToShow.push(0);
      if (count > 2) {
        indicesToShow.push(Math.floor(count / 2));
      }
      if (count > 1) {
        indicesToShow.push(count - 1);
      }
      indicesToShow.forEach(idx => {
        if (idx >= 0 && idx < points.length && !showSet.has(idx)) {
          showSet.add(idx);
          const p = points[idx];
          ctx.setTextAlign(
            idx === 0 ? 'left' : idx === points.length - 1 ? 'right' : 'center'
          );
          const dateStr = p.date ? p.date.slice(5) : '';
          ctx.fillText(dateStr, p.x, padding.top + chartH + 18);
        }
      });

      ctx.draw();
    },
  },
});
