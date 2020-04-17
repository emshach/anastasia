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
  recentlyClosed: [],
  lastWindowId: null,
  lastTabId: null,
  loaded: false,
  windowIds: [],
  tabIds: [],
  state: {
    controlActive: false,
    allProjects: {},
    projectIds: [],
    activeWindow: null,
    windows: {},
    tabs: {},
    tags: {},
    notes: {}
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
      lastWindowId,
      lastTabId,
      controlPanelOpen,
      controlActive,
      projectIds,
      activeWindow,
      windowIds,
      tags,
      notes,
    } = Object.assign({
      windowIds: [],
      lastWindowId: 0,
      lastTabId: 0,
    }, this.state, await this.getData([
      'projectIds',
      'windowIds',
      'lastWindowId',
      'lastTabId',
      'controlPanelOpen',
      'controlActive',
    ]));
    if ( !projectIds.length ) {
      projectIds = [ 'project-0' ];
      await this.setData({
        'project-0': {
          id: 'project-0',
          name: 'misc',
          windowIds: []
        },
        projectIds,
      });
    }
    const loaded = true;
    const windows     = windowIds  ? await this.getData( windowIds )  : {};
    const allProjects = projectIds ? await this.getData( projectIds ) : {};

    windowIds = windowIds.filter( w => {
      const win = windows[w];
      if ( win && !win.pid ) {
        win.pid = 'project-0';
        allProjects[ 'project-0' ].windowIds.push(w);
      }
      return !!win;
    });
    projectIds = projectIds.filter( p => !!allProjects[p] );

    const tabIds = ( windowIds || [] ).reduce(
      ( x, y ) => x.concat(( windows[y].tabIds || [] ).filter( t => t ) ), [] );

    // console.log({ windows, windowIds, tabIds });
    const tabs = await this.getData( tabIds );
    Object.assign( this, {
      lastWindowId,
      lastTabId,
      loaded,
      windowIds,
      tabIds,
      controlPanelOpen,
    });
    Object.assign( this.state, {
      controlActive,
      allProjects,
      projectIds,
      activeWindow,
      windows,
      tabs,
      tags,
      notes,
    });
    if ( !lastWindowId || !lastTabId )
      this.setData({
        lastWindowId: lastWindowId || 0,
        lastTabId: lastTabId || 0,
      });
    // garbage collection
    const garbage = [];
    for ( const i of Array( lastWindowId ).keys()) {
      const id = `window-${ i + 1 }`;
      if ( !windows[ id ])
        garbage.push( id );
    }
    for ( const i of Array( lastTabId ).keys()) {
      const id = `tab-${ i + 1 }`;
      if ( !tabs[ id ])
        garbage.push( id );
    }
    // console.log( 'dumping garbage', garbage );
    this.clearData( garbage );
  }
}
