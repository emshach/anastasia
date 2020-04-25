<template>
  <div id="app">
    <tab-project v-for="p in topProjects" :project=p :key=p.id @ctrl=send />
  </div>
</template>

<script>
import TabProject from '@/components/TabProject'
import state from '@/control-panel/state'

export default {
  name: 'App',
  mixins: [],
  components: { TabProject },
  props: {},
  data() {
    return {
      projects: {},
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
      port: null,
    };
  },
  created() {
    document.title = 'TabControl Panel';
    const b = browser;
    const port = b.runtime.connect({ name: 'tabcontrol-control-panel' });
    this.port = port;
    port.onMessage.addListener( m => {
      console.log( 'background => control-panel', m );
      const e = `on${m.op}`;
      if ( this[e] ) this[e](m);
      else console.warn( `'${ m.op }' not yet implemented` );
    });
    this.tabs.ghost = {
      title: 'ghost'
    };

    document.addEventListener( 'keyup', e => {
      console.log( 'onKeyUp', e );
    });
  },
  mounted() {},
  methods: {
    async onLoad({ state }) {
      this.loading = false;
      // console.log( 'got state', state );
      Object.assign( this, state );
    },
    setWindowId({ windowId }) {
      this.windowId = windowId;
    },
    onAddProject({ project, pos }) {
      if ( this.projects[ project.id ])
        return;
      this.$set( this.projects, project.id, project );
      if ( pos < 0 )
        this.projectIds.push( project.id );
      else
        this.projectIds.splice( pos, 0, project.id );
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
      this.projects[ projectId ].closed = true;
    },
    onResumeProject({ projectId }) {
      this.projects[ projectId ].closed = false;
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
    onUpdateWindow({ windowId, changes, win }) {
      Object.assign( this.windows[ windowId ], win || changes );
    },
    onUpdateTab({ tabId, changes, tab }) {
      Object.assign( this.tabs[ tabId ], tab || changes );
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
      const x = w.tabIds.slice();
      if ( pos < 0 )
        x.push( tab.id );
      else
        x.splice( pos, 0, tab.id );
      w.tabIds = x;
      if ( tab.active )
        this.onFocusTab({ tabId: tab.id, windowId: w.id });
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
      w.tabIds.forEach( t => { this.tabs[t].active = false });
      this.tabs[ tabId ].active = true;
    },
    onFocusControl() {
      this.controlActive = true;
      // $( 'html' ).classList.add( 'active' );
    },
    onBlurControl() {
      this.controlActive = false;
      // $( 'html' ).classList.remove( 'active' );
    },
    toFullProject(p) {
      const prj = this.projects[p];
      return Object.assign( {}, prj, {
        parent: null,
        windows: prj.windowIds.map( this.toFullWindow.bind(this )),
        projects: prj.projectIds.map( this.toFullProject.bind( this )),
        // TODO: notes etc
      });
    },
    toFullWindow(w) {
      const win = this.windows[w];
      return Object.assign( {}, win, {
        parent: null,
        tabs: win.tabIds.map( this.toFullTab.bind( this )),
      });
    },
    toFullTab(t) {
      const tab = this.tabs[t];
      return Object.assign( {}, tab, {
        parent: null,
      });
    },
    send( msg ) {
      if ( this.port )
        this.port.postMessage( msg );
    },
    selectPrev() {
      let focus = null;
      if ( state.focus ) {
        let id = state.focus.id;
        let parent = state.focus[ id.includes( 'tab' ) ? 'wid' : 'pid' ];
        let set = parent[ id.includes( 'tab' ) ? 'tabIds' : 'windowIds' ];
        if ( parent ) {
          let idx = set.indexOf( id );
          if ( idx ) {
            
          } else {
          }
        }
      } else {
        const p = this.projects[ this.projectIds[ this.projectIds.length - 1 ]];
        const w = this.windows[ p.windowIds[ p.windowIds.length - 1 ]];
        if ( w.tabIds.length ) {
          focus = this.tabs[ w.tabIds[ w.tabIds.length - 1 ]];
        } else
          focus = w;
      }
      state.setFocus( focus );
    },
    selectNext() {
      let focus = null;
      if ( state.focus ) {

      } else {
        const p = this.projects[ this.projectIds[0]];
        const w = this.windows[ p.windowIds[0]];
        if ( w.tabIds.length ) {
          focus = this.tabs[ w.tabIds[0]];
        } else
          focus = w;
      }
      state.setFocus( focus );
    },
  },
  computed: {
    topProjects() {
      return this.projectIds.map( this.toFullProject.bind( this ));
    }
  }
}
</script>
<style>
#app {
  overflow-x: hidden;
}
</style>
