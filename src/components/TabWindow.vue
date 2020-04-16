<template lang="html">
  <div class="tab-window">
    <div class="header">
      <div class="ctrl-before"><slot name="ctrl-before" /></div>
      <div class="title"><slot name="title">{{ window.title }}</slot></div>
      <div class="ctrl-after"><slot name="ctrl-after" /></div>
    </div>
    <div class="body">
      <tab-item v-for="t in windows.tabs" :tab=t :key=t.id />
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
  computed: {}
}
</script>

<style lang="scss">
.tab-window {
  
}
</style>
