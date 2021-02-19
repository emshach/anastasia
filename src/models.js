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
export const IconId = new AutoId( 'icon' );
export const TabId = new AutoId( 'tab' );
export const NoteId = new AutoId( 'note' );
export const RuleId = new AutoId( 'rule' );

export class Model {
  constructor() {
    const { modelName, fields, attrs, autoId: _autoId, defaults } = Model;
    Object.assign( this, { modelName, fields, attrs, _autoId, defaults });
    const c = Object.getPrototypeOf( this ).constructor;
    if ( c !== Model ) {
      const { modelName, fields, attrs, autoId: _autoId, defaults } = c;
      Object.assign( this, { modelName, fields, attrs, _autoId, defaults });
    }
  }

  init() {
    this.model_registry = state[ this.modelName + 's' ];
  }

  load( obj, init, rename = false ) {
    Object.assign( this, this.defaults );
    if ( obj.id !== undefined && obj.id !== null ) {
      this.id = obj.id;
    }
    for ( const k of this.fields ) {
      if ( obj[k] !== undefined && obj[k] !== null ) {
        this[k] = obj[k];
      }
    }
    for ( const k of this.attrs ) {
      if ( obj[k] !== undefined && obj[k] !== null ) {
        this[k] = obj[k];
      }
    }
    if ( !this.id || rename ) {
      this.id = this.autoId.next();
      while ( this.id in this.model_registry )
        this.id = this.autoId.next();
      // Feel like I shouldn't have to do this but some weird bug show's it's
      // probably better to just make sure anyway
    }
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
      this._autoId = new AutoId( this.modelName  )
      return this._autoId;
  }

  toJson() {
    const out = { id: this.id };
    for ( const f of this.fields ) {
      out[f] = this[f];
    }
    return out;
  }

  update( updates ) {
    Object.assign( this, updates );
    return this;
  }
}
Object.assign( Model, {
  modelName: null,
  fields: [],
  attrs: [],
  autoId: { next() { return null }},
  defaults: {},
  find(f) {
    const models = state[ this.modelName + 's' ];
    return Object.values( models ).find(f)
  },
  findKey(f) {
    const models = state[ this.modelName + 's' ];
    return Object.keys( models ).find( k => f( models[k] ))
  },
  filter(f) {
    const models = state[ this.modelName + 's' ];
    return Object.values( models ).filter(f);
  },
  filterKeys(f) {
    const models = state[ this.modelName + 's' ];
    return Object.keys( models ).filter( k => f( models[k] ))
  },
});

export class Project extends Model {
  constructor() {
    super();
    this.init();
  }

  get projectList() {
    return this.projectIds.map( k => state.projects[k] );
  }

  get windowList() {
    return this.windowIds.map( k => state.windows[k] );
  }

  get children() {
    return this.projectList.concat( this.windows );
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
}
Object.assign( Project, {
  modelName: 'project',
  fields: [ 'name', 'pid', 'projectIds', 'windowIds' ],
  autoId: ProjectId,
  default: {
    name: 'misc',
    projectIds: [],
    windowIds: [],
    noteIds: [],
  },
  async normalize( prj ) {
    if ( prj instanceof Project ) return prj;
    return new Project().load( prj )
  }
});

export class Window extends Model {
  constructor() {
    super();
    this.init();
  }

  get tabsMatch() {
    return urlsToRegexp( this.tabList.map( tab => tab.url ));
  }

  get tabList() {
    return this.tabIds.map( k => state.tabs[k] );
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
}
Object.assign( Window, {
  modelName: 'window',
  autoId: WindowId,
  fields: [ 'pid', 'title', 'windowId', 'collapsed', 'focused', 'state', 'type',
            'closed', 'tabIds' ],
  attrs: [ 'windowId' ],
  defaults: {
    window_type: 'normal',
    windowId: null,
    pid: 'project-0',
    collapsed: true,
    title: 'Window',
    focused: false,
    tabs: {},
  },
  async normalize( win ) {
    if ( win instanceof Window ) return win;
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
  defaults: Object.assign( {}, Window.defaults, {
    window_type: 'extension',
  })
});

export class Icon extends Model {
  constructor() {
    super();
    this.init();
  }
}
Object.assign( Icon, {
  modelName: 'icon',
  fields: [
    'url',
    'data',
  ],
  autoId: IconId,
  defaults: {
    url: '',
    data: '',
  },
  normalize( icon ) {
    if ( icon instanceof Icon ) return icon;
    if ( typeof icon === 'string' ) {
      const field = [ icon.startsWith( 'data:image/' ) ? 'data' : 'url'];
      const found = Icon.find( x => x[ field ] === icon );
      if ( found ) return found;
      const out =  new Icon().load({[ field ]: icon });
      state.queueModel( out );
      return out;
    }
  }
});

export class Tab extends Model {
  constructor() {
    super();
    this.init();
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

  get icon() {
    return state.icons[ this.iconidi ];
  }

  set icon( value ) {
    const icon = Icon.normalize( value );
    this.iconid = ( icon && icon.id ) || null;
  }

  set favIconUrl( value ) {
    this.icon = value;
  }

  set mutedInfo( value ) {
    this.mute = {
      muted: value.muted,
      reason: value.reason,
      extension: value.extensionId
    }
  }

  load( obj, init, rename = false ) {
    const { icon, ...data } = obj;
    if ( icon && !data.iconid ) {
      const iconObj = Icon.normalize( icon );
      if ( iconObj ) data.iconid = iconObj.id;
    }
    return super.load( data, init, rename );
  }

  update( updates ) {
    const { icon, favIconUrl, mutedInfo, ...data } = updates;
    if ( icon ) this.icon = icon;
    if ( favIconUrl ) this.favIconUrl = favIconUrl;
    if ( mutedInfo ) this.mutedInfo = mutedInfo;

    return super.update( data );
  }
}
Object.assign( Tab, {
  modelName: 'tab',
  fields: [
    'id',
    'wid',
    'active',
    'url',
    'iconid',
    'title',
    'attention',
    'audible',
    'discarded',
    'detached',
    'closed',
    'hidden',
    'highlighted',
    'incognito',
    'index',
    'isArticle',
    'isInReaderMode',
    'lastAccessed',
    'mute',
    'pinned',
    'status',
  ],
  attrs: [ 'tabId' ],
  autoId: TabId,
  defaults: {
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
    if ( tab instanceof Tab ) return tab;
    const data = {
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
    const out = new Tab().load( data );
    if ( tab.favIconUrl )
      out.icon = tab.favIconUrl;
    return out;
  }
});

export class Note extends Model {
  constructor() {
    super();
    this.init();
  }

  get projectList() {
    return this.projectIds.map( k => state.projects[k] );
  }

  get windowList() {
    return this.windowIds.map( k => state.windows[k] );
  }

  get tabList() {
    return this.tabIds.map( k => state.tabs[k] );
  }

  get ruleList() {
    return this.ruleIds.map( k => state.rules[k] );
  }

  get noteList() {
    return this.noteIds.map( k => state.notes[k] );
  }

  get parentList() {
    return this.parentIds.map( k => state.notes[k] );
  }

  get children() {
    return this.noteList
  }
}
Object.assign( Note, {
  modelName: 'note',
  fields: [ 'name', 'summary', 'details',
            'projectIds', 'windowIds', 'tabIds', 'ruleIds', 'noteIds', 'parentIds' ],
  autoId: NoteId,
  default: {
    name: 'note',
    summary: '',
    details: '',
    projectIds: [],
    windowIds: [],
    tabIds: [],
    ruleIds: [],
    noteIds: [],
    parentIds: [],
  },
  async normalize( note ) {
    if ( note instanceof Note ) return note;
    return new Note().load( note )
  }
});

export class Rule extends Model {
  constructor() {
    super();
    this.init();
  }
}
Object.assign( Rule, {
  modelName: 'note',
  fields: [ 'match', 'time', 'onlytab', 'action' ],
  autoId: RuleId,
  default: {
    match: '',
    time: 0,
    onlytab: false,
    action: 'forget',
  },
  async normalize( rule ) {
    if ( rule instanceof Rule ) return rule;
    return new Rule().load( rule )
  }
});

export default {
  cache,
  Model,
  Project,
  ExtensionWindow,
  Window,
  Icon,
  Tab,
  Note,
  Rule,
  AutoId,
  ProjectId,
  WindowId,
  IconId,
  TabId,
  NoteId,
  RuleId,
}
