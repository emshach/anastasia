<template lang="pug">
transition-group.tab-group.tablist( tag='div' :class='{ hovered }' )
  tab-item( 
    v-for='t in filteredTabs'
    :key='t.id'
    :tab='t'
    :point='point'
    :search='search'
    @ctrl='pass'
    @hover='passHover'
    @unhover='passUnhover'
 )
</template>

<script lang="js">
import TabItem from '@/components/tab-item'

export default {
  name: 'tab-group',
  mixins: [],
  components: { TabItem },
  props: {
    gid: {
      type: String,
      required: true
    },
    tabIds: {
      type: Object,
      default: () => ({})
    },
    tabs: {
      type: Array,
      default: () => []
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
    pass( $event ) {
      this.$emit( 'ctrl', $event )
    },
    hover() {
      this.$emit( 'hover', this.gid )
    },
    unHover() {
      this.$emit( 'unhover', this.gid )
    },
    passHover( $event ) {
      this.$emit( 'hover', $event )
    },
    passUnhover( $event ) {
      this.$emit( 'unhover', $event )
    }
  },
  computed: {
    hovered() {
      return this.point === this.gid || this.tabIds[ this.point ]
    },
    filteredTabs() {
      if ( !this.search ) return this.tabs
      return this.tabs.filter(
        t => t.title.match( this.search ) || t.url.match( this.search ))
    }
  }
}
</script>

<style lang="scss">
.tab-group {
  
}
</style>
