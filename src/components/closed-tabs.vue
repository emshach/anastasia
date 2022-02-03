<template lang="pug">
.closed-tabs
  template( v-if='closedTabs.length' )
    .header Recently Closed Tabs
    transition-group.tablist( tag='div' name='list' )
      closed-tab-item(
        v-for='t in closedTabs'
        :key='t'
        :tab-id='t'
        :search='search'
        @hover='passHover'
        @unhover='passUnhover'
      )
</template>

<script lang="js">
import ClosedTabItem from '@/components/closed-tab-item'

export default {
  name: 'closed-tabs',
  mixins: [],
  components: { ClosedTabItem },
  props: {
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
  },
  computed: {
    closedTabs() {
      return this.$store.state.closedTabs
    }
  }
}
</script>

<style lang="scss">
.closed-tabs {
  
}
</style>
