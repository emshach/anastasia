<template lang="pug">
.tab-project
  .header
    .ctrl-before
       slot( name='ctrl-before' )
    .title
       slot( name='title' )
         | {{ project.name }}
    .ctrl-after( slot name='ctrl-after' )
  .body
    tab-window(
      v-for='w in project.windows'
      :key='w.id'
      :window='w'
      @ctrl='pass'
    )
  .footer
</template>

<script lang="js">
import TabWindow from '@/components/tab-window'
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
