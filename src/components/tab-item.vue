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
        check-icon
      a.btn.edit-btn( href='#' title='reset' @click.stop.prevent='submitTab' )
        img( src='icons/ff-close.svg' )
  .inner( v-else )
    slot( name='ctrl-before' )
      .ctrl-before
        slot( name='ctrl-before-prepend' )
        a.btn.close-btn( href='#' @click.stop.prevent='closeTab' )
          img( src='icons/ff-close.svg' )
        slot( name='ctrl-before-append' )
    a.name( href='#' @click.stop.prevent='focusTab' )
      tab-icon( :icon='tab.icon' )
      span.title {{ tab.title || tab.url }}
    .space
    slot( name='ctrl-after' )
      .ctrl-after
        slot( name='ctrl-after-prepend' )
        a.btn.edit-btn( href='#' title='add note' @click.stop.prevent='editTab' )
          edit-icon
        slot( name='ctrl-after-append' )
</template>

<script lang="js">
import state from '@/control-panel/state'
import TabIcon from './tab-icon'
import EditIcon from 'icons/Pencil'
import CheckIcon from 'icons/Check'

export default {
  name: 'TabItem',
  mixins: [],
  components: { TabIcon, EditIcon, CheckIcon },
  props: {
    tab: {
      type: Object,
      required: true
    },
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
    hover() {
      this.$emit( 'hover', this.tab.id )
    },
    unHover() {
      this.$emit( 'unhover', this.tab.id )
    },
    focusTab() {
      this.$emit( 'ctrl', { op: 'focusTab', tabId: this.tab.id })
    },
    closeTab() {
      this.$emit( 'ctrl', { op: 'closeTab', tabId: this.tab.id })
    },
    editTab() {
      this.editing = {
        title: this.tab.title,
      }
    },
    submitTab() {
      this.$emit( 'ctrl', {
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
  },
  computed: {
    classes() {
      return {
        hovered: this.point === this.tab.id,
        focus: this.focus,
        selected: this.tab.selected,
        opening: this.opening,
        closing: this.closing,
        active: this.tab.active,
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
    width: 17px;
    height: 17px;
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
        height: 11px;
        overflow: hidden;
        transition: all 400ms;
      }
    }
    .ctrl-before {
      float: right;
      position: relative;
      * {
        position: relative;
      }
      .close-btn {
        right: -20px;
        padding: 4px;
        display: block;
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
        position: absolute;
        align-self: end;
        opacity: 1;
        .close-btn {
          padding: 1px 4px;
          right: 0;
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
      width: 32px;
      height: 32px;
    }
  }
  &.selected, &.selected >.inner {
    min-height: 20em;
  }
}
</style>
