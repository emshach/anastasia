<template lang="pug">
.tab-project
  .header(
    v-hover-intent='hover'
    @mouseleave='unHover'
    :class='{ hovered }'
  )
    .ctrl-before
       slot( name='ctrl-before' )
    .title
       slot( name='title' )
         | {{ project.name }}
    .ctrl-after( slot name='ctrl-after' )
  .body
    tab-window(
      v-for='wid in project.windowIds'
      :key='wid'
      :windowId='wid'
      :point='point'
      :search='search'
      @hover='passHover'
      @unhover='passUnhover'
    )
  .footer
</template>

<script lang="js">
import { mapGetters, mapActions } from 'vuex'
import TabWindow from '@/components/tab-window'
export default {
  name: 'TabProject',
  mixins: [],
  components: { TabWindow },
  props: {
    projectId: {
      type: String,
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
    ...mapActions([ 'send' ]),
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
  },
  computed: {
    project() {
      return this.$store.state.projects[ this.projectId ] || {}
    },
    hovered() {
      return this.point === this.project.id
    },
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
