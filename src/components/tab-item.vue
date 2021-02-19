<template lang="pug">
.tab-item( :class=classes @click=selectTab )
  .inner( v-if='editing' )
    input( v-model='editing.title' )
    .space
    .ctrl-after
      a.btn.edit-btn( href='#' title='submit' @click.stop.prevent='resetTab' )
        img( src='icons/check.svg' )
      a.btn.edit-btn( href='#' title='reset' @click.stop.prevent='submitTab' )
        img( src='icons/ff-close.svg' )
  .inner( v-else )
    slot( name='ctrl-before' )
      .ctrl-before
        slot( name='ctrl-before-prepend' )
        a.btn.close-btn( href='#' @click.stop.prevent='closeTab' )
          img( src='icons/ff-close.svg' )
        slot( name='ctrl-before-append' )
    a( href='#' @click.stop.prevent='focusTab' )
      tab-icon( :icon='tab.icon' )
      span {{ tab.title || tab.url }}
    .space
    slot( name='ctrl-after' )
      .ctrl-after
        slot( name='ctrl-after-prepend' )
        a.btn.edit-btn( href='#' title='add note' @click.stop.prevent='editTab' )
          img( src='icons/edit.svg' )
        slot( name='ctrl-after-append' )
</template>

<script lang="js">
import state from '@/control-panel/state'
import TabIcon from './tab-icon'

export default {
  name: 'TabItem',
  mixins: [],
  components: { TabIcon },
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
  },
  data() {
    return {
      editing: false,
    };
  },
  created() {
  },
  mounted() {},
  methods: {
    focusTab() {
      this.$emit( 'ctrl', { op: 'focusTab', tabId: this.tab.id });
    },
    closeTab() {
      this.$emit( 'ctrl', { op: 'closeTab', tabId: this.tab.id });
    },
    editTab() {
      this.editing = {
        title: this.tab.title,
      };
    },
    submitTab() {
      this.$emit( 'ctrl', {
        op: 'editTab',
        tabId: this.tab.id,
        updates: this.editing
      });
      this.editing = null;
    },
    resetTab() {
      this.editing = null;
    },
    selectTab() {
      console.log( 'selecting tab', this.tab );
      state.setFocus( this.tab );
    },
  },
  computed: {
    classes() {
      return {
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
  height: 2em;
  transition-property: height !important;
  transition-timing-function: linear !important;
  transition-duration: 500ms;
  &.opening > .inner {
    border-top-left-radius: 4px;
    /* border-top-right-radius: 4px; */
  }
  &.closing > .inner {
    border-bottom-left-radius: 4px;
    /* border-bottom-right-radius: 4px; */
  }
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
    box-sizing: border-box;
    /* margin-bottom: 1px; */
    position: relative;
    border: 1px solid transparent;
    background: rgba(255,255,255,0.1);
    height: 100%;
    overflow: hidden;
    transition-duration: 500ms;
    > a {
      display: block;
      padding: 3px 4px;
      > span {
        display: block;
        height: 11px;
        overflow: hidden;
        transition: 400ms;
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
      > a {
        color: lightcyan;
        /* font-weight: bold; */
        /* text-shadow: 0 0 2px lightskyblue; */
      }
    }
  }
  &.discarded > .inner > a {
    color: #aaa;
  }
  .active &.active, &.focus, &:hover, &.selected {
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
      > a {
        color: black;
        > span {
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
  &.focus, &:hover, &.selected {
    height: 8em;
    * {
      color: black;
    }
    .favicon {
      width: 32px;
      height: 32px;
    }
  }
  &.selected, &.selected >.inner {
    height: 20em;
  }
}
</style>
