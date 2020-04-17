<template lang="html">
  <div class="tab-project">
    <div class="header">
      <div class="ctrl-before"><slot name="ctrl-before" /></div>
      <div class="title"><slot name="title">{{ project.name }}</slot></div>
      <div class="ctrl-after"><slot name="ctrl-after" /></div>
    </div>
    <div class="body">
      <tab-window v-for="w in project.windows" :window=w :key=w.id />
    </div>
    <div class="footer">
    </div>
  </div>
</template>

<script lang="js">
import TabWindow from '@/components/TabWindow'
export default {
  name: 'TabProject',
  mixins: [],
  components: { TabWindow },
  props: {
    project: {
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
.tab-project {
  
}
</style>
