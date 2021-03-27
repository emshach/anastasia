<template lang="pug">
.k-header( :class='classes')
  .inner
    a.btn( v-hover-intent='openMenu' @click.prevent='openMenu' )
      menu-icon
    .title {{ title }}
    a.btn( v-hover-intent='openSearch' @click.prevent='openSearch' )
      search-icon
    input.search( ref='search' @input='searchInput' )
</template>

<script lang="js">
import MenuIcon from 'icons/Menu'
import SearchIcon from 'icons/Magnify'

export default {
  name: 'HeaderBlock',
  mixins: [],
  components: { MenuIcon, SearchIcon },
  props: {
    title: {
      type: String,
      required: true
    },
    search: {
      type: [ Boolean, String ],
      default: false
    }
  },
  data() {
    return {
    }
  },
  created() {},
  mounted() {},
  methods: {
    openSearch() {
      this.$emit( 'search', '' )
      this.$refs.search.select()
    },
    openMenu() {
      this.$emit( 'menu' )
    },
    searchInput( $event ) {
      this.$emit( 'search', $event.target.value )
    }
  },
  computed: {
    classes() {
      return {
        searching: this.search !== false
      }
    }
  }
}
</script>

<style lang="scss">
.k-header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  font-size: 2em;
  height: 2em;
  background: #042;
  color: white;
  margin-bottom: 0.5em;
  box-sizing: border-box;
  overflow: hidden;
  * {
    color: white;
  }
  .inner {
    position: relative;
    height: 100%;
    left: 0;
    padding: 0.25em;
    width: calc( 200% - 1.7em );
    display: flex;
    justify-content: flex-end;
    align-items: center;
    box-sizing: border-box;
    transition: left 250ms;
    > * {
      box-sizing: border-box;
      padding: 0.25em;
      max-height: 100%;
    }
    .title {
      white-space: nowrap;
      flex: 1;
      line-height: 1;
    }
    .search {
      width: calc( 50% - 1.5em );
      background: transparent;
      border: 0 none;
      border-bottom: 2px solid white;
      color: white;
      outline: 0 none !important;
    }
  }
  &.searching {
    > .inner {
      left: calc( -100% + 1.5em );
    }
  }
}
</style>
