<template lang="html">
  <div :class=classes @click=selectWindow >
    <div :class="['header', editing ? 'editing' : '']">
      <transition name="fade" mode="out-in">
        <div v-if="editing" class="inner" key="edit">
          <form @submit.prevent=submitWindow @reset.prevent=resetWindow>
            <input v-model=editing.title />
            <div class="space" />
            <div class="ctrl-after">
              <a href="#" class="btn edit-btn" @click.stop.prevent=resetWindow
                 title="submit">
                <img src="icons/check.svg" />
              </a>
              <a href="#" class="btn edit-btn" @click.stop.prevent=submitWindow
                 title="reset">
                <img src="icons/ff-close.svg" />
              </a>
            </div>
          </form>
        </div>
        <div v-else class="inner" key="normal">
          <slot name="ctrl-before">
            <div class="ctrl-before">
              <slot name="ctrl-before-prepend" />
              <a href="#" class="btn close-btn" @click.stop.prevent=closeWindow>
                <img src="icons/ff-close.svg" />
              </a>
              <slot name="ctrl-before-append" />
            </div>
          </slot>
          <div class="title">
            <slot name="title">
              <a href="#" @click.stop.prevent=focusWindow >{{ window.title }}</a>
            </slot>
          </div>
          <div class="space" />
          <slot name="ctrl-after">
            <div class="ctrl-after">
              <slot name="ctrl-after-prepend" />
              <a href="#" class="btn edit-btn" @click.stop.prevent=editWindow
                 title="edit">
                <img src="icons/edit.svg" />
              </a>
              <slot name="ctrl-after-append" />
            </div>
          </slot>
        </div>
      </transition>
    </div>
    <div class="body">
      <transition-group name="list" tag="div" class="tablist">
        <tab-item v-for="( t, i ) in window.tabs" :tab=t :key=t.id
                  :opening="tabState[i].opening"
                  :closing="tabState[i].closing"
                  class="tabitem-test"
                  @ctrl=pass />
      </transition-group>
    </div>
    <div class="footer">
  </div>
    </div>
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
          'tab-window': true,
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
