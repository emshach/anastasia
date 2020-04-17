<template lang="html">
  <div class="tab-window">
    <div class="header">
      <div class="ctrl-before"><slot name="ctrl-before" /></div>
      <div class="title"><slot name="title">{{ window.title }}</slot></div>
      <div class="ctrl-after"><slot name="ctrl-after" /></div>
    </div>
    <div class="body">
      <tab-item v-for="( t, i ) in window.tabs" :tab=t :key=t.id
                :opening="tabState[i].opening"
                :closing="tabState[i].closing" />
    </div>
    <div class="footer">
  </div>
    </div>
</template>

<script lang="js">
import TabItem from '@/components/TabItem'

export default {
  name: 'TabWindow',
  mixins: [],
  components: { TabItem },
  props: {
    window: {
      type: Object,
      required: true,
    }
  },
  data() {
    return {
    };
  },
  created() {},
  mounted() {},
  methods: {},
  computed: {
    tabState() {
      let t = this.window.tabs;
      let last;
      let next;
      return this.window.tabs.map(( cr, i ) => {
        next = t[ i + 1 ];
        const opening = !last || last.closed;
        const closing = !next || next.closed;
        last = cr;
        return { opening, closing };
      });
    }
  }
}
</script>

<style lang="scss">
.tab-window {
  > .header {
    font-weight: bold;
    padding: 4px;
  }
  > .body {
    padding-left:4px;
  }
  margin-top: 8px;
  /* border-top: 1px solid rgba(160,215,255,0.05); */
  &:first-child {
    margin-top: 0;
    border-top: 0 none;
  }
}
</style>
