<template lang="pug">
transition-group.open-tabs.tablist( tag='div' )
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
  name: 'open-tabs',
  mixins: [],
  components: { TabItem },
  props: {
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
    filteredTabs() {
      if ( !this.search ) return this.tabs
      return this.tabs.filter(
        t => t.title.match( this.search ) || t.url.match( this.search ))
    }
  }
}
</script>

<style lang="scss">
.open-tabs {
  
}
</style>
