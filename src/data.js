import { Project, Window, Tab } from '@/models'
import state from '@/state'

export default {
  panelId: null,
  panelTab: null,
  promptId: null,
  promptOpening: false,
  connected: false,
  port: null,
  prompt: null,
  openWindows: {},
  openTabs: {},
  sendUpdates: false,
  controlIds: {},
  controlTabIds: {},
  recentlyClosed: [],
  loaded: false,
  controlPanel: null,
  expecting: {
    tab: {},
    window: {},
  },
  state,
  toJson: state.toJson.bind( state ),
  async getData( keys ) {
    return browser.storage.local.get( keys )
  },
  async setData( data ) {
    return browser.storage.local.set( data );
  },
  async clearData( keys ) {
    return browser.storage.local.remove( keys )
  },
  async loadFromStorage() {
    let {
      controlPanelOpen,
      controlActive,
      activeWindow,
      projectIds,
      windowIds,
      tabIds,
      // tagIds: [],
      // noteIds: [],
    } = await this.getData([
      'controlPanelOpen',
      'controlActive',
      'activeWindow',
      'projectIds',
      'windowIds',
      'tabIds',
    ]);
    if ( controlPanelOpen !== true && controlPanelOpen !== false )
      controlPanelOpen = false;
    if ( controlActive !== true && controlActive !== false )
      controlActive = false;
    if ( !projectIds )
      projectIds = this.state.projectIds || [];
    if ( !windowIds )
      windowIds = this.state.windowIds || [];
    if ( !tabIds )
      tabIds = this.state.tabIds || [];
    if ( !activeWindow )
      activeWindow = this.state.activeWindow || null;
    if ( !projectIds.length ) {
      projectIds = [ 'project-0' ];
      await this.setData({
        'project-0': {
          id: 'project-0',
          name: 'misc',
          windowIds: [],
          projectIds: [],
        },
        projectIds,
      });
    }
    const loaded   = true;
    const [ projects, windows, tabs ] = await Promise.all([
      projectIds ? await this.getData( projectIds ) : {},
      windowIds  ? await this.getData( windowIds )  : {},
      tabIds     ? await this.getData( tabIds )     : {},
    ]);

    console.log( 'loading', { projects, windows, tabs });
    projectIds = projectIds.filter( p => {
      const prj = projects[p];
      if ( prj )
        new Project().load( projects[p], true );
      return !!projects[p];
    });

    windowIds = windowIds.filter( w => {
      const win = windows[w]
      if ( win ) {
        const win = new Window().load( windows[w], true );
        if ( !win.pid ) {
          state.projects[ 'project-0' ].addWindow( win );
          this.save( win );
        }
      }
      return !!win;
    });

    const liveTabIds = {};
    for ( const wid of windowIds ) {
      const w = state.windows[ wid ];
      for ( const t of w.tabIds )
        liveTabIds[ t ] = tabs[t];
    }
    for ( const t of Object.keys( tabs )) {
      if ( liveTabIds[t] )
        tabs[t] = new Tab().load( tabs[t] );
      else
        delete tabs[t];
    }

    Object.assign( this, {
      loaded,
      controlPanelOpen,
    });
    Object.assign( this.state, {
      controlActive,
      activeWindow,
    });
    // garbage collection
    const garbage = [];
    for ( const i of Array( Project.autoId.value ).keys()) {
      const id = `project-${ i + 1 }`;
      if ( !projects[ id ])
        garbage.push( id );
    }
    for ( const i of Array( Window.autoId.value ).keys()) {
      const id = `window-${ i + 1 }`;
      if ( !windows[ id ])
        garbage.push( id );
    }
    for ( const i of Array( Tab.autoId.value ).keys()) {
      const id = `tab-${ i + 1 }`;
      if ( !tabs[ id ])
        garbage.push( id );
    }
    // console.log( 'dumping garbage', garbage );
    this.clearData( garbage );
  },
  getTabWindow( tab ) {
    const wid = tab.wid,
          tid = tab.id;
    let w, tix;
    if ( wid )
      w = this.state.windows[ wid ];
    if (w) {
      tix = w.tabIds.indexOf( tid );
      return { w, tix };
    } else {
      w = Object.values( this.state.windows ).find( win => {
        if ( !win.tabs )
          return false;
        tix = win.tabIds.indexOf( tid );
        if ( tix < 0 )
          return false;
        return true;
      });
      return { w, tix };
    }
  },
  async setControlTab( tabId ) {
    this.controlTabIds[ tabId ] = true;
    // const tab = await this.getTab( tabId );
    // tab.isControl = true;
    // this.save( tab );
    // if ( this.controlPanel )
    //   this.controlPanel.post({
    //     op: 'UpdateTab',
    //     tabId: tab.id,
    //     changes: { isControl: true },
    //     tab
    //   });
  },
  getTab( tabId ) {
    if ( this.openTabs[ tabId ])
      return this.openTabs[ tabId ];
    if ( this.expecting.tab[ tabId ])
      return this.expecting.tab[ tabId ];
    return new Promise(( resolve, reject ) => {
      this.expecting.tab[ tabId ] = resolve;
    }).then( tab => {
      delete this.expecing.tab[ tabId ];
      return tab;
    });
  },
  save( thing ) {
    const updates = this.state.flush();
    let data = null;
    if ( thing ) {
      data = thing.toJson();
      updates[ thing.id ] = data;
    }
    this.setData( updates );
    return data;
  },
  saveAll( things ) {
    // console.log( 'saving', things );
    const updates = this.state.flush();
    const data = {}
    for ( const thing of things ) {
      data[ thing.id ] =
         updates[ thing.id ] =
         thing.toJson ? thing.toJson() : thing;
    }
    console.log( 'writing:', updates );
    this.setData( updates );
    return data;
  },
  addProject( prj ) {
    const p = Project.normalize( prj );
    if ( p.pid ) {
      const pp = this.state.projects[ p.pid ];
      if ( pp && pp.projectIds.indexOf( p.id ) < 0 ) {
        pp.projectIds.push( p.id );
        this.save( pp );
      }
    }
    if (! this.state.projects[ p.id ])
      this.state.projectIds.push( p.id );
    this.state.projects[ p.id ] = p;
    return p;
  },
  removeProject( prjId ) {
    const pix = this.state.projectIds.indexOf( prjId );
    if ( pix > -1 ) {
      this.state.projectIds.splice( pix, 1 );
        delete this.state.projects[ prjId ];
      this.clearData([ prjId ]);
    }
  },
  async addWindow( win ) {
    win = await Window.normalize( win );
    if ( win.windowId )
      this.openWindows[ win.windowId ] = win;
    this.save();
    // FIXME: make this connection happen in the model, separate store and state
    return win;
  },
  removeWindow( win ) {
    this.clearData(( win.tabIds.map( tid => {
      this.state.remove( this.state.tabs[ tid ]);
      return tid;
    }).concat( win.id )));
    delete this.openWindows[ win.windowId ];
    this.state.remove( win );
    return win;
  },
  addTab( tab, win, pos ) {
    tab = Tab.normalize( tab );
    if ( win ) {
      win.addTab( tab, pos )
    }
    if ( tab.tabId )
      this.openTabs[ tab.tabId ] = tab;
    this.save( tab );
    return tab;
  },
  removeTab( tab ) {
    if ( this.openTabs[ tab.tabId ]) {
      delete this.openTabs[ tab.tabId ];
      browser.tabs.remove( tab.tabId );
      if ( tab.window )
        tab.window.removeTab( tab );
    }
    this.clearData( tab.id );
    this.state.remove( tab );
    this.save();
    return tab;
  },
  autoRemoveTab( tab ) {
   return /^about:/.test( tab.url )
       || this.controlIds[ tab.windowId ] ? 'remove' : 'ask'
  }
  // TODO: more, user-customizable checks
}
