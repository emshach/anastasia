<template>
  <div class="window active">
    <div class="prompt"> Did you want to keep that tab?</div>
    <tab-item :tab=tab :focus=true >
      <template #ctrl-before ><div /></template>
      <template #ctrl-after ><div /></template>
    </tab-item>
    <div style="display:flex;">
      <button style="flex:1;" ref="yes" type="button"
              @click.prevent=keepTab >Yes</button>
      <button style="flex:1;" ref="no" type="button"
              @click.prevent=discardTab >No</button>
    </div>
  </div>
</template>

<script>
import TabItem from '@/components/tab-item'
const tabs = [];
window.closeTabs = tabs;
export default {
  name: 'App',
  components: { TabItem },
  data() {
    return {
      port: null,
      tabs,
    };
  },
  mounted() {
    const b = browser;
    this.port = b.runtime.connect({ name: 'tabcontrol-close-prompt' });
    this.port.onMessage.addListener( m => {
      console.log( 'background => close-prompt', m );
      const e = `on${m.op}`;
      if ( this[e] ) this[e](m);
      else console.warn( `'${ m.op }' not yet implemented` );
    });

    document.addEventListener( 'keyup', e => {
      // console.log( 'onKeyUp', e );
      if ( e.key === 'y' || e.key === 'Y' ) {
        this.keepTab();
      } else if ( e.key === 'n' || e.key === 'N' ) {
        this.discardTab();
      }
    });
  },
  methods:{
    onLoad({ tabs }) {
      this.tabs = tabs;
      console.log( 'tabs', this.tabs );
    },
    onAdd({ tab }) {
      this.tabs.unshift( tab );
      console.log( 'tabs', this.tabs );
    },
    keepTab() {
      console.log( 'keepTab!', this.port );
      this.popTab();
    },
    discardTab() {
      console.log( 'discardTab!', this.port );
      this.port.postMessage({ op: 'removeTab', tabId: this.tab.id })
      this.popTab();
    },
    popTab() {
      console.log( 'popTab!', this.port );
      this.tabs.shift();
      if ( !this.tabs.length ) {
        this.port.postMessage({ op: 'done' })
      }
    }
  },
  computed: {
    tab() {
      return this.tabs[0] || {};
    }
  }
}
</script>

<style>
html, body, .window {
  height: 100%;
  padding: 0;
  font-size: larger;
}
body, .window {
  display: flex;
  flex-direction: column;
}
.window, .tab-item {
  flex: 1;
}
button {
  background: grey;
  color: white;
  border-radius: 0;
  border: 0 none;
  padding: 8px 16px;
  margin: 0;
  text-align: center;
}
button:hover, button:focus {
  background: #777;
}
#prompt {
  font-size: larger;
  padding: 0px 8px 0px;
}
.tab:last-child > div {
  margin-bottom: 0;
}
ul.tab-list {
  padding: 0;
}
.prompt {
  text-align: center;
  padding: 4px;
}
</style>
