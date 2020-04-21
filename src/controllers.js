import debounce from 'debounce'
import store from '@/data'

const b = browser;
const ports = {};

export class Controller {
  constructor({ name, state, handlers, onConnect, onDisconnect, onMessage,
                window,
                onReady, onOpen, onClose }) {
    Object.assign( this, {
      name,
      port_name: `tabcontrol-${ name }`,
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
      this.port = null;
      return;
    }
    this.setControlTab( port.sender.tab.id );
    ports[ this.port_name ] = port
    port.onMessage.addListener( this.onMessage.bind( this ));
    this.ready = true;
    this.onReady();
  }

  post( msg ) {
    if ( this.port && this.ready )
      this.port.postMessage( msg );
  }

  onMessage( msg ) {
    console.log( 'panel => control', msg );
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
    b.windows.create( this.window() ).then( w => {
      // console.log( 'control panel:', w );
      if ( w.focused )
        store.state.controlActive = true;
      store.controlIds[ w.id ] = this;
      b.windows.update( w.id, { left: 0, top: 0 });
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
      this.ready = false;
      this.windowId = null;
    }
    this.tabId = null;
    this.port.disconnect();
    this.port = null;
  }

  window() {}

  onOpen() {}

  onClose() { this._onClose(); }

  onReady() {}

  onConnect() {}

  onDisconnect() {}
}

export const controlPanel = new Controller({
  name: 'control-panel',
  onConnect( port ) {
    this.windowId = port.sender.tab.windowId;
    return true;
  },
  onReady() {
    if ( this.loaddata ) {
      this.post({ op: 'Load', state: this.loaddata });
      delete this.loaddata;
    } else if ( store.loaded ) {
      this.load( store.toJson() )
    }
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
        this.post({ op: 'Load', state });
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
        Object.assign( tab, {
          closed: true,
          active: false,
          tabId: null,
          windowId: null
        });
        store.save( tab );
        this.post({ op: 'SuspendTab', tabId });
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
      this.post({ op: 'RemoveTab', tabId });
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
      let pos = 0;
      tab.windowId = w.windowId;
      if ( tab.opener ) {
        tab.openerTabId = tab.opener.tabId;
        pos = tab.opener.index + 1;
      } else {
        w.tabIds.find( t => {
          if ( !tabs[t].closed ) ++pos;
          return t === tabId;
        });
      }
      tab.index = pos;
      const t = {};
      [ 'active', 'cookieStoreId', 'discarded', 'index',
        // 'openerTabId',            // leave for now
        'pinned', 'title', 'url', 'windowId' ].forEach( k => {
          if ( tab[k] !== '' && tab[k] != null )
            t[k] = tab[k];
        });
      if ( t.title && !t.discarded )
        delete t.title;
      if ( /about:/.test( t.url ))
        return;                   // TODO: for now, just don't
      b.tabs.create(t).then( t => {
        this.attachTab({ tid: tab.id, tabId: t.id });
        if ( focus ) {
          b.tabs.update( t.id, { active: true });
          b.windows.update( w.windowId, { focused: true }).then(
            store.state.controlActive ? () => {
              b.windows.update( store.panelId, { focused: true });
            } : () => {} );
        }
      });
      this.post({ op: 'ResumeTab', tabId });
    },
    attachTab({ tid, tabId }) {
      const tab = store.state.tabs[ tid ];
      const winTab = store.openTabs[ tabId ];
      // console.log( 'attachTab', { winTab, tab });
      if ( winTab ) {
        if ( winTab.id === tab.id )
          return;
        if ( winTab.wid !== tab.wid )
          return;                 // TODO: throw?
        // console.log( 'overwriting', { winTab, tab });
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
        this.post({ op: 'RemoveTab', tabId: winTab.id });
      }
      store.openTabs[ tabId ] = tab;
      tab.tabId = tabId;
      delete tab.closed;
      store.save( tab );
    },
    closeWindow({ windowId }) {
      const w = store.state.windows[ windowId ];
      if ( w.closed ) {
        this.removeWindow({ windowId }); // TODO: ask for confirmation if many tabs
      } else {
        b.windows.remove( w.windowId );
        this.post({ op: 'SuspendWindow', windowId });
      }
    },
    removeWindow({ windowId }) {
      const w = store.state.windows[ windowId ];
      if (!w) return;
      delete store.openWindows[ windowId ];
      const tabIds = w.tabIds;
      const togo = tabIds.concat([ w.id ]);
      // console.log({ togo });
      store.clearData( togo );
      tabIds.forEach( tid => {
        if ( store.state.tabs[ tid ].tabId )
          delete store.openTabs[ store.state.tabs[ tid ].tabId ];
        delete store.state.tabs[ tid ];
      });
      if ( !w.closed )
        b.windows.remove( w.windowId );
      const wix = store.windowIds.indexOf( w.id );
      if ( wix > -1 ) {
        store.windowIds.splice( wix, 1 );
        store.setData({ windowIds: store.windowIds });
        store.clearData( w.id );
      }
      this.post({ op: 'RemoveWindow', windowId: w.id });
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
      w.openingTab = tabId;
      if (!w) return;
      const win = {};

      [ 'allowScriptsToClose', 'cookieStoreId', 'height',
        'incognito', 'left', 'state', 'tabId', 'titlePreface', 'top',
        'type', 'width' ].forEach( k => {
          if ( w[k] !== '' && w[k] != null )
            win[k] = w[k];
        });
      const tab = store.state.tabs[ tabId ];
      // TODO: don't do things so differently if we have a tab
      if ( tab ) {
        win.url = tab.url;
        const openTabs = [];
        w.tabIds.forEach( tid => {
          const t = store.state.tabs[ tid ];
          if ( !t.closed && t.id !== tab.id ) {
            t.discarded = true;
            t.active = false;
            openTabs.push(t);
          }
        });
        b.windows.create( win ).then( win => {
          delete w.closed;
          this.attachWindow({ wid: w.id, windowId: win.id });
          openTabs.forEach( t => this.resumeTab({ tabId: t.id }));
          if ( focus ) {
            // console.log( 1, { controlActive });
            b.windows.update( win.id, { focused: true }).then(
              controlActive ? () => {
                b.windows.update( store.panelId, { focused: true });
              } : () => {} );
            this.post({ op: 'FocusWindow', windowId: w.id });
          }
          store.save(w);
        });
      } else {
        const openTabs = w.tabIds.map( t => store.tabs[t] )
              .filter( t => !t.closed );
        win.url = openTabs.map( t => t.url );
        b.windows.create( win ).then( win => {
          delete w.closed;
          this.attachWindow({ wid: w.id, windowId: win.id });
          win.tabs.forEach(( t, i ) => {
            this.attachTab({ tid: openTabs[i].id, tabId: t.id });
          });
          if ( focus ) {
            // console.log( 2, { controlActive });
            b.windows.update( win.id, { focused: true }).then(
              controlActive ? () => {
                b.windows.update( store.panelId, { focused: true });
              } : () => {} );
            this.post({ op: 'FocusWindow', windowId: w.id });
          }
          store.save(w);
        });
      }
      this.post({ op: 'ResumeWindow', windowId: w.id });
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
      this.post({
        op: 'SetWindowCollapse',
        windowId: w.id,
        collapse:w.collapsed
      });
    },
    addProject({ project }) {
      project = store.addProject( project );
      this.post({ op: 'AddProject', project });
    },
    removeProject({ projectId }) {
      store.removeProject( projectId );
      this.post({ op: 'RemoveProject', projectId });
    },
    moveProject({ projectId }) {
    }
    // createTab({ tabId }) {
    // },
    // moveTab({ tabId, windowId, pos }) {
    // }
  }
});
export const closePrompt = new Controller({
  name: 'close-prompt',
  onConnect() {
    const tabs = store.recentlyClosed.splice(0);
    // console.log( 'close-prompt tabs', tabs, store.recentlyClosed );
      store.prompt.postMessage({ op: 'Load', tabs });
    return true;
  },
  window() {
    return {
      type: 'popup',
      url: 'close-prompt.html',
      left: 0,
      top: 0,
      width: 320,
      height: 152,
      allowScriptsToClose: true,
    }
  },
  handlers: {
    removeTab( msg ) { controlPanel.removeTab( msg ) },
    add( tab ) {
      this.post({ op: 'Add', tab });
    }
  }
});

export default {
  Controller,
  controlPanel,
  closePrompt,
}
