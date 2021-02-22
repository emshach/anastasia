<template lang="pug">
.tab-project
  .header( v-hover-intent='hover' @mouseleave='unHover' :class='{ hovered }' )
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
      :point='point'
      :search='search'
      @ctrl='pass'
      @hover='passHover'
      @unhover='passUnhover'
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
    },
    point: {
      type: String,
      default: ''
    },
    search: {
      type: [ RegExp, String ],
      default: ''
    }
  },
  data() {
    return {
    }
  },
  created() {},
  mounted() {},
  methods: {
    hover() {
      this.$emit( 'hover', this.project.id )
    },
    unHover() {
      this.$emit( 'unhover', this.project.id )
    },
    passHover( $event ) {
      this.$emit( 'hover', $event )
    },
    passUnhover( $event ) {
      this.$emit( 'unhover', $event )
    },
    pass( $event ) {
      this.$emit( 'ctrl', $event )
    }
  },
  computed: {
    hovered() {
      return this.point === this.project.id
    }
  }
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
    padding: 2px;
  }
  &:hover > .header {
    color: lightskyblue;
    border-bottom-color: lightskyblue;
  }
}
</style>
