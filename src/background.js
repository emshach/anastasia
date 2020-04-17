import debounce from 'debounce'
import store from './data'

const b = browser;
window.tabControl = store;

function clearControl() {
  store.connected = false;
  store.port = null;
  store.sendUpdates = false;
  store.controlPanelOpen = false;
  store.setData({  controlPanelOpen: false });
  const wid = store.panelId;
  delete store.panelId;
  const w = store.openWindows[ wid ];
  if (!w) return;
  const wix = store.windowIds.indexOf( w.id );
  delete store.openWindows[ wid ];
  if ( wix > -1 ) {
    store.windowIds.splice( wix, 1 );
    delete store.state.windows[ w.id ];
    store.setData({ windowIds: store.windowIds });
  }
}
function getTabWindow( tab ) {
  const wid = tab.wid,
        tid = tab.id;
  let w, tix;
  if ( wid )
    w = store.windows[ wid ];
  if (w) {
    tix = w.tabIds.indexOf( tid );
    return { w, tix };
  } else {
    w = Object.values( store.windows ).find( win => {
      if ( !win.tabs )
        return false;
      tix = win.tabIds.indexOf( tid );
      if ( tix < 0 )
        return false;
      return true;
    });
    return { w, tix };
  }
}

function updateView( obj ) {
  if ( !store.port || !store.sendUpdates )
    return;
  store.port.postMessage( obj );
}
const controller = {
  registerPanel({ windowId, tabId }) {
    const w = store.openWindows[ windowId ];
    if ( store.panelId && windowId !== store.panelId ) {
      b.windows.remove( windowId );
      if (w)
        updateView({ op: 'RemoveWindow', windowId });
      return;
    }
    tabsLoaded().then(() => {
      store.controlPanelOpen = true;
      store.setData({ controlPanelOpen: true }); // FIXME: ew
      store.panelTab = tabId;
      if (w) {
        w.isControlPanel = true;
        saveWindow(w);
      }
      store.sendUpdates = true;
      updateView({ op: 'Load', state: store.state });
    });
  },
  closeTab({ tabId }) {
    const tab = store.state.tabs[ tabId ];
    if ( tab.tabId && ( tab.tabId in store.openTabs ))
      b.tabs.remove( tab.tabId );
    if ( tab.closed ) {
      this.removeTab({ tabId });
    } else {
      tab.closed = true;
      tab.active = false;
      delete tab.tabId;
      delete tab.windowId;
      store.setData({[ tab.id ]: tab });
      updateView({ op: 'SuspendTab', tabId });
    }
  },
  removeTab({ tabId }) {
    const tab = store.state.tabs[ tabId ];
    if ( !tab ) return;
    const { w, tix } = getTabWindow( tab );
    if ( w && tix > -1 ) {
      w.tabIds.splice( tix, 1 );
    }
    if ( store.openTabs[ tab.tabId ]) {
      delete store.openTabs[ tab.tabId ];
      b.tabs.remove( tab.tabId );
    }
    store.clearData( tab.id );
    delete store.state.tabs[ tab.id ];
    updateView({ op: 'RemoveTab', tabId });
    if (w) {
      console.log( 'tab removed', w );
      saveWindow(w);
      if ( !w.tabIds.length )
        this.removeWindow({ windowId: w.id });
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
    updateView({ op: 'ResumeTab', tabId });
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
        saveWindow(w);
      }
      delete store.state.tabs[ winTab.id ];
      b.storage.remove( winTab.id );
      updateView({ op: 'RemoveTab', tabId: winTab.id });
    }
    store.openTabs[ tabId ] = tab;
    tab.tabId = tabId;
    delete tab.closed;
    store.setData({[ tab.id ]: tab });
  },
  closeWindow({ windowId }) {
    const w = store.state.windows[ windowId ];
    if ( w.closed ) {
      this.removeWindow({ windowId }); // TODO: ask for confirmation if many tabs
    } else {
      b.windows.remove( w.windowId );
      updateView({ op: 'SuspendWindow', windowId });
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
    updateView({ op: 'RemoveWindow', windowId: w.id });
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
          updateView({ op: 'FocusWindow', windowId: w.id });
        }
        saveWindow(w);
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
          updateView({ op: 'FocusWindow', windowId: w.id });
        }
        saveWindow(w);
      });
    }
    updateView({ op: 'ResumeWindow', windowId: w.id });
  },
  attachWindow({ wid, windowId }) {
    const w = store.state.windows[ wid ];
    const win = store.openWindows[ windowId ];
    if ( win ) {
      if ( w.id === win.id )
        return;
      store.clearData(( win.tabIds.map( tid => {
        delete store.state.tabs[ tid ];
        return tid;
      }).concat( win.id )));
      delete store.state.windows[ win.id ];
    }

    store.openWindows[ windowId ] = w;
    w.windowId = windowId;
    saveWindow(w);
  },
  collapseWindow({ windowId }) {
    const w = store.state.windows[ windowId ];
    w.collapsed = !w.collapsed;
    store.setData({ [ w.id ]: w });
    updateView({
      op: 'SetWindowCollapse',
      windowId: w.id,
      collapse:w.collapsed
    });
  },
  addProject({ project, parentId }) {
    const pid = nextProjectId();
    project = fillProject( project, pid );
    store.state.allProjects[ pid ] = project;
    store.state.projectIds.push( pid );
    store.setData({[ pid ]: project });
  },
  removeProject({ projectId }) {
    const pix = store.state.projectIds.indexOf( projectId );
    if ( pix > -1 ) {
      store.state.projectIds.splice( pix, 1 );
      delete store.state.allProjects;
      store.clearData([ projectId ]);
    }
  },
  moveProject({ projectId }) {
  }
  // createTab({ tabId }) {
  // },
  // moveTab({ tabId, windowId, pos }) {
  // }
};
const promptHandlers = {
  removeTab: controller.removeTab,
  closePrompt() {
    console.log( 'closing prompt!', store.prompt );
    if ( store.promptId )
      b.windows.remove( store.promptId );
    // TODO: delete store.controlIds[ store.promptId ];
    store.promptId = null;
    store.prompt.disconnect();
    store.prompt = null;
  }
};

// event handlers
function onConnected( port ) {
  if ( port.name === 'tabcontrol-close-prompt' ) {
    if ( store.prompt ) {
      b.windows.remove( port.sender.tab.windowId );
      return;
    }
    store.prompt = port;
    store.promptId = port.sender.tab.windowId;
    console.log( 'close-prompt connected', store.prompt, store.promptId, port.sender );
    const w = store.openWindows[ port.sender.tab.windowId ];
    if (w) {
      w.isControlPanel = true;
      updateView({ op: 'RemoveWindow', windowId: w.id });
    }
    store.prompt.onMessage.addListener( m => {
      // console.log( 'close-prompt => control', m );
      if ( promptHandlers[ m.op ])
        promptHandlers[ m.op ](m);
      else
        console.warn( `'${ m.op }' not yet implemented` );
    });
    const tabs = store.recentlyClosed.splice(0);
    // console.log( 'close-prompt tabs', tabs, store.recentlyClosed );
    for ( let tab of tabs )
      store.prompt.postMessage({ op: 'showPrompt', tab });
    return;
  }
  if ( port.name === 'tab-control' ) {
    if ( store.port || !store.loaded ) {
      if ( store.panelId && port.sender.tab.windowId !== store.panelId ) {
        b.windows.remove( port.sender.tab.windowId );
        return;
      }
    }
    store.port = port;
    port.onMessage.addListener( m => {
      // console.log( 'panel => control', m );
      if ( controller[ m.op ])
        controller[ m.op ](m);
      else
        console.warn( `'${ m.op }' not yet implemented` );
    });
  }
}
function onWindowCreated( win ) {
  // console.log( 'onWindowCreated', win );
  tabsLoaded().then(() => {
    setTimeout(() => {
      const ow = !store.controlIds[ win.id ] && store.openWindows[ win.id ];
      if ( ow ) {
        if ( ow.openingTab ) {
          b.tabs.query({ windowId: win.id }).then( tabs => {
            controller.attachTab({ tid: ow.openingTab, tabId: tabs[0].id });
          });
        }
        return;
      }
      loadFromUI([ win ]);
      const w = !store.controlIds[ win.id ] && store.openWindows[ win.id ];
      if ( !w ) return;
      store.setData({[ w.id ]: w });
      updateView({ op: 'AddWindow', win: w });
    }, 750 );
  });
}
function onWindowRemoved( winId ) {
  if ( winId < 0 ) return;
  if ( store.panelId && store.panelId === winId ) {
    clearControl();
    return;
  }
  const w = store.openWindows[ winId ];
  if (!w)
    return;
  const windowId = w.id;
  delete store.openWindows[ winId ];
  w.closed = true;
  delete w.windowId;
  saveWindow(w);
  updateView({ op: 'SuspendWindow', windowId });
}
function onWindowFocused( winId ) {
  // console.log( 'onWindowFocused', winId );
  if ( winId < 0 ) return;
  tabsLoaded().then(() => {
    if ( winId === store.panelId ) {
      store.state.controlActive = true;
      updateView({ op: 'FocusControl' });
      return;
    }
    const w = store.openWindows[ winId ];
    if ( !w ) {
      updateView({ op: 'BlurControl' });
      return;
    }
    const windowId = w.id;
    if ( store.state.activeWindow ) {
      const prev = store.state.activeWindow;
      prev.focused = false;
      w.focused = true;
      store.setData({[ prev.id ]: prev, [ w.id ]: w });
    } else {
      const focused = {};
      Object.values( store.state.windows ).forEach( w => {
        if ( w.focused ) {
          w.focused = false;
          focused[ w.id ] = w;
        }
      });
      focused[ w.id ] = w;
      w.focused = true;
      store.setData( focused );
    }
    store.state.activeWindow = w;
    store.state.controlActive = false;
    updateView({ op: 'FocusWindow', windowId });
  });
}
function onTabCreated( tab ) {
  // console.log( 'onTabCreated', tab );
  const tabId = tab.id;
  if ( store.panelTab && store.panelTab === tabId ) {
    // console.log( 'control panel tab, ignoring' );
    return;
  }
  tabsLoaded().then(() => {
    if ( store.openTabs[ tabId ])
      return;
    setTimeout( async () => {
      if ( store.openTabs[ tabId ])
        return;
      tab = await b.tabs.get( tabId );
      const w = store.openWindows[ tab.windowId ];
      if (!w)
        return;
      let pos = -1;
      if ( tab.index >= w.tabIds.length ) {
        tab = fillTab( tab, nextTabId() );
        w.tabIds.push( tab.id );
      } else {
        let potentials = [];
        pos = 0;
        const ins = w.tabIds.findIndex( tid => {
          const t = store.state.tabs[ tid ];
          if ( t.closed )
            potentials.push(t);
          else if ( pos === tab.index )
            return true;
          else {
            ++pos;
            potentials = [];
          }
          return false;
        });
        pos = ins;
        const match = potentials.find( t => t.url === tab.url );
        if ( match ) {
          const tid = match.id;
          match.closed = false;
          Object.assign( match, {
            tabId           : tab.id,
            active          : tab.active,
            icon            : match.icon || tab.favIconUrl,
            attention       : tab.attention,
            audible         : tab.audible,
            autoDiscardable : tab.autoDiscardable,
            discarded       : tab.discarded,
            height          : tab.height,
            hidden          : tab.hidden,
            highlighted     : tab.highlighted,
            incognito       : tab.incognito,
            index           : tab.index,
            isArticle       : tab.isArticle,
            isInReaderMode  : tab.isInReaderMode,
            lastAccessed    : tab.lastAccessed,
            openerTabId     : tab.openerTabId,
            pinned          : tab.pinned,
            sessionId       : tab.sessionId,
            status          : tab.status,
            successorId     : tab.successorId,
            width           : tab.width,
            windowId        : tab.windowId,
            mute: {
              muted     : tab.mutedInfo.muted,
              reason    : tab.mutedInfo.reason,
              extension : tab.mutedInfo.extensionId
            },
          });
          store.openTabs[ tabId ] = match;
          store.setData({[ match.id ]: match });
          updateView({ op: 'ResumeTab', tabId: tid });
          if ( match.active )
            updateView({
              op: 'FocusTab',
              tabId: tid,
              windowId: match.wid
            });
          return;
        }
        tab = fillTab( tab, nextTabId() );
        if ( pos > -1) {
          w.tabIds.splice( pos, 0, tab.id );
        } else {
          w.tabIds.push( tab.id );
        }
      }
      saveWindow(w);

      store.state.tabs[ tab.id ] = tab;
      store.openTabs[ tab.tabId ] = tab;
      store.setData({[ tab.id ]: tab });
      updateView({ op: 'AddTab', tab, pos });
    }, 2000 );
  });
}
function onTabUpdated( tabId, changes ) {
  tabsLoaded().then(() => {
    // console.log( 'onTabUpdated', tabId );
    const tab = store.openTabs[ tabId ];
    if ( !tab ) return;
    Object.assign( tab, changes );
    if ( changes.mutedInfo ) {
      tab.mute = {
        muted: tab.mutedInfo.muted,
        reason: tab.mutedInfo.reason,
        extension: tab.mutedInfo.extensionId
      }
      delete tab.mutedInfo;
    }
    if ( changes.favIconUrl ) {
      tab.icon = tab.favIconUrl;
      delete tab.favIconUrl;
    }
    store.setData({[ tab.id ]: tab });
    tabId = tab.id;
    updateView({ op: 'UpdateTab', tabId, changes, tab });
  });
}
function onTabFocused({ previousTabId, tabId, windowId }) {
  tabsLoaded().then(() => {
    // console.log({ previousTabId, tabId, windowId });
    const prev = store.openTabs[ previousTabId ],
          tab = store.openTabs[ tabId ],
          w = store.openWindows[ windowId ];
    if ( !tab || !w )
      return;
    if ( prev ) {
      previousTabId = prev.id;
      tabId = tab.id;
      windowId = w.id;
      prev.active = false;
      tab.active = true;
      store.setData({ [ prev.id ]: prev, [ tab.id ]: tab });
      updateView({ op: 'FocusTab', previousTabId, tabId, windowId });
    } else {
      tabId = tab.id;
      windowId = w.id;
      tab.active = true;
      store.setData({[ tab.id ]: tab });
      updateView({ op: 'FocusTab', previousTabId, tabId, windowId });
    }
  });
}
function onTabRemoved( tabId, { windowId, isWindowClosing }) {
  const tab = store.openTabs[ tabId ];
  if (! isWindowClosing ) {
    if ( tab ) {
      if ( /^about:/.test( tab.url )
           || store.controlIds[ tab.windowId ]) { // catch anyone who slipped thru
        controller.removeTab({ tabId: tab.id });
      } else {
        if (! tab.closed )
          openClosePrompt( tab );   // ask if user wants to keep
        tab.closed = true;
        tab.active = false;
        delete tab.tabId;
        delete tab.windowId;
        delete store.openTabs[ tabId ];
        store.setData({[ tab.id ]: tab });
        updateView({ op: 'SuspendTab', tabId: tab.id });
      }
    }
  } else if ( tab && store.state.windows[ tab.wid ]
              && !store.controlIds[ tab.wid ]
              && store.state.windows[ tab.wid ].tabs
              && store.state.windows[ tab.wid ].tabs.length === 1 ) {
    if ( /^about:/.test( tab.url )) {
      controller.removeTab({ tabId: tab.id });
    } else if (! tab.closed )
      openClosePrompt( tab );   // ask if user wants to keep
  }
}
function onCommand( command ) {
  switch ( command ) {
  case 'goto-tab-1':
    b.tabs.query({ currentWindow: true, index: 0 }).then( tabs => {
      if ( tabs.length )
        b.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-2':
    b.tabs.query({ currentWindow: true, index: 1 }).then( tabs => {
      if ( tabs.length )
        b.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-3':
    b.tabs.query({ currentWindow: true, index: 2 }).then( tabs => {
      if ( tabs.length )
        b.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-4':
    b.tabs.query({ currentWindow: true, index: 3 }).then( tabs => {
      if ( tabs.length )
        b.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-5':
    b.tabs.query({ currentWindow: true, index: 4 }).then( tabs => {
      if ( tabs.length )
        b.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-6':
    b.tabs.query({ currentWindow: true, index: 5 }).then( tabs => {
      if ( tabs.length )
        b.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-7':
    b.tabs.query({ currentWindow: true, index: 6 }).then( tabs => {
      if ( tabs.length )
        b.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-8':
    b.tabs.query({ currentWindow: true, index: 7 }).then( tabs => {
      if ( tabs.length )
        b.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-last-tab':
    b.tabs.query({ currentWindow: true }).then( tabs => {
      if ( tabs.length )
        b.tabs.update( tabs[ tabs.length - 1 ].id, { active: true });
    });
    break;
  }
}
async function openControlPanel() {
  if ( store.panelId ) {
    b.windows.update( store.panelId, { focused: true });
    return;
  }
  const panelWindow = {
    type: 'detached_panel',
    url: 'popup.html',
    left: 0,
    top: 0,
    width: 320,
    height: window.screen.height,
    allowScriptsToClose: true,
  };
  b.windows.create( panelWindow ).then( w => {
    // console.log( 'control panel:', w );
    if ( w.focused )
      store.state.controlActive = true;
    store.panelId = w.id;
    store.controlIds[ w.id ] = true;
    b.windows.update( w.id, { left: 0, top: 0 });
  });
}

const makeClosePrompt = debounce(() => {
  if ( store.promptOpening ) return;
  store.promptOpening = true;
  // console.log( 'open-close-prompt', store.recentlyClosed );
  const panelWindow = {
    type: 'popup',
    url: 'close-prompt.html',
    left: 0,
    top: 0,
    width: 320,
    height: 152,
    allowScriptsToClose: true,
  };
  b.windows.create( panelWindow ).then( w => {
    store.promptId = w.id;
    store.promptOpening = false;
    store.controlIds[ w.id ] = true;
    console.log( 'close-prompt:', w, store );
  });
}, 300 );

async function openClosePrompt( tab ) {
  if ( store.promptId ) {
    // console.log( 'promptId!', store.promptId );
    b.windows.update( store.promptId, { focused: true });
    store.prompt.postMessage({ op: 'showPrompt', tab });
    return;
  }
  store.recentlyClosed.push( tab );
  makeClosePrompt();
}

function nextProjectId() {
  const lastProjectId = ++store.lastProjectId;
  store.setData({ lastProjectId });
  return `project-${ lastProjectId }`;
}
function nextWindowId() {
  const lastWindowId = ++store.lastWindowId;
  store.setData({ lastWindowId });
  return `window-${ lastWindowId }`;
}
function nextTabId() {
  const lastTabId = ++store.lastTabId;
  store.setData({ lastTabId });
  return `tab-${ lastTabId }`;
}
function urlsToRegexp( urls ) {
  const rxescape = s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  return new RegExp( '^((?:.+\\n)*?)' + urls.map( x => {
    x = `(?:(tab-[0-9]+:::::${ rxescape(x) })\\n((?:.+\\n)*?))?`;
    return x;
  }).join( '' ) + '$');
}
window.urlsToRegexp = urlsToRegexp;
function windowDiff( storedWindow, uiWindow ) {
  const parseData = ( m, tabs ) => {
    const found = [],
          closed = [],
          unknown = [];
    let foundCount = 0,
        closedCount = 0;
    let lastTab = null;
    m.forEach(( x, i ) => {
      if ( !i ) return;
      if (( i % 2 ) === 0 ) {
        const j = i / 2 - 1;
        if (x) {
          const [ tid, url ] = x.split( ':::::' );
          found.push({ tid, tabId: tabs[j].tabId });
          ++foundCount;
        } else {
          unknown.push([ lastTab, tabs[j] ]);
        }
        lastTab = tabs[j].tabId;
      } else if (x) {
        let urls = x.split( '\n' );
        urls.pop();
        urls = urls.map( y => y.split( ':::::' ));
        closed.push.apply( closed, urls );
        closedCount += urls.length;
      }
    });
    // console.log({ m, found, closed, unknown, foundCount, closedCount });
    return { found, closed, unknown, foundCount, closedCount };
  };
  const rx = uiWindow.tabsMatch;
  const open = storedWindow.openUrls.match( rx );
  const all = storedWindow.allUrls.match( rx );
  // console.log({ rx, open, all });
  const tabs = uiWindow.tabIds.map( t => store.state.tabs[t] );
  let d = parseData( open, tabs ),
      allData;
  if ( d.foundCount < uiWindow.tabIds.length ) {
    allData = parseData( all, tabs );
    if ( allData.foundCount > d.foundCount )
      d = allData;
    else
      allData = null;
  }
  const reopen = [];
  if ( d.foundCount === uiWindow.tabIds.length && d.closedCount === 0 ) {
    if ( allData )
      d.found.forEach(({ tid }) => {
        if ( store.state.tabs[ tid ].closed )
          reopen.push( tid );
      });
    else return [[ 'attach', d.found ]];                // exact match
  }
  const out = [[ 'attach', d.found ]].concat(
    reopen.length ? [[ 'reopen', reopen ]] : []);
  if ( allData ) {
    d.closed.forEach(([ tid, url ]) => {
      const tab = store.state.tabs[ tid ];
      if ( !tab.closed )
        out.push([ 'close', tid ])
    });
  } else {
    d.closed.forEach(([ tid, url ]) => {
      out.push([ 'close', tid ])
    });
  }
  d.unknown.forEach(([ after, insert ]) => {
    out.push([ 'new', after, insert ]);
  });
  return out;
}
function fillProject( p, id ) {
  return Object.assign({
    id,
    name: 'untitled',
    windowIds: [],
    projectIds: [],
    // tabIds: []   // TODO: this
  }, p );
}
async function fillWindow(w) {
  try {
    var winStr = '' + w;
  } catch (e) {
    console.warn('fillWindow error', e );
    return null;
  }
  // if ( store.panelId && store.panelId == w.id )
  if ( store.controlIds[ w.id ])
    return null;
  const win = {
    windowId: w.id,
    pid: w.pid || 'project-0',
    focused: w.focused,
    collapsed: true,
    title: w.title || 'Window',
    alwaysOnTop: w.alwaysOnTop,
    height: w.height,
    incognito: w.incognito,
    left: w.left,
    sessionId: w.sessionId,
    state: w.state,
    top: w.top,
    type: w.type,
    width: w.width,
  };
  const urls = [];
  const tabIds = ( await b.tabs.query({ windowId: w.id })).map( t => {
    urls.push( t.url );
    const tab = fillTab( t, nextTabId() );
    store.state.tabs[ tab.id ] = tab;
    return tab.id;
  });
  win.tabIds = tabIds;
  win.tabsMatch = urlsToRegexp( urls );
  return win;
}
function fillTab( tab, id ) {
  const w = store.openWindows[ tab.windowId ];
  return {
    id,
    tabId: tab.id,
    wid: w ? w.id : null,
    active: tab.active,
    url: tab.url,
    icon: tab.favIconUrl,
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
  };
}
function updateWindow( wid, windowId, diff ) {
  const w = store.state.windows[ wid ];
  if ( w.windowId !== windowId ) {
    w.windowId = windowId;
    // updateView({ op: 'SetWindowId', wid, windowId });
  }
  delete w.closed;
  store.openWindows[ windowId ] = w;
  diff.forEach(( store.port && store.sendUpdates ) ? ( op ) => {
    let tab, tid, _, after, insert;
    switch ( op[0] ) {
    case 'attach':
      op[1].forEach(({ tid, tabId }) => {
        if (!store.state.tabs[ tid ]) {
          console.warn( `tab "${tid}" does not exist!` );
          return;
        }
        store.state.tabs[ tid ].tabId = tabId;
        store.openTabs[ tabId ] = store.state.tabs[ tid ];
        // updateView({ op: 'AttachTab', tid, tabId });
      })
      break;
    case 'reopen':
      op[1].forEach( tid => {
        tab = store.state.tabs[ tid ];
        delete tab.closed;
        updateView({ op: 'ResumeTab', tid });
      });
      break;
    case 'close':
      tid = op[1];
      tab = store.state.tabs[ tid ];
      tab.closed = true;
      updateView({ op: 'SuspendTab', tid });
      break;
    case 'new':
      [ _, after, insert ] = op;
      tab = Object.assign({}, insert );
      tab.id = nextTabId();
      store.state.tabs[ tab.id ] = tab;
      store.openTabs[ insert.tabId ] = tab;
      store.setData({ [ tab.id ]: tab });
      after = store.openTabs[ after ];
      updateView({ op: 'AddTab', tab, after });
      break;
    }
  } : ( op ) => {
    let tab, tid, _, after, insert;
    switch ( op[0] ) {
    case 'attach':
      op[1].forEach(({ tid, tabId }) => {
        if (!store.state.tabs[ tid ]) {
          console.warn( `tab "${tid}" does not exist!` );
          return;
        }
        store.state.tabs[ tid ].tabId = tabId;
        store.openTabs[ tabId ] = store.state.tabs[ tid ];
      })
      break;
    case 'reopen':
      op[1].forEach( tid => {
        tab = store.state.tabs[ tid ];
        delete tab.closed;
      });
      break;
    case 'close':
      tid = op[1];
      tab = store.state.tabs[ tid ];
      tab.closed = true;
      break;
    case 'new':
      [ _, after, insert ] = op;
      tab = Object.assign({}, insert );
      tab.id = nextTabId();
      store.state.tabs[ tab.id ] = tab;
      store.openTabs[ tab.tabId ] = tab;
      store.setData({ [ tab.id ]: tab });
      break;
    }
  })
}
function saveWindow( w ) {
  // FIXME: please!
  const w2 = Object.assign({}, w );
  delete w2.tabs;
  delete w2.tabsMatch;
  if ( !store.state.windows[ w.id ])
    store.state.windows[ w.id ] = w;
  if ( !store.openWindows[ w.windowId ])
    store.openWindows[ w.windowId ] = w;
  // console.log( 'saving', { [ w.id ]: w2 });
  store.setData({[ w.id ]: w2 });
}
window.saveWindow = saveWindow;

function addWindow(w) {
  const p = store.state.allProjects[ w.pid ];
  w.id = nextWindowId();
  if ( store.windowIds.indexOf( w.id ) > -1 )
    console.warn( 'Re-adding window. Should Not Happen.' );
  else
    store.windowIds.push( w.id );
  if ( p.windowIds.indexOf( w.id ) > -1 )
    console.warn( 'Re-adding window to project. Should Not Happen.' );
  else
    p.windowIds.push( w.id );
  const pos = p.windowIds.indexOf( w.id );
  const tabs = w.tabIds.forEach( tid => {
    const t = store.state.tabs[ tid ];
    t.wid = w.id;
    store.openTabs[ t.tabId ] = t;
    store.setData({ [ tid ]: t });
    return t;
  });
  saveWindow(w);
  store.setData({ windowIds: store.windowIds });
  updateView({ op: 'AddWindow', win: w, tabs, pos });
}

let loadedTimer = null;
// let reject = new Promise(( r, j ) => j() );
let _tabsLoaded = false;
function tabsLoaded() {
  if ( _tabsLoaded ) return _tabsLoaded;
  _tabsLoaded = new Promise( r => {
    let updateDebounce = null;
    const resolve = async () => {
      b.tabs.onUpdated.removeListener( updateDebounce );
      await store.loadFromStorage();
      if ( store.controlPanelOpen )
        openControlPanel();
      await loadFromUI();
      r();
    };
    updateDebounce = () => {
      if ( loadedTimer != null ) {
        clearTimeout( loadedTimer );
        loadedTimer = setTimeout( resolve, 1000 );
      }
    };
    loadedTimer = setTimeout( resolve, 1000 );
    b.tabs.onUpdated.addListener( updateDebounce );
  });
  return _tabsLoaded;
}
async function loadFromUI( ws ) {
  // console.log( 'loadFromUI', ws );
  const closeEnough = ( tabs, diffs ) => ( diffs < 5 && tabs / diffs > 2 );
  const windows = ( await Promise.all((
    ws || await b.windows.getAll()).map( fillWindow ))).filter( w => w );
  // get stored urls
  let storedWindows = store.windowIds
      .reduce(( lists, wid ) => {
        const w = store.state.windows[ wid ];
        let openUrls = '',
            allUrls = '';
        w.tabIds.forEach( tid => {
          const t = store.state.tabs[ tid ];
          if ( !b.closed )
            openUrls += `${ t.id }:::::${ t.url }\n`;
          allUrls += `${ t.id }:::::${ t.url }\n`;
        });
        const open = !w.closed;
        lists[ open ? 1 : 0 ].push({
          wid,
          open,
          tabs: w.tabIds.map( tid => ({
            tid,
            url: ( store.state.tabs[ tid ]
                   && store.state.tabs[ tid ].url )
          })),
          openUrls,
          allUrls,
        });
        return lists;
      }, [ [], [] ])
      .flat();
  const remainKeys = {},
        unmatchedKeys = {};
  let matches = [],
      scores = [],
      pairs = {},
      remainCount = 0,
      unmatchedCount = 0;
  let remaining = storedWindows;
  let unmatched = windows.filter( uiWindow => {
    let matched = false;
    remaining = remaining.filter( storedWindow => {
      if ( matched ) return true;
      let pair = {
        wid: storedWindow.wid,
        windowId: uiWindow.windowId
      };
      let diff = windowDiff( storedWindow, uiWindow );
      const score = diff.length;
      if ( score === 1 ) {                 // then windows match exactly
        matched = true;
        matches.push({ pair, diff });
        return false;
      } else {
        if ( !pairs[ score ]) {
          pairs[ score ] = []
          scores.push( score );
        }
        pairs[ score ].push({ pair, diff });
        return true;
      }
    });
    return !matched;
  });
  unmatchedCount = unmatched.length;
  unmatched.forEach( w => {
    unmatchedKeys[ w.windowId ] = w;
  });
  remainCount = remaining.length;
  remaining.forEach( w => {
    remainKeys[ w.wid ] = w;
  });
  // TODO: optimize with breadth-first range-limted searches
  //       (202001041921) maybe
  const nearMatches = [];
  scores = scores.sort();
  scores.forEach( score => {
    if (!unmatchedCount || !remainCount )
      return;
    const options = pairs[ score ];
    options.forEach(({ pair:{ wid, windowId }, diff }) => {
      // console.log({ wid, windowId, remainKeys, unmatchedKeys });
      if ( !( wid in remainKeys ) || !( windowId in unmatchedKeys ))
        return;
      const uiWindow = unmatchedKeys[ windowId ];
      if ( closeEnough( uiWindow.tabIds.length, diff.length - 1 )) {
        delete remainKeys[ wid ];
        delete unmatchedKeys[ windowId ];
        --remainCount;
        --unmatchedCount;
        nearMatches.push({ wid, windowId, diff });
      }
    });
  });
  unmatched = unmatched.filter( x => unmatchedKeys[ x.windowId ]);
  remaining = remaining.filter( x => remainKeys[ x.wid ]);
  // console.log({ matches, nearMatches, unmatched, scores, pairs });
  matches.forEach(
    ({ pair: { wid, windowId }, diff }) => updateWindow( wid, windowId, diff ));
  nearMatches.forEach(
    ({ wid, windowId, diff }) => updateWindow( wid, windowId, diff ));
  unmatched.forEach( addWindow );
  if ( !ws ) {
    const tabs = {};
    remaining.forEach(({ wid }) => {
      const w = store.state.windows[ wid ];
      w.closed = true;
      delete w.windowId;
      w.tabIds.forEach( tid => {
        const t = store.state.tabs[ tid ];
        delete t.tabId;
        delete t.windowId;
        tabs[ tid ] = t;
      });
      saveWindow(w);
    });
    if ( Object.keys( tabs ).length )
      store.setData( tabs );
  }
}
( async () => {
  b.browserAction.onClicked.addListener( openControlPanel );
  b.runtime.onConnect.addListener( onConnected );
  await tabsLoaded();
  b.windows.onCreated.addListener( onWindowCreated );
  b.windows.onRemoved.addListener( onWindowRemoved );
  b.windows.onFocusChanged.addListener( onWindowFocused );
  b.tabs.onCreated.addListener( onTabCreated );
  b.tabs.onUpdated.addListener( onTabUpdated );
  b.tabs.onRemoved.addListener( onTabRemoved );
  b.tabs.onActivated.addListener( onTabFocused );
  if ( b.commands )
    b.commands.onCommand.addListener( onCommand );
})();
