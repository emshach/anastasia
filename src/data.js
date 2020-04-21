import { Project, Window, Tab } from '@/models'

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
  projectIds: [],
  windowIds: [],
  tabIds: [],
  // tagIds: [],
  // noteIds: [],
  controlPanel: null,
  expecting: {
    tab: {},
    window: {},
  },
  state: {
    controlActive: false,
    projects: {},
    projectIds: [],
    activeWindow: null,
    windows: {},
    tabs: {},
    tags: {},
    notes: {}
  },
  toJson() {
    const out = {
      controlActive: this.controlActive,
      projects: {},
      projectIds: this.projectIds,
      activeWindow: this.activeWindow,
      windows: {},
      tabs: {},
      tags: {},
      notes: {}
    }
    for ( const p of Object.values( this.state.projects ))
      out.projects[ p.id ] = p.toJson();
    for ( const w of Object.values( this.state.windows ))
      out.windows[ w.id ] = w.toJson();
    for ( const t of Object.values( this.state.tabs ))
      out.tabs[ t.id ] = t.toJson();
    return out;
  },
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
      // tagIds: [],
      // noteIds: [],
    } = await this.getData([
      'controlPanelOpen',
      'controlActive',
      'activeWindow',
      'projectIds',
      'windowIds',
    ]);
    if ( controlPanelOpen !== true && controlPanelOpen !== false )
      controlPanelOpen = false;
    if ( controlActive !== true && controlActive !== false )
      controlActive = false;
    if ( !projectIds )
      projectIds = this.state.projectIds || [];
    if ( !windowIds )
      windowIds = this.state.windowIds || [];
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
    const windows  = windowIds  ? await this.getData( windowIds )  : {};
    const projects = projectIds ? await this.getData( projectIds ) : {};

    windowIds = windowIds.filter( w => {
      const win = windows[w]
      if ( win ) {
        const win = new Window().load( windows[w]);
        windows[w] = win;
        if ( !win.pid ) {
          win.pid = 'project-0';
          projects[ 'project-0' ].windowIds.push(w);
          this.save( win );
        }
      }
      return !!win;
    });
    projectIds = projectIds.filter( p => {
      const prj = projects[p];
      if ( prj ) {
        const prj = new Project().load( projects[p] );
        projects[p] = prj;
      }
      return !!projects[p];
    });

    const tabIds = ( windowIds || [] ).reduce(
      ( x, y ) => x.concat(( windows[y].tabIds || [] ).filter( t => t ) ), [] );

    // console.log({ windows, windowIds, tabIds });
    const tabs = await this.getData( tabIds );
    for ( const t of Object.keys( tabs ))
      if ( tabs[t] )
        tabs[t] = new Tab().load( tabs[t] );
    Object.assign( this, {
      loaded,
      projectIds,
      windowIds,
      tabIds,
      // tagIds,
      // noteIds,
      controlPanelOpen,
    });
    Object.assign( this.state, {
      controlActive,
      projects,
      projectIds,
      activeWindow,
      windows,
      tabs,
      // tags,
      // notes,
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
    const data = thing.toJson();
    this.setData({[ thing.id ]: data });
    return data;
  },
  saveAll( things ) {
    // console.log( 'saving', things );
    const data = {};
    for ( const thing of things ) {
      data[ thing.id ] = thing.toJson();
    }
    this.setData( data );
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
    const save = [ win ];
    if ( !this.state.windows[ win.id ]) {
      this.state.windows[ win.id ] = win;
      this.windowIds.push( win.id );
      this.setData({ windowIds: this.windowIds }); // TODO: for now
    }
    if ( win.tabs ) {
      for ( const tab of Object.values( win.tabs )) {
        if ( !this.state.tabs[ tab.id ]) {
          this.state.tabs[ tab.id ] = tab;
          this.tabIds.push( tab.id );
          save.push( tab );
        }
      }
      delete win.tabs;
    }
    const p = this.state.projects[ win.pid ];
    if (p)
      save.push(p);
    this.saveAll( save );
    // FIXME: make this connection happen in the model, separate store and state
    return win;
  },
  removeindow( win ) {
    this.clearData(( win.tabIds.map( tid => {
      delete this.state.tabs[ tid ];
      return tid;
    }).concat( win.id )));
    delete this.openWindows[ win.windowId ];
    delete this.state.windows[ win.id ];
    return win;
  },
  addTab( tab, win, pos ) {
    tab = Tab.normalize( tab );
    if ( win ) {
      win.addTab( tab, pos )
    }
    this.state.tabs[ tab.id ] = tab;
    if ( tab.tabId )
      this.openTabs[ tab.tabId ] = tab;
    this.save( tab );
    return tab;
  },
  removeTab( tab ) {
    if ( this.openTabs[ tab.tabId ]) {
      delete this.openTabs[ tab.tabId ];
      browser.tabs.remove( tab.tabId );
      if ( tab.win )
        tab.win.removeTab( tab );
    }
    this.clearData( tab.id );
    delete this.state.tabs[ tab.id ];
    return tab;
  },
  autoRemoveTab( tab ) {
   return /^about:/.test( tab.url )
       || this.controlIds[ tab.windowId ] ? 'remove' : 'ask'
  }
  // TODO: more, user-customizable checks
}
