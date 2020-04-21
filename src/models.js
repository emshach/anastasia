import { urlsToRegexp } from '@/util'
import state from '@/state'

const idx = {}

export const cache = {}

export class AutoId {
  constructor( name ) {
    this.name = name;
    this.key = `auto-id-${ name }`;
    browser.storage.local.get([ this.key ]).then( data => {
        idx[ name ] = data[ this.key ] || 0;
    });
  }

  next() {
    const i = ++idx[ this.name ];
    browser.storage.local.set({[ this.key ]: i });
    return `${ this.name }-${i}`;
  }

  get value() {
    return idx[ this.name ];
  }
}

export const ProjectId = new AutoId( 'project' );
export const WindowId = new AutoId( 'window' );
export const TabId = new AutoId( 'tab' );

export class Model {
  constructor() {
    Object.assign( this, {
      model_name: null,
      fields: [],
      default: {},
    });
  }

  load( obj, init ) {
    Object.assign( this, this.default, obj )
    if ( !this.id )
      this.id = this.autoId.next()
    state.add( this, init );
    return this;
  }

  async get( store, id ) {
    const data = ( await store.getData([ id ]) || {})[ id ];
    if ( !data ) {
      // TODO: error
    } else {
      this.load( data );
    }
    return this;
  }

  get autoId() {
    if ( !this._autoId )
      this._autoId = new AutoId( this.model_name  )
      return this._autoId;
  }
}
Object.assign( Model, {
  model_name: null,
  fields: [],
  default: {},
  autoId: { next() { return null }}
});

export class Project extends Model {
  constructor() {
    super();
    Object.assign( this, {
      model_name: 'project',
      fields: [ 'name', 'projectIds', 'windowIds' ],
      default: {
        name: 'misc',
        pid: null,
        projectIds: [],
        windowIds: [],
        // noteId: []
      }
    });
  }

  get projectList() {
    return this.projectIds.map( p => state.projects[p] );
  }

  get windowList() {
    return this.windowIds.map( p => state.windows[p] );
  }

  get children() {
    return this.projectList.concat( this.windowList );
  }

  get project() {
    return state.projects[ this.pid ];
  }

  get parent() {
    return this.project;
  }

  addProject( project, pos ) {
    if ( project.id === this.id ) {
      console.warn( 'trying to add project to itself! NO!' );
      return;
    }
    const idx = this.projectIds.indexOf( project.id );
    if ( pos > -1) {
      if ( idx > -1 ) {
        if ( idx !== pos ) {
          this.projectIds.splice( idx, 1 );
          if ( idx < pos )
            --pos;
          this.projectIds.splice( pos, 0, project.id );
          state.queueModel( this );
        }
      } else {
        this.projectIds.splice( pos, 0, project.id );
        state.queueModel( this );
      }
    } else if ( idx < 0 ) {
      this.projectIds.push( project.id );
      state.queueModel( this );
    }
    if ( project.pid !== this.id ) {
      if ( project.pid ) {
        project.project.removeProject( project );
      }
      project.pid = this.id;
      state.queueModel( project );
    }
  }

  removeProject( project ) {
    this.projectIds.splice( this.projectIds.indexOf( project.id ), 1 );
    project.pid = null;
    state.queueModel( this );
    state.queueModel( project );
  }

  addWindow( window, pos ) {
    const idx = this.windowIds.indexOf( window.id );
    if ( pos > -1) {
      if ( idx > -1 ) {
        if ( idx !== pos ) {
          this.windowIds.splice( idx, 1 );
          if ( idx < pos )
            --pos;
          this.windowIds.splice( pos, 0, window.id );
          state.queueModel( this );
        }
      } else {
        this.windowIds.splice( pos, 0, window.id );
        state.queueModel( this );
      }
    } else if ( idx < 0 ) {
      this.windowIds.push( window.id );
      state.queueModel( this );
    }
    if ( window.pid !== this.id ) {
      if ( window.pid )
        window.project.removeWindow( window );
      window.pid = this.id;
      state.queueModel( window );
    }
  }

  removeWindow( window ) {
    this.windowIds.splice( this.windowIds.indexOf( window.id ), 1 );
    window.pid = null;
    state.queueModel( this );
    state.queueModel( window );
  }

  toJson() {
    return {
      id: this.id,
      name: this.name,
      projectIds: this.projectIds,
      windowIds: this.windowIds,
    }
  }
}
Object.assign( Project, {
  model_name: 'project',
  fields: [ 'name', 'projectIds', 'windowIds' ],
  autoId: ProjectId,
  default: {
    name: 'misc',
    projectIds: [],
    windowIds: [],
    // noteId: []
  },
  async normalize( prj ) {
    if ( prj instanceof Project )
      return prj;
    return new Project().load( prj )
  }
});

export class Window extends Model {
  constructor() {
    super();
    Object.assign( this, {
      model_name: 'window',
      window_type: 'normal',
      default: {
        windowId: null,
        pid: 'project-0',
        collapsed: true,
        title: 'Window',
        focused: false,
      },
    });
  }

  get tabList() {
    return this.tabIds.map( t => state.tabs[t] );
  }

  get children() { return this.tabList; }

  get project() {
    return state.projects[ this.pid ];
  }

  get parent() {
    return this.project;
  }

  addTab( tab, pos ) {
    const idx = this.tabIds.indexOf( tab.id );
    if ( pos > -1) {
      if ( idx > -1 ) {
        if ( idx !== pos ) {
          this.tabIds.splice( idx, 1 );
          if ( idx < pos )
            --pos;
          this.tabIds.splice( pos, 0, tab.id );
          state.queueModel( this );
        }
      } else {
        this.tabIds.splice( pos, 0, tab.id );
        state.queueModel( this );
      }
    } else if ( idx < 0 ) {
      this.tabIds.push( tab.id );
      state.queueModel( this );
    }
    if ( tab.wid !== this.id ) {
      if ( tab.window )
        tab.window.removeTab( tab );
      tab.wid = this.id;
      state.queueModel( tab );
    }
  }

  removeTab( tab ) {
    this.tabIds.splice( this.tabIds.indexOf( tab.id ), 1 );
    tab.wid = null;
    state.queueModel( this );
    state.queueModel( tab );
  }

  close() {
    this.closed = true;
    this.windowId = null;
    state.queueModel( this );
  }

  toJson() {
    return {
      id: this.id,
      pid: this.pid,
      title: this.title,
      windowId: this.windowId,
      collapsed: this.collapsed,
      focused: this.focused,
      state: this.state,
      type: this.type,
      tabIds: this.tabIds
    }
  }
}
Object.assign( Window, {
  model_name: 'window',
  autoId: WindowId,
  window_type: 'normal',
  default: {
    windowId: null,
    pid: 'project-0',
    collapsed: true,
    title: 'Window',
    focused: false,
    tabs: {},
  },
  async normalize( win ) {
    if ( win instanceof Window )
      return win;
    const out = {
      windowId: win.id,
      focused: win.focused,
      collapsed: true,
      alwaysOnTop: win.alwaysOnTop,
      height: win.height,
      incognito: win.incognito,
      left: win.left,
      sessionId: win.sessionId,
      state: win.state,
      top: win.top,
      type: win.type,
      width: win.width,
      tabs: {},
    }
    if ( win.pid )
      out.pid = win.pid;
    if ( win.title )
      out.title = win.title;

    const urls = [];
    const tabIds = ( await browser.tabs.query({ windowId: win.id })).map( t => {
      const tab = Tab.normalize(t);
      urls.push( tab.url );
      return tab.id;
    });
    out.tabIds = tabIds;
    out.tabsMatch = urlsToRegexp( urls );

    win = new Window().load( out );
    for ( const t of win.tabList )
      if ( t.wid !== win.id ) {
        t.wid = win.id;
        state.queueModel(t);
      }
    if ( win.project )
      win.project.addWindow( win ); // just in case
    return win;
  }
});

export class ExtensionWindow extends Window {}
Object.assign( ExtensionWindow, {
  window_type: 'extension',
});

export class Tab extends Model {
  constructor() {
    super();
    Object.assign( this, {
      model_name: 'tab',
      default: {
        tabId: null,
        windowId: null,
        wid: null,
        active: false,
        closed: false,
        url: 'about:home',
        icon: '/icons/48.png',
        title: 'Tab',
        discarded: true,
        hidden: false,
        highlighted: false,
        openerTabId: null,
        successorId: null,
        mute: {
          muted: false,
          reason: null,
          extension: null,
        },
        status: null
      },
    });
  }

  get window() {
    return state.windows[ this.wid ];
  }

  get parent() {
    return this.window;
  }

  close() {
    this.closed = true;
    this.active = false;
    this.tabId = null;
    this.windowId = null;
    state.queueModel( this );
  }

  toJson() {
    return {
      id: this.id,
      wid: this.wid,
      active: this.active,
      url: this.url,
      icon: this.icon,
      title: this.title,
      attention: this.attention,
      audible: this.audible,
      discarded: this.discarded,
      closed: this.closed,
      hidden: this.hidden,
      highlighted: this.highlighted,
      incognito: this.incognito,
      index: this.index,
      isArticle: this.isArticle,
      isInReaderMode: this.isInReaderMode,
      lastAccessed: this.lastAccessed,
      mute: this.mute,
      pinned: this.pinned,
      status: this.status,
    }
  }
}
Object.assign( Tab, {
  model_name: 'tab',
  autoId: TabId,
  default: {
    tabId: null,
    windowId: null,
    wid: null,
    active: false,
    closed: false,
    url: 'about:home',
    icon: '/icons/48.png',
    title: 'Tab',
    discarded: true,
    hidden: false,
    highlighted: false,
    openerTabId: null,
    successorId: null,
    mute: {
      muted: false,
      reason: null,
      extension: null,
    },
    status: null
  },
  normalize( tab ) {
    if ( tab instanceof Tab )
      return tab;
    const out = {
      tabId: tab.id,
      active: tab.active,
      url: tab.url,
      title: tab.title,
      attention: tab.attention,
      audible: tab.audible,
      autoDiscardable: tab.autoDiscardable,
      discarded: tab.discarded,
      height: tab.height,
      hidden: tab.hidden,
      highlighted: tab.highlighted,
      incognito: tab.incognito,
      index: tab.index,
      isArticle: tab.isArticle,
      isInReaderMode: tab.isInReaderMode,
      lastAccessed: tab.lastAccessed,
      mute:{
        muted: tab.mutedInfo.muted,
        reason: tab.mutedInfo.reason,
        extension: tab.mutedInfo.extensionId
      },
      openerTabId: tab.openerTabId,
      pinned: tab.pinned,
      sessionId: tab.sessionId,
      status: tab.status,
      successorId: tab.successorId,
      width: tab.width,
      windowId: tab.windowId,
    }
    if ( tab.favIconUrl )
      out.icon = tab.favIconUrl;
    return new Tab().load( out );
  }
});

export default {
  cache,
  Model,
  Project,
  ExtensionWindow,
  Window,
  Tab,
  AutoId,
  ProjectId,
  WindowId,
  TabId,
}
