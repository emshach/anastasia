<template lang="pug">
.tab-window.empty( v-if='noTabs' )
.tab-window( v-else :class='classes' )
  .header( :class='{ editing, hovered }' )
    transition( name='fade' mode='out-in' )
      .inner( v-if='editing' key='edit' )
        form( @submit.prevent='submitWindow' @reset.prevent='resetWindow' )
          input( v-model='editing.title' )
          .space
          .ctrl-after
            a.btn.edit-btn( href='#' title='submit'
              @click.stop.prevent='resetWindow'
            )
              img( src='icons/check.svg' )
            a.btn.edit-btn(
              href='#'
              title='reset'
              @click.stop.prevent='submitWindow'
            )
              img( src='icons/ff-close.svg' )
      .inner(
        v-else
        v-hover-intent='hover'
        key='normal'
        @click.prevent='selectWindow'
        @mouseleave='unHover'
      )
        slot( name='ctrl-before' )
          .ctrl-before
            slot( name='ctrl-before-prepend' )
            a.btn.close-btn( href='#' @click.stop.prevent='closeWindow' )
              img( src='icons/ff-close.svg' )
            slot( name='ctrl-before-append' )
        .title
          slot( name='title' )
            a( href='#' @click.stop.prevent='focusWindow' )
              | {{ window.title }}
        .space
        slot( name='ctrl-after' )
          .ctrl-after
            slot( name='ctrl-after-prepend' )
            a.btn.edit-btn(
              href='#'
              title='edit'
              @click.stop.prevent='editWindow'
            )
              img( src='icons/edit.svg' )
            slot( name='ctrl-after-append' )
  .body
    //- template( v-for='g in tabGroups' )
    //-   tab-group(
    //-     v-if=`g.type === 'group'`
    //-     :key=`g.tabs[0].id`
    //-     :gid='`group-${g.tabs[0].id}`'
    //-     :tabIds='g.ids'
    //-     :tabs='g.tabs'
    //-     :point='point'
    //-     :search='search'
    //-     @hover='passHover'
    //-     @unhover='passUnhover'
    //-   )
    //-   closed-tabs(
    //-     v-else-if=`g.type === 'closed'`
    //-     :key=`g.tabs[0].id`
    //-     :gid='`group-${g.tabs[0].id}`'
    //-     :tabs='g.tabs'
    //-     :point='point'
    //-     :search='search'
    //-     @hover='passHover'
    //-     @unhover='passUnhover'
    //-   )
    //-   open-tabs(
    //-     v-else
    //-     :key=`g.tabs[0].id`
    //-     :tabs='g.tabs'
    //-     :point='point'
    //-     :search='search'
    //-     @hover='passHover'
    //-     @unhover='passUnhover'
    //-   )
    tab-item(
      v-for='tid in window.tabIds'
      :key='tid'
      :tabId='tid'
      :activeTab='window.activeTab'
      :point='point'
      :search='search'
      @hover='passHover'
      @unhover='passUnhover'
    )
  .footer
</template>

<script lang="js">
import { mapGetters, mapActions } from 'vuex'
// import TabGroup from '@/components/tab-group'
// import ClosedTabs from '@/components/closed-tabs'
// import OpenTabs from '@/components/open-tabs'
import TabItem from '@/components/tab-item'
import state from '@/control-panel/state'

export default {
  name: 'TabWindow',
  mixins: [],
  // components: { TabGroup, ClosedTabs, OpenTabs },
  components: { TabItem },
  props: {
    windowId: {
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
      editing: null,
      leaving: null,
    }
  },
  created() {},
  mounted() {},
  methods: {
    ...mapActions([ 'send' ]),
    hover() {
      this.$emit( 'hover', this.window.id )
    },
    unHover() {
      this.$emit( 'unhover', this.window.id )
    },
    passHover( $event ) {
      this.$emit( 'hover', $event )
    },
    passUnhover( $event ) {
      this.$emit( 'unhover', $event )
    },
    focusWindow() {
      this.send({ op: 'focusWindow', windowId: this.window.id })
    },
    editWindow() {
      this.editing = {
        title: this.window.title
      }
    },
    submitWindow() {
      this.send({
        op: 'editWindow',
        windowId: this.window.id,
        updates: this.editing
      })
      this.editing = null
    },
    resetWindow() {
      this.editing = null
    },
    closeWindow() {
      this.send({ op: 'closeWindow', windowId: this.window.id })
    },
    selectWindow() {
      console.log( 'selecting window', this.window )
      state.setFocus( this.window )
    },
  },
  computed: {
    window() {
      return this.$store.state.windows[ this.windowId ] || {}
    },
    hovered() {
      return this.point === this.window.id
    },
    // tabState() {
    //   const t = this.window.tabs
    //   let last
    //   let next
    //   return this.window.tabs.map(( cr, i ) => {
    //     next = t[ i + 1 ]
    //     const opening = !last || last.closed
    //     const closing = !next || next.closed
    //     last = cr
    //     return { opening, closing }
    //   })
    // },
    // tabGroups() {
    //   const groups = []
    //   let last = { tabs: [] }
    //   let lastTab = null
    //   this.window.tabs.forEach( t => {
    //     if ( t.openerId ) {
    //       if ( last.type === 'group' && last.ids[ t.openerId ]) {
    //         last.ids[ t.id ] = true
    //         last.tabs.push(t)
    //       } else if ( lastTab && lastTab.id === t.openerId ) {
    //         if ( last.tabs.length === 1 ) {
    //           groups.pop()
    //         } else {
    //           last.tabs.pop()
    //         }
    //         last = {
    //           type: 'group',
    //           ids: {
    //             [ lastTab.id ]: true,
    //             [ t.id ]: true
    //           },
    //           tabs: [ lastTab, t ]
    //         }
    //         groups.push( last )
    //         lastTab = t
    //       }
    //       return
    //     }
    //     if ( t.closed ) {
    //       if ( last.type === 'closed' ) {
    //         last.tabs.push(t)
    //       } else {
    //         last = {
    //           type: 'closed',
    //           tabs: [t]
    //         }
    //         groups.push( last )
    //       }
    //     } else if ( last.type === 'open' ) {
    //       last.tabs.push(t)
    //     } else {
    //       last = {
    //         type: 'open',
    //         tabs: [t]
    //       }
    //       groups.push( last )
    //     }
    //     lastTab = t
    //   })
    //   return groups
    // },
    noTabs() {
      if ( !this.search ) return false
      return !this.window.tabs.find(
        t => t.title.match( this.search ) || t.url.match( this.search ))
    },
    classes() {
      return [
        {
          collapsed: this.window.collapsed,
          active: this.$store.state.activeWindow === this.windowId,
        },
        `state-${this.window.state}`,
        `type-${this.window.type}`,
      ]
    }
  }
}
</script>

<style lang="scss">
.tab-window {
  margin-bottom: 1em;
  > .header {
    color: grey;
    font-weight: bold;
    padding: 4px;
    transition: 140ms;
    transition-timing-function: linear;
    height: auto;
    overflow: hidden;
    box-sizing: border-box;
    > .inner {
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
      a, a:visited, a:active, a:hover {
        color: grey;
      }
    }
    .ctrl-before {
      transition: 300ms;
      align-self: end;
      position: relative;
      top: -30px;
      height: 0;
      * {
        position: relative;
      }
      .close-btn {
        margin-right: -4px;
      }
    }
    .ctrl-after {
      transition: 300ms;
      position: relative;
      justify-self: flex-end;
      position: relative;
      height: 0;
    }
    .space {
      transition: 300ms;
      position: relative;
      flex: 1;
      height: 0;
    }
    &.hovered {
      .ctrl-before,.ctrl-after, .space {
        opacity: 1;
        height: auto;
      }
      .ctrl-before {
        top: 0;
      }
      border-radius: 3px;
      margin-bottom: 2px;
      background: lightskyblue;
      color: black;
      font-size: 120%;
      height: auto;
      a, a:visited, a:active, a:hover {
        color: black;
      }
      * {
        color: black;
      }
    }
  }
  &.active, &.selected {
    > .header {
      color: lightskyblue;
      a, a:visited, a:active, a:hover {
        color: lightskyblue;
      }
      &.hovered {
        .ctrl-before,.ctrl-after, .space {
          opacity: 1;
        }
        .ctrl-before {
          top: 0;
        }
        border-radius: 3px;
        margin-bottom: 2px;
        background: lightskyblue;
        color: black;
        font-size: 120%;
        height: auto;
        a, a:visited, a:active, a:hover {
          color: black;
        }
        * {
          color: black;
        }
      }
    }
  }
  > .body {
    .tablist {
      position: relative;
      border-radius: 3px;
      overflow: hidden;
    }
  }
  margin-top: 8px;
  /* border-top: 1px solid rgba(160,215,255,0.05); */
  &:first-child {
    margin-top: 0;
    border-top: 0 none;
  }
  /* &.active > .header:hover, > .header:hover, > .header.editing, */
  /* &.selected > .header { */
  /*   color: black; */
  /*   background: lightskyblue; */
  /*   height: 8em; */
  /*   a, a:visited, a:active, a:hover { */
  /*     color: black; */
  /*   } */
  /*   .ctrl-before { */
  /*     top: 0; */
  /*     height: 20px; */
  /*   } */
  /*   .ctrl-before,.ctrl-after { */
  /*     opacity: 1; */
  /*   } */
  /* } */
  /* &.selected >.header { */
  /*   height: 20em; */
  /* } */
}
</style>
