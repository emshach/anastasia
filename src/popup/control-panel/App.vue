<template lang="pug">
  #app
    k-header(
      :title='extName'
      :search='searchTerm'
      @menu='openSidebar'
      @search='search'
    )
    closed-tabs
    tab-project(
      v-for='pid in topProjectIds'
      :project-id='pid'
      :key='pid'
      :point='point'
      :search='searchRx'
      @hover='setPoint'
      @unhover='unsetPoint'
    )
    k-footer
    transition( name='fade' appear )
      .overlay( v-show='showOverlay' )
    k-sidebar( :open='sidebarOpen' @ctrl='send' @close='closeSidebar' )
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import KHeader from '@/components/blocks/k-header'
import KFooter from '@/components/blocks/k-footer'
import KSidebar from '@/components/blocks/k-sidebar'
import ClosedTabs from '@/components/closed-tabs'
import TabProject from '@/components/tab-project'
import state from '@/control-panel/state'

export default {
  name: 'App',
  mixins: [],
  components: { KHeader, ClosedTabs, TabProject, KFooter, KSidebar },
  props: {},
  data() {
    return {
      extName: browser.runtime.getManifest().name,
      // projects: {},
      // projectIds: [],
      // windows: {},
      // activeWindow: null,
      // tabs: {},
      // tags: {},
      // notes: {},
      // windowId: null,
      // control: null,
      // controlActive: false,
      // loading: true,
      searchTerm: false,
      point: '',
      unsettingPoint: null,
      sidebarOpen: false,
    }
  },
  created() {
    document.title = 'Control Panel'
    // this.tabs.ghost = {
    //   title: 'ghost'
    // }
    document.addEventListener( 'keyup', this.onKeyUp )
    this.init()
  },
  mounted() {},
  beforeDestroy() {
    this.destroy()
    document.RemoveEventListener( 'keyup', this.onKeyUp )
  },
  methods: {
    ...mapActions([ 'init', 'send', 'destroy' ]),
    log() {
      console.log( this )
    },
    setPoint( $event ) {
      this.point = $event
    },
    unsetPoint( $event ) {
      if ( this.point !== $event ) return
      if ( this.unsettingPoint )
        clearTimeout( this.unsettingPoint )
      this.unsettingPoint = setTimeout(() => {
        if ( this.point === $event )
          this.point = ''
      }, 3000 )
    },
    openSidebar() {
      this.sidebarOpen = true
    },
    closeSidebar() {
      this.sidebarOpen = false
    },
    search( $event ) {
      this.searchTerm = $event
    },
    // async onLoad({ state }) {
    //   this.loading = false
    //   // console.log( 'got state', state )
    //   Object.assign( this, state )
    // },
    // setWindowId({ windowId }) {
    //   this.windowId = windowId
    // },
    // onKeyUp( $event  ) {
    //   // console.log( 'onKeyUp', $event )
    //   if ( $event.key === 'Escape' ) {
    //     if ( this.sidebarOpen )
    //       this.sidebarOpen = false
    //     else if ( this.searchTerm !== false )
    //       this.searchTerm = false
    //   }
    // },
    // onAddProject({ project, pos }) {
    //   if ( this.projects[ project.id ])
    //     return
    //   this.$set( this.projects, project.id, project )
    //   if ( pos < 0 )
    //     this.projectIds.push( project.id )
    //   else
    //     this.projectIds.splice( pos, 0, project.id )
    // },
    // onRemoveProject({ projectId }) {
    //   this.$delete( this.projects, projectId )
    //   this.projectList.splice( this.projectList.indexOf( projectId ), 1 )
    // },
    // onMoveProject({ projectId, pos }) {
    //   this.projectIds.splice( this.projectIds.indexOf( projectId ))
    //   this.projectIds.splice( pos + 1, 0, this.projectIds )
    // },
    // onSuspendProject({ projectId }) {
    //   this.projects[ projectId ].closed = true
    // },
    // onResumeProject({ projectId }) {
    //   this.projects[ projectId ].closed = false
    // },
    // onAddWindow({ win, tabs, pos }) {
    //   const p = this.projects[ win.pid ]
    //   for ( const tab of tabs )
    //     this.$set( this.tabs, tab.id, tab )
    //   this.$set( this.windows, win.id, win )
    //   p.windowIds.splice( pos, 0, win.id )
    // },
    // onRemoveWindow({ windowId }) {
    //   const w = this.windows[ windowId ]
    //   const p = this.projects[ w.pid ]
    //   this.$delete( this.windows, windowId )
    //   p.windowIds.splice( p.windowIds.indexOf( windowId ), 1 )
    // },
    // onSuspendWindow({ windowId }) {
    //   this.windows[ windowId ].closed = true
    //   this.onBlurWindow({ windowId })
    // },
    // onResumeWindow({ windowId }) {
    //   this.windows[ windowId ].closed = false
    // },
    // onFocusWindow({ windowId }) {
    //   let w = this.windows[ this.activeWindow ]
    //   if (w) w.focused = false
    //   w = this.windows[ windowId ]
    //   w.focused = true
    //   this.activeWindow = windowId
    // },
    // onBlurWindow({ windowId }) {
    //   const w = this.windows[ windowId ]
    //   w.focused = false
    //   this.activeWindow = null
    // },
    // onSetWindowCollapse({ windowId, collapse }) {
    //   this.windows[ windowId ].collapse = collapse
    // },
    // onUpdateWindow({ windowId, changes, win }) {
    //   Object.assign( this.windows[ windowId ], win || changes )
    // },
    // onAddIcon({ icon }) {
    //   this.$set( this.icons, icon.id, icon )
    // },
    // onUpdateTab({ tabId, changes, tab }) {
    //   Object.assign( this.tabs[ tabId ], tab || changes )
    //   if ( tab.iconid && !tab.icon) {
    //     tab.icon = this.icons[ tab.iconid ]
    //   }
    // },
    // onSuspendTab({ tabId }) {
    //   this.tabs[ tabId ].closed = true
    // },
    // onResumeTab({ tabId }) {
    //   this.tabs[ tabId ].closed = false
    // },
    // onAddTab({ tab, pos }) {
    //   const w = this.windows[ tab.wid ]
    //   this.$set( this.tabs, tab.id, tab )
    //   const x = w.tabIds.slice()
    //   if ( pos < 0 )
    //     x.push( tab.id )
    //   else
    //     x.splice( pos, 0, tab.id )
    //   w.tabIds = x
    //   if ( tab.active )
    //     this.onFocusTab({ tabId: tab.id, windowId: w.id })
    // },
    // onRemoveTab({ tabId }) {
    //   const t = this.tabs[ tabId ]
    //   const w = this.windows[ t.wid ]
    //   this.$delete( this.tabs, tabId )
    //   w.tabIds.splice( w.tabIds.indexOf( tabId ), 1 )
    // },
    // onFocusTab({ tabId, windowId }) {
    //   let w = this.windows[ this.activeWindow ]
    //   if (w) w.active = false
    //   w = this.windows[ windowId ]
    //   w.active = true
    //   this.activeWindow = windowId
    //   w.tabIds.forEach( t => { this.tabs[t].active = false })
    //   this.tabs[ tabId ].active = true
    // },
    // onFocusControl() {
    //   this.controlActive = true
    //   // $( 'html' ).classList.add( 'active' )
    // },
    // onBlurControl() {
    //   this.controlActive = false
    //   // $( 'html' ).classList.remove( 'active' )
    // },
    // toFullProject(p) {
    //   const prj = this.projects[p]
    //   if ( !prj ) return
    //   return Object.assign( {}, prj, {
    //     parent: null,
    //     windows: prj.windowIds.map( this.toFullWindow ),
    //     projects: prj.projectIds.map( this.toFullProject ),
    //     // TODO: notes etc
    //   })
    // },
    // toFullWindow(w) {
    //   const win = this.windows[w]
    //   return Object.assign( {}, win, {
    //     parent: null,
    //     tabs: win.tabIds.map( this.toFullTab ),
    //   })
    // },
    // toFullTab(t) {
    //   const tab = this.tabs[t]
    //   return Object.assign( {}, tab, {
    //     parent: null,
    //     icon: tab.icon || this.icons[ tab.iconid ],
    //   })
    // },
    // send( msg ) {
    //   if ( this.port )
    //     this.port.postMessage( msg )
    // },
    // selectPrev() {
    //   let focus = null
    //   if ( state.focus ) {
    //     const id = state.focus.id
    //     const parent = state.focus[ id.includes( 'tab' ) ? 'wid' : 'pid' ]
    //     const set = parent[ id.includes( 'tab' ) ? 'tabIds' : 'windowIds' ]
    //     if ( parent ) {
    //       const idx = set.indexOf( id )
    //       if ( idx ) {
    //       } else {
    //       }
    //     }
    //   } else {
    //     const p = this.projects[ this.projectIds[ this.projectIds.length - 1 ]]
    //     const w = this.windows[ p.windowIds[ p.windowIds.length - 1 ]]
    //     if ( w.tabIds.length ) {
    //       focus = this.tabs[ w.tabIds[ w.tabIds.length - 1 ]]
    //     } else
    //       focus = w
    //   }
    //   state.setFocus( focus )
    // },
    // selectNext() {
    //   let focus = null
    //   if ( state.focus ) {

    //   } else {
    //     const p = this.projects[ this.projectIds[0]]
    //     const w = this.windows[ p.windowIds[0]]
    //     if ( w.tabIds.length ) {
    //       focus = this.tabs[ w.tabIds[0]]
    //     } else
    //       focus = w
    //   }
    //   state.setFocus( focus )
    // },
  },
  computed: {
    ...mapGetters([ 'topProjectIds' ]),
    searchRx() {
      if ( !this.searchTerm ) return ''
      return new RegExp( this.searchTerm.split( /\s+/g ).join( '.*?' ), 'i' )
    },
    showOverlay() {
      return this.sidebarOpen
    }
  }
}
</script>
<style lang="scss">
body, html {
  overflow-x:  hidden;
}
#app {
  position: relative;
  overflow-x: hidden;
  padding-top: 4em;
  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    height: 100vh;
    width: 100vw;
    transition: opacity 400ms;    background: rgba(0,0,0,0.85);
  }
}
</style>
