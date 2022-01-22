<template lang="pug">
.tab-item(
  v-hover-intent='hover'
  :class='classes'
  @click='selectTab'
  @mouseleave='unHover'  
)
  .inner( v-if='editing' )
    input( v-model='editing.title' )
    .space
    .ctrl-after
      a.btn.edit-btn( href='#' title='submit' @click.stop.prevent='resetTab' )
        check-icon.icon( decoration )
      a.btn.edit-btn( href='#' title='cancel' @click.stop.prevent='submitTab' )
        close-btn.icon( decoration )
  .inner( v-else )

    slot( name='ctrl-before' )
      .ctrl-before
        slot( name='ctrl-before-prepend' )
        a.btn.close-btn(
          href='#'
          title="delete tab"
          @click.stop.prevent='removeTab'
        )
          delete-icon.icon( decoration )
        a.btn.close-btn(
          v-if='!tab.closed'
          href='#'
          title="close tab"
          @click.stop.prevent='closeTab'
        )
          close-icon.icon( decoration )
        slot( name='ctrl-before-append' )
    a.name( :href='tab.url' @click.stop.prevent='focusTab' )
      tab-icon( :icon='tab.icon' )
      span.title {{ tab.title || tab.url }}
    .space
    slot( name='ctrl-after' )
      .ctrl-after
        slot( name='ctrl-after-prepend' )
        a.btn.edit-btn( href='#' title='edit' @click.stop.prevent='editTab' )
          edit-icon.icon( decoration )
        slot( name='ctrl-after-append' )
</template>

<script lang="js">
import { mapGetters, mapActions } from 'vuex'
import state from '@/control-panel/state'
import TabIcon from './tab-icon'
import CloseIcon from 'icons/Close'
import EditIcon from 'icons/Pencil'
import CheckIcon from 'icons/Check'
import ResetIcon from 'icons/UndoVariant'
import DeleteIcon from 'icons/Delete'

export default {
  name: 'TabItem',
  mixins: [],
  components: {
    TabIcon,
    CloseIcon,
    EditIcon,
    CheckIcon,
    ResetIcon,
    DeleteIcon,
  },
  props: {
    tabId: {
      type: String,
      required: true
    },
    activeTab: String,
    opening: {
      type: Boolean,
      default: false,
    },
    closing: {
      type: Boolean,
      default: false,
    },
    focus: {
      type: Boolean,
      default: false,
    },
    point: {
      type: String,
      default: '',
    },
    search: {
      type: [ RegExp, String ],
      default: ''
    },
  },
  data() {
    return {
      editing: false,
    }
  },
  created() {
  },
  mounted() {},
  methods: {
    ...mapActions([ 'send' ]),
    hover() {
      this.$emit( 'hover', this.tab.id )
    },
    unHover() {
      this.$emit( 'unhover', this.tab.id )
    },
    focusTab() {
      this.send({ op: 'focusTab', tabId: this.tab.id })
    },
    closeTab() {
      this.send({ op: 'closeTab', tabId: this.tab.id })
    },
    editTab() {
      this.editing = {
        title: this.tab.title,
      }
    },
    submitTab() {
      this.send({
        op: 'editTab',
        tabId: this.tab.id,
        updates: this.editing
      })
      this.editing = null
    },
    resetTab() {
      this.editing = null
    },
    selectTab() {
      console.log( 'selecting tab', this.tab )
      state.setFocus( this.tab )
    },
    removeTab() {
      this.send({ op: 'removeTab', tabId: this.tab.id })
    },
  },
  computed: {
    tab() {
      return this.$store.state.tabs[ this.tabId ] || {}
    },
    classes() {
      return {
        hovered: this.point === this.tab.id,
        focus: this.focus,
        selected: this.tab.selected,
        opening: this.opening,
        closing: this.closing,
        active: this.tabId === this.activeTab,
        closed: this.tab.closed,
        attention: this.tab.attention,
        audible: this.tab.audible,
        discarded: this.tab.discarded,
        hidden: this.tab.hidden,
        highlighted: this.tab.highlighted,
        incognito: this.tab.incognito,
        pinned: this.tab.pinned,
      }
    }
  }
}
</script>

<style lang="scss">
.tab-item {
  position: relative;
  box-sizing: border-box;
  transition: all 400ms;
  .favicon {
    display: block;
    float: left;
    margin: -2px 6px 0 -2px;
    width: 1.7rem;
    height: 1.7rem;
    color: lightskyblue;
    fill: lightskyblue;
    /* transition: 140ms; */
  }
  > .inner {
    height: 2em;
    min-height: 2em;
    box-sizing: border-box;
    /* margin-bottom: 1px; */
    position: relative;
    border: 1px solid transparent;
    background: rgba(255,255,255,0.1);
    overflow: hidden;
    transition: all 400ms;
    a.name {
      display: block;
      padding: 3px 4px;
      span.title {
        display: block;
        height: 1.1rem;
        overflow: hidden;
        transition: all 400ms;
      }
    }
    .ctrl-before {
      float: right;
      position: relative;
      --s-icon: 1.5rem;
      font-size: var(--s-icon);
      transition: background 1s, box-shadow 1s;
      .icon {
        display: inline-block;
        opacity: 0;
        transition: opacity 1s;
      }
      * {
        position: relative;
      }
    }
  }
  &.active {
    > .inner {
      background: rgba(205,225,255,0.2);
      a.name {
        color: lightcyan;
        /* font-weight: bold; */
        /* text-shadow: 0 0 2px lightskyblue; */
      }
    }
  }
  /* &.discarded > .inner > a { */
  /*   color: #aaa; */
  /* } */
  &.discarded {
    opacity: 0.5;
  }
  &.closed {
    > .inner {
      color: #aaa;
      background: transparent;
    }
  }
  .active &.active, &.focus, &.hovered, &.selected {
    > .inner {
      /* background: rgba(255,255,255,0.15); */
      color: black;
      border-color: rgba(255,255,255,0.05);
      border-top-color: rgba(255,255,255,0.1);
      background: lightskyblue;
      display: flex;
      flex-direction: column;
      .space {
        flex: 1;
      }
      a.name {
        color: black;
        padding-right: 2.5em;
        span.title {
          color: black;
          height: auto;
          font-size: 110%;
        }
      }
      .ctrl-before {
        background: lightskyblue;
        box-shadow: 0 0 20px lightskyblue,
                    0 0 20px lightskyblue,
                    0 0 20px lightskyblue,
                    0 0 20px lightskyblue,
                    0 0 20px lightskyblue,
                    0 0 20px lightskyblue,
                    0 0 20px lightskyblue, 
                    0 0 20px lightskyblue;
        position: absolute;
        align-self: end;
        opacity: 1;
        .icon {
          opacity: 1;
        }
      }
      .ctrl-after {
        opacity: 1;
      }
    }
  }
  &.focus, &.hovered, &.selected {
    > .inner {
      min-height: 8em;
    }
    * {
      color: black;
    }
    .favicon {
      width: 3.2rem;
      height: 3.2rem;
    }
  }
  &.selected, &.selected >.inner {
    min-height: 20em;
  }
}
</style>
