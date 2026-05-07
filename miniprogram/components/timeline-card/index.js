Component({
  properties: {
    item: {
      type: Object,
      value: {},
    },
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.data.item._id });
    },
  },
});
