<template>
  <div id="app">
    <tab-project v-for="p in projects" :project=p :key=p.id />
  </div>
</template>

<script>
import TabProject from '@/components/TabProject'

export default {
  name: 'App',
  mixins: [],
  components: { TabProject },
  props: {},
  data() {
    return {
      allProjects: {},
      projectIds: [],
      windows: {},
      activeWindow: null,
      tabs: {},
      tags: {},
      notes: {},
      windowId: null,
      control: null,
      controlActive: false,
      loading: true,
    };
  },
  created() {
    document.title = 'TabControl Panel';
    const b = browser;
    const port = b.runtime.connect({ name: 'tab-control' });
    Promise.all([ b.windows.getCurrent(), b.tabs.getCurrent() ])
       .then(([ win, tab ]) => {
         this.setWindowId( win.id );
         this.control = port;
         port.postMessage({
           op: 'registerPanel', windowId: win.id, tabId: tab.id });
         });
    port.onMessage.addListener( m => {
      // console.log( 'control => panel', m );
      const e = `on${m.op}`;
      if ( this[e] ) this[e](m);
      else console.warn( `'${ m.op }' not yet implemented` );
    });
  },
  mounted() {},
  methods: {
    async onLoad({ state }) {
      this.loading = false;
      console.log( 'got state', state );
      Object.assign( this, state );
    },
    setWindowId({ windowId }) {
      this.windowId = windowId;
    },
    onAddProject({ prj, pos }) {
      this.$set( this.projects, prj.id, prj );
      this.projectIds.splice( pos, 0, prj.id );
    },
    onRemoveProject({ projectId }) {
      this.$delete( this.projects, projectId );
      this.projectList.splice( this.projectList.indexOf( projectId ), 1 );
    },
    onMoveProject({ projectId, pos }) {
      this.projectIds.splice( this.projectIds.indexOf( projectId ));
      this.projectIds.splice( pos + 1, 0, this.projectIds );
    },
    onSuspendProject({ projectId }) {
      this.allProjects[ projectId ].closed = true;
    },
    onResumeProject({ projectId }) {
      this.allProjects[ projectId ].closed = false;
    },
    onAddWindow({ win, tabs, pos }) {
      const p = this.projects[ win.pid ];
      for ( const tab of tabs )
        this.$set( this.tabs, tab.id, tab );
      this.$set( this.windows, win.id, win );
      p.windowIds.splice( pos, 0, win.id )
    },
    onRemoveWindow({ windowId }) {
      const w = this.windows[ windowId ];
      const p = this.projects[ w.pid ];
      this.$delete( p.windows, windowId );
      this.$delete( this.windows, windowId );
      p.windowIds.splice( p.windowIds.indexOf( windowId ), 1 );
    },
    onSuspendWindow({ windowId }) {
      this.windows[ windowId ].closed = true;
    },
    onResumeWindow({ windowId }) {
      this.windows[ windowId ].closed = false;
    },
    onFocusWindow({ windowId }) {
      let w = this.windows[ this.activeWindow ];
      if (w) w.active = false;
      w = this.windows[ windowId ];
      w.active = true;
      this.activeWindow = windowId;
    },
    onSetWindowCollapse({ windowId, collapse }) {
      this.windows[ windowId ].collapse = collapse;
    },
    onUpdateTab({ tabId, changes, tab }) {
      Object.assign( this.tabs[ tabId ], tab );
    },
    onSuspendTab({ tabId }) {
      this.tabs[ tabId ].closed = true;
    },
    onResumeTab({ tabId }) {
      this.tabs[ tabId ].closed = false;
    },
    onAddTab({ tab, pos }) {
      const w = this.windows[ tab.wid ];
      this.$set( this.tabs, tab.id, tab );
      w.tabIds.splice( pos, 0, tab.id )
    },
    onRemoveTab({ tabId }) {
      const t = this.tabs[ tabId ];
      const w = this.windows[ t.wid ];
      this.$delete( this.tabs, tabId );
      w.tabIds.splice( w.tabIds.indexOf( tabId ), 1 );
    },
    onFocusTab({ tabId, windowId }) {
      let w = this.windows[ this.activeWindow ];
      if (w) w.active = false;
      w = this.windows[ windowId ];
      w.active = true;
      this.activeWindow = windowId;
    },
    onFocusControl() {
      this.controlActive = true;
      // $( 'html' ).classList.add( 'active' );
    },
    onBlurControl() {
      this.controlActive = false;
      // $( 'html' ).classList.remove( 'active' );
    },
  },
  computed: {
    projects() {
      return this.projectIds.map( x => Object.assign(
        {},
        this.allProjects[x],
        { windows: this.allProjects[x].windowIds.map( w => Object.assign(
          {},
          this.windows[w],
          { tabs: this.windows[w].tabIds.map( t => this.tabs[t] )}))
          // TODO: notes etc
        }
      ));
    }
  }
}
</script>

<style>
</style>
