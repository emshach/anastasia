<template lang="html">
  <div class="tab-project">
    <div class="header">
      <div class="ctrl-before"><slot name="ctrl-before" /></div>
      <div class="title"><slot name="title">{{ project.name }}</slot></div>
      <div class="ctrl-after"><slot name="ctrl-after" /></div>
    </div>
    <div class="body">
      <tab-window v-for="w in project.windows" :window=w :key=w.id 
                  @ctrl=pass />
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
  methods: {
    pass(e) {
      this.$emit( 'ctrl', e );
    }
  },
  computed: {}
}
</script>

<style lang="scss">
.tab-project {
  > .header {
    color: grey;
    font-size: 120%;
    font-weight: bold;
    padding: 4px;
    border-bottom: 3px solid #444;
    margin: 4px 0;
  }
  > .body {
    padding-left: 4px;
  }
  &:hover > .header {
    color: lightskyblue;
    border-bottom-color: lightskyblue;
  }
}
</style>
