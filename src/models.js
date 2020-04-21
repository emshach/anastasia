import { urlsToRegexp } from '@/util'

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

  load( obj ) {
    Object.assign( this, this.default, obj )
    if ( !this.id )
      this.id = this.autoId.next()
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
        projectIds: [],
        windowIds: [],
        // noteId: []
      }
    });
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
        tabs: {},
      },
    });
  }

  addTab( tab, pos ) {
    if ( pos > -1) {
      this.tabIds.splice( pos, 0, tab.id );
    } else {
      this.tabIds.push( tab.id );
    }
    tab.wid = this.id;
  }

  removeTab( tab ) {
    this.tabIds.splice( this.tabIds.indexOf( tab.id ), 1 );
    tab.wid = null;
  }

  close() {
    this.closed = true;
    this.windowId = null;
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
      out.tabs[ tab.id ] = tab;
      return tab.id;
    });
    out.tabIds = tabIds;
    out.tabsMatch = urlsToRegexp( urls );

    win = new Window().load( out );
    for ( const t of Object.values( win.tabs ))
      t.wid = win.id;
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

  close() {
    this.closed = true;
    this.active = false;
    this.tabId = null;
    this.windowId = null;
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
