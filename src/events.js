import store from '@/data'
import { controlPanel as cp, closePrompt } from '@/controllers'
import { loadFromUI } from '@/actions'

export async function onWindowCreated( win ) {
  // console.log( 'onWindowCreated', win );
  if ( store.controlIds[ win.id ])
    return;
  await ready();
  if ( store.controlIds[ win.id ])
    return;
  setTimeout(() => {
    if ( store.controlIds[ win.id ])
      return;
    loadFromUI([ win ]);
    const w = !store.controlIds[ win.id ] && store.openWindows[ win.id ];
    if ( !w ) return;
    win = store.save(w)
    cp.post({ op: 'AddWindow', win });
  }, 750 );
}

export function onWindowRemoved( winId ) {
  if ( winId < 0 ) return;
  if ( store.controlIds[ winId ]) {
    store.controlIds[ winId ].onClose();
  }
  const w = store.openWindows[ winId ];
  if (!w)
    return;
  const windowId = w.id;
  delete store.openWindows[ winId ];
  w.closed = true;
  w.windowId = null;
  store.save(w);
  cp.post({ op: 'SuspendWindow', windowId });
}

export async function onWindowFocused( winId ) {
  // console.log( 'onWindowFocused', winId );
  if ( winId < 0 ) return;
  await ready();
  if ( winId === cp.windowId ) {
    store.state.controlActive = true;
    cp.post({ op: 'FocusControl' });
    return;
  }
  const w = store.openWindows[ winId ];
  if ( !w ) {
    cp.post({ op: 'BlurControl' });
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
    store.saveAll(Object.values( focused ));
  }
  store.state.activeWindow = w;
  store.state.controlActive = false;
  cp.post({ op: 'FocusWindow', windowId });
}

export async function onTabCreated( tab ) {
  // console.log( 'onTabCreated', tab );
  const tabId = tab.id;
  if ( store.controlTabIds[ tabId ]) {
    // console.log( 'control panel tab, ignoring' );
    return;
  }
  await ready();
  if ( store.openTabs[ tabId ])
    return;
  setTimeout( async () => {
    if ( store.openTabs[ tabId ])
      return;
    tab = await browser.tabs.get( tabId );
    const w = store.openWindows[ tab.windowId ];
    if (!w)
      return;
    let pos = -1;
    if ( tab.index >= w.tabIds.length ) {
      tab = store.addTab( tab );
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
        store.save( match );
        cp.post({ op: 'ResumeTab', tabId: tid });
        if ( match.active )
          cp.post({
            op: 'FocusTab',
            tabId: tid,
            windowId: match.wid
          });
        return;
      }
      store.addTab( tab, w, pos );
    }
    store.state.tabs[ tab.id ] = tab;
    store.openTabs[ tab.tabId ] = tab;
    tab = store.saveAll([ w, tab ])[ tab.id ];
    cp.post({ op: 'AddTab', tab, pos });
  }, 2000 );
}

export async function onTabUpdated( tabId, changes ) {
  await ready();
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
  store.save( tab );
  tabId = tab.id;
  cp.post({ op: 'UpdateTab', tabId, changes, tab });
}

export async function onTabFocused({ previousTabId, tabId, windowId }) {
  await ready();
  // console.log({ previousTabId, tabId, windowId });
  const prev = store.openTabs[ previousTabId ];
  const tab = store.openTabs[ tabId ];
  const w = store.openWindows[ windowId ];
  if ( !tab || !w )
    return;
  if ( prev ) {
    previousTabId = prev.id;
    tabId = tab.id;
    windowId = w.id;
    prev.active = false;
    tab.active = true;
    store.saveAll([ prev, tab ]);
    cp.post({ op: 'FocusTab', previousTabId, tabId, windowId });
  } else {
    tabId = tab.id;
    windowId = w.id;
    tab.active = true;
    store.save( tab );
    cp.post({ op: 'FocusTab', previousTabId, tabId, windowId });
  }
}
export function onTabRemoved( tabId, { windowId, isWindowClosing }) {
  const tab = store.openTabs[ tabId ];
  if ( !tab ) return
  if ( isWindowClosing && !(
    store.state.windows[ tab.wid ]
       && !store.controlIds[ tab.wid ]
       && store.state.windows[ tab.wid ].tabIds
       && store.state.windows[ tab.wid ].tabIds.length === 1 ))
    return;
  const todo =  store.autoRemoveTab( tab )
  switch ( todo ) {
  case 'remove':
    cp.removeTab({ tabId: tab.id });
    return;
  case 'keep':
    break;
  case 'ask':
  default:
    if (! tab.closed ) {
      if ( closePrompt.ready )
        closePrompt.add( tab );
      else {
        store.recentlyClosed.push( tab );
        closePrompt.open();
      }
    }
  }
  tab.close();
  delete store.openTabs[ tabId ];
  store.save( tab );
  cp.post({ op: 'SuspendTab', tabId: tab.id });
}

export function onCommand( command ) {
  switch ( command ) {
  case 'goto-tab-1':
    browser.tabs.query({ currentWindow: true, index: 0 }).then( tabs => {
      if ( tabs.length )
        browser.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-2':
    browser.tabs.query({ currentWindow: true, index: 1 }).then( tabs => {
      if ( tabs.length )
        browser.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-3':
    browser.tabs.query({ currentWindow: true, index: 2 }).then( tabs => {
      if ( tabs.length )
        browser.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-4':
    browser.tabs.query({ currentWindow: true, index: 3 }).then( tabs => {
      if ( tabs.length )
        browser.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-5':
    browser.tabs.query({ currentWindow: true, index: 4 }).then( tabs => {
      if ( tabs.length )
        browser.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-6':
    browser.tabs.query({ currentWindow: true, index: 5 }).then( tabs => {
      if ( tabs.length )
        browser.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-7':
    browser.tabs.query({ currentWindow: true, index: 6 }).then( tabs => {
      if ( tabs.length )
        browser.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-tab-8':
    browser.tabs.query({ currentWindow: true, index: 7 }).then( tabs => {
      if ( tabs.length )
        browser.tabs.update( tabs[0].id, { active: true });
    });
    break;
  case 'goto-last-tab':
    browser.tabs.query({ currentWindow: true }).then( tabs => {
      if ( tabs.length )
        browser.tabs.update( tabs[ tabs.length - 1 ].id, { active: true });
    });
    break;
  }
}

let loadedTimer = null;
// let reject = new Promise(( r, j ) => j() );

let _tabsLoaded = false;
export function ready() {
  if ( _tabsLoaded ) return _tabsLoaded;
  _tabsLoaded = new Promise( r => {
    let updateDebounce = null;
    const resolve = async () => {
      browser.tabs.onUpdated.removeListener( updateDebounce );
      await store.loadFromStorage();
      if ( store.controlPanelOpen ) {
        cp.open();
      }
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
    browser.tabs.onUpdated.addListener( updateDebounce );
  });
  return _tabsLoaded;
}

export default {
  onWindowCreated,
  onWindowRemoved,
  onWindowFocused,
  onTabCreated,
  onTabUpdated,
  onTabFocused,
  onTabRemoved,
  onCommand,
  ready
}
