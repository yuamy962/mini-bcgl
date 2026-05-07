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
      const query = this.createSelectorQuery().in(this);
      query.select('#trendCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            // 延迟重试
            setTimeout(() => this.initCanvas(), 300);
            return;
          }
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio;
          const width = res[0].width;
          const height = res[0].height;

          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);

          this.canvas = canvas;
          this.ctx = ctx;
          this.canvasWidth = width;
          this.canvasHeight = height;
          this._initPending = false;
          this.tryDraw();
        });
    },

    tryDraw() {
      if (this._initPending || !this.ctx) return;
      if (this._pendingData && this._pendingData.length > 0) {
        this.drawChart(this._pendingData);
        this._pendingData = null;
      }
    },

    drawChart(data) {
      const ctx = this.ctx;
      const w = this.canvasWidth;
      const h = this.canvasHeight;

      if (!ctx || !data || data.length === 0) return;

      ctx.clearRect(0, 0, w, h);

      const padding = { top: 50, bottom: 36, left: 20, right: 20 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      // 数值范围
      const values = data.map(d => Number(d.value));
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      const dataRange = maxVal - minVal;
      const padY = Math.max(dataRange * 0.25, 3);
      const yMin = Math.max(0, Math.floor(minVal - padY));
      const yMax = Math.ceil(maxVal + padY);
      const yRange = yMax - yMin || 1;

      // 2条淡参考线（顶部和底部）
      ctx.strokeStyle = '#F0F0F0';
      ctx.lineWidth = 1;
      [0, 1].forEach(i => {
        const y = padding.top + chartH * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartW, y);
        ctx.stroke();
      });

      // 计算点坐标
      const count = data.length;
      const stepX = count <= 1 ? 0 : chartW / (count - 1);
      const points = data.map((item, index) => {
        const x = count === 1
          ? padding.left + chartW / 2
          : padding.left + stepX * index;
        const y = padding.top + chartH - ((Number(item.value) - yMin) / yRange) * chartH;
        return { x, y, value: item.value, date: item.date };
      });

      // 渐变填充
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      const grd = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grd.addColorStop(0, 'rgba(74, 124, 255, 0.12)');
      grd.addColorStop(1, 'rgba(74, 124, 255, 0.01)');
      ctx.fillStyle = grd;
      ctx.fill();

      // 折线
      ctx.strokeStyle = '#4A7CFF';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // 找出最高和最低点
      const maxPoint = points.reduce((a, b) => (Number(a.value) > Number(b.value) ? a : b));
      const minPoint = points.reduce((a, b) => (Number(a.value) < Number(b.value) ? a : b));

      // 是否显示全部标签
      const showAllLabels = points.length <= 6;

      // 数据点 + 标签
      points.forEach((p, idx) => {
        const isMax = p === maxPoint;
        const isMin = p === minPoint && !isMax;
        const showLabel = showAllLabels || isMax || isMin;

        // 外圈
        ctx.beginPath();
        ctx.arc(p.x, p.y, showLabel ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = isMax ? '#FF6B6B' : '#4A7CFF';
        ctx.lineWidth = showLabel ? 3 : 2;
        ctx.stroke();

        // 标签
        if (showLabel) {
          const label = String(p.value);
          const isHighlight = isMax || isMin;
          ctx.font = isHighlight ? 'bold 13px sans-serif' : '12px sans-serif';
          const metrics = ctx.measureText(label);
          const textW = metrics.width;

          // 白色背景
          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          const bgX = p.x - textW / 2 - 5;
          const bgW = textW + 10;
          const bgH = isHighlight ? 20 : 18;

          // 智能上下布局：全部显示时，偶数索引放上方，奇数索引放下方，避免相邻重叠
          const putTop = showAllLabels ? (idx % 2 === 0) : isMax;

          if (putTop) {
            ctx.fillRect(bgX, p.y - 28, bgW, bgH);
            ctx.fillStyle = isMax ? '#FF6B6B' : '#4A7CFF';
            ctx.textAlign = 'center';
            ctx.fillText(label, p.x, p.y - 14);
          } else {
            ctx.fillRect(bgX, p.y + 10, bgW, bgH);
            ctx.fillStyle = isMin ? '#4A7CFF' : '#5B8DEF';
            ctx.textAlign = 'center';
            ctx.fillText(label, p.x, p.y + 24);
          }
        }
      });

      // X 轴日期：只显示首尾
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#AAAAAA';

      const first = points[0];
      const last = points[points.length - 1];

      ctx.textAlign = 'left';
      ctx.fillText(first.date ? first.date.slice(5) : '', first.x, padding.top + chartH + 18);

      if (points.length > 1) {
        ctx.textAlign = 'right';
        ctx.fillText(last.date ? last.date.slice(5) : '', last.x, padding.top + chartH + 18);
      }
    },
  },
});
