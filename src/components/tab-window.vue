<template lang="pug">
.tab-window( :class='classes' @click='selectWindow' )
  .header( :class='{ editing }' )
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
      .inner( v-else key='normal' )
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
    transition-group.tablist( name='list' tag='div' )
      tab-item(
        v-for='( t, i ) in window.tabs'
        :tab='t'
        :key='t.id'
        :opening='tabState[i].opening'
        :closing='tabState[i].closing'
        class='tabitem-test'
        @ctrl='pass'
      )
  .footer
</template>

<script lang="js">
import TabItem from '@/components/tab-item'
import state from '@/control-panel/state'

export default {
  name: 'TabWindow',
  mixins: [],
  components: { TabItem },
  props: {
    window: {
      type: Object,
      required: true,
    }
  },
  data() {
    return {
      editing: null,
    };
  },
  created() {},
  mounted() {},
  methods: {
    focusWindow() {
      this.$emit( 'ctrl', { op: 'focusWindow', windowId: this.window.id });
    },
    editWindow() {
      this.editing = {
        title: this.window.title
      };
    },
    submitWindow() {
      this.$emit( 'ctrl', {
        op: 'editWindow',
        windowId: this.window.id,
        updates: this.editing
      });
      this.editing = null;
    },
    resetWindow() {
      this.editing = null;
    },
    closeWindow() {
      this.$emit( 'ctrl', { op: 'closeWindow', windowId: this.window.id });
    },
    selectWindow() {
      console.log( 'selecting window', this.window );
      state.setFocus( this.window );
    },
    pass(e) {
      this.$emit( 'ctrl', e );
    }
  },
  computed: {
    tabState() {
      const t = this.window.tabs;
      let last;
      let next;
      return this.window.tabs.map(( cr, i ) => {
        next = t[ i + 1 ];
        const opening = !last || last.closed;
        const closing = !next || next.closed;
        last = cr;
        return { opening, closing };
      });
    },
    classes() {
      return [{
          collapsed: this.window.collapsed,
          active: this.window.focused,
        },
        `state-${this.window.state}`,
        `type-${this.window.type}`,
      ];
    }
  }
}
</script>

<style lang="scss">
.tab-window {
  > .header {
    color: grey;
    font-weight: bold;
    padding: 4px;
    transition: 140ms;
    transition-timing-function: linear;
    height: 2em;
    overflow: hidden;
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
      justify-self: flex-end;
      clear: both;
    }
    .space {
      flex: 1;
    }
  }
  &.active > .header {
    color: lightskyblue;
    a, a:visited, a:active, a:hover {
      color: lightskyblue;
    }
  }
  > .body {
    padding-left:4px;
  }
  margin-top: 8px;
  /* border-top: 1px solid rgba(160,215,255,0.05); */
  &:first-child {
    margin-top: 0;
    border-top: 0 none;
  }
  &.active:hover, &:hover, &.selected {
    > .header {
      border-top-left-radius: 4px;
      border-bottom-left-radius: 4px;
      margin-bottom: 2px;
      background: lightskyblue;
      color: black;
      font-size: 120%;
      height: 3em;
      a, a:visited, a:active, a:hover {
        color: black;
      }
      * {
        color: black;
      }
    }
  }
  &.active > .header:hover, > .header:hover, > .header.editing,
  &.selected > .header {
    color: black;
    background: lightskyblue;
    height: 8em;
    a, a:visited, a:active, a:hover {
      color: black;
    }
    .ctrl-before {
      top: 0;
      height: 20px;
    }
    .ctrl-before,.ctrl-after {
      opacity: 1;
    }
  }
  &.selected >.header {
    height: 20em;
  }
}
</style>
