import debounce from 'debounce'
import store from '@/data'
import state from '@/state'
import { loadFromImport } from '@/actions'
import { Project, Rule } from '@/models'

const b = browser;
const ports = {};

export class Controller {
  constructor({ name, state, handlers, window,
                onConnect, onDisconnect, onMessage, onReady, onOpen, onClose }) {
    Object.assign( this, {
      name,
      port_name: `anastasia-${ name }`,
      window,
    });
    if ( onConnect )
      this.onConnect = onConnect;
    if ( onDisconnect )
      this.onDisconnect = onDisconnect;
    if ( onReady )
      this.onReady = onReady;
    if ( onOpen )
      this.onOpen = onOpen;
    if ( onClose )
      this.onClose = onClose;
    if ( onMessage )
      this.onMessage = onMessage;

    Object.assign( this, state );
    Object.assign( this, handlers );
    this.port = null;
    this.ready = false;
    b.runtime.onConnect.addListener( this.connect.bind( this ));
    this.open = debounce( this.doOpen.bind( this ), 300 );
  }

  connect( port ) {
    if ( port.name !== this.port_name )
      return;
    if ( this.port ) {
      b.tabs.remove( port.sender.tab.id );
      return;
    }
    this.port = port
    if (! this.onConnect( port )) {
      this.windowId = port.sender.tab.windowId;
      this.port = null;
      return;
    }
    this.setControlTab( port.sender.tab.id );
    ports[ this.port_name ] = port
    port.onMessage.addListener( this.onMessage.bind( this ));
    this.ready = true;
    this.onReady();
  }

  send( op, msg ) {
    console.log( 'sending', { op, msg });
    msg.op = op;
    if ( this.port && this.ready )
      this.port.postMessage( msg );
  }

  onMessage( msg ) {
    console.log( `${ this.name || 'panel' } => control`, msg );
    if ( this[ msg.op ])
      this[ msg.op ]( msg );
    else
      console.warn( `'${ msg.op }' not yet implemented` );
  }

  setControlTab( tabId ) {
    this.tabId = tabId;
    store.setControlTab( tabId );
  }

  doOpen() {
    if ( this.windowId ) {
      b.windows.update( this.windowId, { focused: true });
      return;
    }
    if ( this.opening )
      return;
    this.opening = true;
    const spec = this.window();
    b.windows.create( spec ).then( w => {
      // console.log( 'control panel:', w );
      if ( w.focused )
        store.state.controlActive = true;
      store.controlIds[ w.id ] = this;
      this.windowId = w.id
      if (( 'left' in spec ) || ( 'top' in spec )) {
        const pos = {};
        if ( 'left' in spec )
          pos.left = spec.left || 0;
        if ( 'top' in spec )
          pos.top = spec.top || 0;
        b.windows.update( w.id, pos );
      }
      this.onOpen();
      this.opening = false;
    }).catch( err => {
      console.warn( 'could not create window!', err );
      this.opening = false;
    });
  }

  close() {
    b.tabs.remove( this.tabId );
    this.onClose()
  }

  _onClose() {
    if ( this.windowId ) {
      delete store.controlIds[ this.windowId ];
      this.windowId = null;
    }
    this.ready = false;
    this.tabId = null;
    if ( this.port ) {
      this.port.disconnect();
      this.port = null;
    }
  }

  window() {}

  onOpen() {}

  onClose() { this._onClose(); }

  onReady() {}

  onConnect( port ) {
    this.windowId = port.sender.tab.windowId;
    return true;
  }

  onDisconnect() {}
}

export const controlPanel = new Controller({
  name: 'control-panel',
  state: {
    isMainPanel: true,
  },
  onReady() {
    if ( this.loaddata ) {
      this.send( 'Load', { state: this.loaddata });
      delete this.loaddata;
    } else if ( store.loaded ) {
      this.load( store.toJson() )
    }
  },
  onOpen() {
    store.panelId = this.windowId
    store.controlPanelOpen = true;
    store.setData({ controlPanelOpen: true });
  },
  onClose() {
    this._onClose();
    store.setData({ controlPanelOpen: false });
  },
  window() {
    return {
      type: 'detached_panel',
      url: 'popup.html',
      left: 0,
      top: 0,
      width: 320,
      height: window.screen.height,
      allowScriptsToClose: true,
    }
  },
  handlers: {
    load( state ) {
      if ( this.ready )
        this.send( 'Load', { state });
      else
        this.loaddata = state;
    },
    closeTab({ tabId }) {
      const tab = store.state.tabs[ tabId ];
      if ( tab.tabId && ( tab.tabId in store.openTabs ))
        b.tabs.remove( tab.tabId );
      if ( tab.closed ) {
        this.removeTab({ tabId });
      } else {
        tab.update( tab, {
          closed: true,
          index: null,
          active: false,
          tabId: null,
          windowId: null
        });
        store.save( tab );
        this.send( 'SuspendTab', { tabId });
      }
    },
    removeTab({ tabId }) {
      const tab = store.state.tabs[ tabId ];
      if ( !tab ) return;
      const { w, tix } = store.getTabWindow( tab );
      if ( w && tix > -1 ) {
        w.tabIds.splice( tix, 1 );
      }
      store.removeTab( tab )
      this.send( 'RemoveTab', { tabId });
      if (w) {
        console.log( 'tab removed', w );
        if ( !w.tabIds.length )
          this.removeWindow({ windowId: w.id });
        else
          store.save(w);
      }
    },
    focusTab({ tabId }) {
      const tab = store.state.tabs[ tabId ];
      if ( tab ) {
        const w = store.state.windows[ tab.wid ];
        if ( tab.closed || w.closed ) {
          this.resumeTab({ tabId, focus: true });
          return;
        }
        b.tabs.update( tab.tabId, { active: true });
        b.windows.update( w.windowId, { focused: true }).then(
          store.state.controlActive ? () => {
            b.windows.update( store.panelId, { focused: true });
          } : () => {} );
      }
    },
    resumeTab({ tabId, focus }) {
      const tabs = store.state.tabs;
      const tab = tabs[ tabId ];
      const w = store.state.windows[ tab.wid ];
      if ( w.closed ) {
        this.resumeWindow({ windowId: w.id, tabId, focus });
        return;
      }
      // get tab position
      tab.windowId = w.windowId;
      if ( tab.index === null || tab.index === undefined ) {
        let pos = 0;
        // if ( tab.opener ) {
        //   tab.openerTabId = tab.opener.tabId;
        //   pos = tab.opener.index + 1;
        // } else {
        w.tabIds.find( t => {
          if ( !tabs[t].closed ) ++pos;
          return t === tabId;
        });
        // }
        tab.index = pos;
      }
      const t = {};
      [ 'active', // 'cookieStoreId',  // leave for now
        'discarded', 'index',
        // 'openerTabId',            // leave for now
        'pinned', 'title', 'url', 'windowId' ].forEach( k => {
          if ( tab[k] !== '' && tab[k] !== null )
            t[k] = tab[k];
        });
      if ( t.title && !t.discarded )
        delete t.title;
      if ( /about:/.test( t.url ))
        return;       // TODO: extension page to click link. for now, just don't
      console.log( 'creating tab', t );
      b.tabs.create(t).then( t => {
        this.attachTab({ tid: tab.id, tabId: t.id, tab: t });
        if ( focus ) {
          b.tabs.update( t.id, { active: true });
          b.windows.update( w.windowId, { focused: true }).then(
            store.state.controlActive ? () => {
              b.windows.update( store.panelId, { focused: true });
            } : () => {} );
        }
      });
      this.send( 'ResumeTab', { tabId });
    },
    attachTab({ tid, tabId, tab }) {
      const storedTab = store.state.tabs[ tid ];
      const winTab = store.openTabs[ tabId ];
      console.log( 'attachTab', { winTab, tab });
      if ( winTab ) {
        if ( winTab.id === storedTab.id )
          return;
        if ( winTab.wid !== storedTab.wid )
          return;                 // TODO: throw?
        // console.log( 'overwriting', { winTab, storedTab, tab });
        const w = store.state.windows[ winTab.wid ];
        // TODO: maybe alias
        const i = w.tabIds.indexOf( tid );
        if ( i > -1 ) {
          if ( w.tabIds && ( !w.tabIds[i] || w.tabIds[i] === winTab.id )) {
            w.tabIds.splice( i, 1 );
          }
          store.save(w);
        }
        store.removeTab( winTab );
        this.send( 'RemoveTab', { tabId: winTab.id });
      }
      if ( tab ) {
        storedTab.update( tab );
      }
      store.openTabs[ tabId ] = storedTab;
      tab.tabId = tabId;
      delete tab.closed;
      store.save( storedTab );
    },
    async closeWindow({ windowId }) {
      const w = store.state.windows[ windowId ];
      if ( w.closed ) {
        this.removeWindow({ windowId }); // TODO: ask for confirmation if many tabs
      } else {
          w.closed = true;
          store.save(w);
        try {
          await b.windows.remove( w.windowId );
        } catch ( error ) {
          console.error( `couldn't close window: ${error}` );
        }
        this.send( 'SuspendWindow', { windowId });
      }
    },
    removeWindow({ windowId }) {
      const win = store.state.windows[ windowId ];
      if ( !win ) return;
      delete store.openWindows[ win.windowId ];
      const tabIds = win.tabIds;
      const togo = tabIds.concat([ win.id ]);
      // console.log({ togo });
      store.clearData( togo );
      tabIds.forEach( tid => {
        if ( store.state.tabs[ tid ].tabId )
          delete store.openTabs[ store.state.tabs[ tid ].tabId ];
        delete store.state.tabs[ tid ];
      });
      if ( !win.closed )
        b.windows.remove( win.windowId );
      store.removeWindow( win )
      this.send( 'RemoveWindow', { windowId: win.id });
    },
    focusWindow({ windowId }) {
      const w = store.state.windows[ windowId ];
      if ( w.closed ) {
        this.resumeWindow({ windowId, focus: true });
        return;
      }
      b.windows.update( w.windowId, { focused: true }).then(
        store.state.controlActive ? () => {
          b.windows.update( store.panelId, { focused: true });
        } : () => {} );
    },
    resumeWindow({ windowId, tabId, focus }) {
      const w = store.state.windows[ windowId ];
      const controlActive = store.state.controlActive;
      // console.log( 0, { controlActive });
      console.log( 'resumeWindow', { windowId, tabId, focus, window: w })
      // console.trace()
      if (!w) return;

      // get tabs
      const openTabs = [];
      let tab = null;
      let index = 0;
      if ( tabId ) {
        for ( const tid of w.tabIds ) {
          const t = store.state.tabs[tid];
          if (!t) continue;
          if ( t.id === tabId ) {
            delete t.closed;
            console.log( 'found main tab', t, 'at', index );
            t.active = true;
            t.index = index++;
            tab = t;
          } else if ( !t.closed ) {
            openTabs.push(t)
            console.log( 'found open tab', t, 'at', index );
            t.index = index++;
          }
        }
      } else {
        for ( const tid of w.tabIds ) {
          const t = store.state.tabs[tid];
          if (!t) continue;
          if ( !t.closed ) {
            if ( t.active ) {
              if ( tab ) {
                openTabs.push(t);
              } else {
                tab = t
              }
            } else {
              openTabs.push(t);
            }
            console.log( 'found open tab', t, 'at', index );
            t.index = index++;
          }
        }
      }
      if ( !tab ) tab = openTabs.pop()
      if ( !tab ) {
        console.error( "couldn't find a tab anywhere!" )
        return
      }
      tab.discarded = false;
      openTabs.forEach( t => { t.active = false })
      // TODO: if !tab?
      // TODO: we need to be able to make and attach  a blank tab
      w.openingTab = tab.id;

      // setup window
      const win = {};
      [ 'allowScriptsToClose', 'cookieStoreId', 'height',
        'incognito', 'left', 'state', 'tabId', 'titlePreface', 'top',
        'type', 'width' ].forEach( k => {
          if ( w[k] !== '' && w[k] != null )
            win[k] = w[k];
        })
      // TODO: don't do things so differently if we have a tab
      win.url = tab.url;
      console.log( 'creating window', { win, tab, openTabs });
      b.windows.create( win ).then( win => {
        console.log( 'created window', win );
        this.attachTab({ tid: tab.id, tabId: win.tabs[0].id, tab: win.tabs[0] });
        delete w.closed;
        this.attachWindow({ wid: w.id, windowId: win.id });
        openTabs.forEach( t => this.resumeTab({ tabId: t.id }));
        if ( focus ) {
          // console.log( 1, { controlActive });
          b.windows.update( win.id, { focused: true }).then(
            controlActive ? () => {
              b.windows.update( store.panelId, { focused: true });
            } : () => {} );
          this.send( 'FocusWindow', { windowId: w.id });
        } else {
          setTimeout(() => {
            b.windows.get( win.id ).then( win => {
              if ( win.focused )
                this.send( 'FocusWindow', { windowId: w.id });
            });
          }, 1000 )
        }
        store.save(w);
      });
      this.send( 'ResumeWindow', { windowId: w.id });
    },
    attachWindow({ wid, windowId }) {
      const w = store.state.windows[ wid ];
      const win = store.openWindows[ windowId ];
      if ( win ) {
        if ( w.id === win.id )
          return;
        store.removeWindow( win );
      }
      store.openWindows[ windowId ] = w;
      w.windowId = windowId;
      store.save(w);
    },
    collapseWindow({ windowId }) {
      const w = store.state.windows[ windowId ];
      w.collapsed = !w.collapsed;
      store.save(w);
      this.send( 'SetWindowCollapse', {
        windowId: w.id,
        collapse:w.collapsed
      });
    },
    addProject({ project }) {
      project = store.addProject( project );
      this.send( 'AddProject', { project });
    },
    removeProject({ projectId }) {
      store.removeProject( projectId );
      this.send( 'RemoveProject', { projectId });
    },
    moveProject({ projectId }) {
    },
    // createTab({ tabId }) {
    // },
    // moveTab({ tabId, windowId, pos }) {
    // }
    // control panel update functions
    editWindow({ windowId, updates }) {
      const w = store.state.windows[ windowId ];
      if (!w) return;
      w.update( updates );  // for now
      store.save(w);
      this.send( 'UpdateWindow', { windowId: w.id, changes: updates });
    },
    editTab({ tabId, updates }) {
      const t = store.state.tabs[ tabId ];
      if (!t) return;
      t.update( updates );
      store.save(t);
      this.send( 'UpdateTab', { tabId: t.id, tab:t.toJson(), changes: updates });
    },
    openOptions() {
      optionsPage.open()
    }
  }
});

export const closePrompt = new Controller({
  name: 'close-prompt',
  onReady() {
    const tabs = store.recentlyClosed.splice(0);
    // console.log( 'close-prompt tabs', tabs, store.recentlyClosed );
    this.send( 'Load', { tabs });
  },
  window() {
    return {
      type: 'popup',
      url: 'close-prompt.html',
      width: 320,
      height: 152,
      allowScriptsToClose: true,
    }
  },
  handlers: {
    removeTab( msg ) { controlPanel.removeTab( msg ) },
    archiveTab( msg ) {},
    moveTab( msg ) {},
    add( tab ) {
      this.send( 'Add', { tab });
    },
    done() {
      this.close();
    }
  }
});

export const optionsPage = new Controller({
  name: 'options',
  onReady() {
    // const tabs = store.recentlyClosed.splice(0);
    // // console.log( 'close-prompt tabs', tabs, store.recentlyClosed );
    this.getRules();
  },
  window() {
    return {
      type: 'detached_panel',
      url: 'options.html',
      width: 1024,
      height: window.screen.height,
      allowScriptsToClose: true,
    }
  },
  handlers: {
    async getRules() {
      this.send( 'LoadRules', {
        rules: Object.values( store.state.rules ).map( x => x.toJson() )
      })
    },
    async removeRule({ ruleId, confirmed }) {
      if ( !confirmed ) {
        this.send( 'Confirm', {
          action: 'delete',
          model: 'Rule',
          id: ruleId
        });
        return;
      }
      this.getRules()
    },
    async saveRules({ rules }) {
      for ( const rule of rules ) {
        if ( !rule.id ) {
          const obj = await Rule.normalize( rule );
          store.state.queueModel( obj );
          continue;
        }
        const r = store.state.rules[ rule.id ];
        if (!r) continue;
        r.update( rule );  // for now
        store.state.queueModel(r)
      }
      // TODO: maybe some of this goes in store
      await store.saveAll();
      this.getRules()
    },
    async importData({
      projects,
      windows,
      icons,
      tabs,
      notes,
      reopen,
      sync,
      orphaned
    }) {
      console.log( 'importData', {
        projects,
        windows,
        icons,
        tabs,
        notes,
        reopen,
        sync,
        orphaned
      });
      const tx = {};
      const rename = ( list ) => list
            .map( id => tx[ id ] && tx[ id ].id )
            .filter ( x => x ); // eslint-disable-line func-call-spacing
      const openWindows = [];
      const updates = [];
      // const tabNotes = {};

      try {
        const blend = {}
        for ( const p of projects ) {
          const prj = Project.find( fp => fp.name === p.name );
          if ( prj ) {
            tx[ p.id ] = prj
            blend[ p.id ] = prj
          } else {
            tx[ p.id ] = store.importProject(p);
          }
        }
        for ( const w of windows ) {
          tx[ w.id ] = store.importWindow(w);
        }
        // for ( const i of icons ) {
        //   tx[ i.id ] = store.import(i);
        // }
        for ( const t of tabs ) {
          if ( t.orphaned ) {
            if ( !orphaned ) continue;
            // TODO: tbd
          } else {
            if ( t.iconid && icons[ t.iconid ]) {
              t.icon = icons[ t.iconid ].url || icons[ t.iconid ].data;
            }
            tx[ t.id ] = store.importTab(t);
          }
        }
        for ( const n of notes ) {
          tx[ n.id ] = store.importNote(n);
        }

        const importData = () => {
          const project0 = Object.values( state.projects )[0]
          for ( const p of projects ) {
            const prj = tx[ p.id ];
            if ( !prj ) continue;
            if ( blend[ p.id ]) {
              if ( p.projectIds ) {
                prj.projectIds =
                   ( prj.projectIds || [] ).concat( rename( p.projectIds ))
              }
              if ( p.windowIds ) {
                prj.windowIds =
                   ( prj.windowIds || [] ).concat( rename( p.windowIds ))
              }
              p.projectIds = []
              p.windowIds = []
              if ( p.pid && tx[ p.pid ]) {
                prj.pid = tx[ p.pid ].id;
              } else {
                project0.addProject( prj )
              }
            } else {
              if ( p.projectIds ) {
                prj.projectIds = rename( p.projectIds )
              }
              if ( p.windowIds ) {
                prj.windowIds = rename( p.windowIds )
              }
            }
            updates.push( prj );
            // FIXME: don't like that this process is half outside of import'
          }
          for ( const w of windows ) {
            const win = tx[ w.id ];
            if ( !win ) continue;
            if ( w.tabIds ) {
              win.tabIds = rename( w.tabIds )
            }
            win.windowId = null;
            if ( w.pid && tx[ w.pid ]) {
              win.pid = tx[ w.pid ].id;
            } else {
              project0.addWindow( win )
            }
            w.windowId = null;
            // if ( !w.closed ) {
            //   openWindows.push(w);
            // }
            // w.closed = true;
            updates.push( win );
          }
          for ( const t of tabs ) {
            const tab = tx[ t.id ];
            if ( !tab ) continue;
            if ( t.wid && tx[ t.wid ]) {
              tab.wid = tx[ t.wid ].id;
            } else {
              tab.wid = null;
            }
            tab.iconid = null;
            tab.tabId = null;
            updates.push( tab );
          }
          for ( const n of notes ) {
            const note = tx[ n.id ];
            if ( !note ) continue;
            updates.push( note );
            // TODO: the rest of this
          }
          // TODO: rules

          console.log( 'To be imported', {
            tx,
            projects: projects.map(({ id }) => tx[ id ]),
            windows: windows.map(({ id }) => tx[ id ]),
            tabs: tabs.map(({ id }) => tx[ id ]),
            notes: notes.map(({ id }) => tx[ id ]),
            reopen
            // TODO: rules
          });
          store.saveAll( updates );
        }
        // throw new Error( 'Escape hatch!' );
        if ( sync ) {
          await loadFromImport(() => {
            importData();
            return windows.map(({ id }) => tx[ id ]);
          }, reopen );
          for ( const p of projects ) {
            const project = tx[ p.id ];
            if ( !project.windowIds.length )
              store.removeProject( project.id );
          }
          // controlPanel.load( store.toJson() );
          // ^^^ not necessary, methinks
        } else {
          importData();
          controlPanel.load( store.toJson() );
          if ( reopen ) {         // eslint-disable-line no-unreachable
            for ( const { windowId } of openWindows ) {
              controlPanel.resumeWindow({ windowId });
            }
          }
        }
        this.send( 'ImportSuccess', {} );
      } catch ( error ) {
        store.discard();
        console.trace();
        console.log( error, error.stack );
        this.send( 'ImportFailed', { error: '' + error });
      }
    },
    // removeTab( msg ) { controlPanel.removeTab( msg ) },
    // archiveTab( msg ) {},
    // moveTab( msg ) {},
    // add( tab ) {
    //   this.send( 'Add', { tab });
    // },
    // done() {
    //   this.close();
    // }
  }
});

export default {
  Controller,
  controlPanel,
  closePrompt,
  optionsPage,
}
