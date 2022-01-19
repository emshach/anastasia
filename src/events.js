import store from '@/data'
import { controlPanel as cp, closePrompt } from '@/controllers'
import { loadFromUI, focusWindow, ready as actionReady } from '@/actions'
import { findOpenPos } from '@/util'
import logger from '@/lib/logger'
import { Window } from '@/models'

const TAB_UPDATE_DELAY = 500;

export const pendingWindows = {};
export const ready = actionReady;

async function internWindow( windowId ) {
  delete pendingWindows[ windowId ];
  if ( store.controlIds[ windowId ])
    return;
  if ( store.openWindows[ windowId ]) return
  let win = await browser.windows.get( windowId )
  logger.log( 'internWindow', win );
  await loadFromUI([ await Window.normalize( win )]);
  const w = !store.controlIds[ windowId ] && store.openWindows[ windowId ];
  if ( !w ) return;
  win = store.save(w)
  cp.send( 'AddWindow', { win });
}

async function _debounceTabWindow({ tabId, tab, windowId }) {
  await new Promise( r => setTimeout( r, 500 ));
  logger.log( 'debounce', { tabId, tab, windowId })
  if ( !windowId ) {
    if ( !tab ) {
      if ( !tabId ) return;
      tab = await browser.tabs.get( tabId );
      if ( !tab ) return;
    }
    if ( !tab.windowId ) return;
    windowId = tab.windowId;
  }
  if ( !pendingWindows[ windowId ]) return;
  const { timer } = pendingWindows[ windowId ];
  logger.log({ timer, windowId });
  clearTimeout( timer );
  pendingWindows[ windowId ] = {
    timer: setTimeout(() => internWindow( windowId ), 1500 ),
  };
}

export async function onWindowCreated( win ) {
  logger.log( 'onWindowCreated', { win, windowId: win.id });
  const windowId = win.id;
  if ( store.controlIds[ windowId ])
    return;
  await ready();
  if ( store.controlIds[ windowId ])
    return;
  if ( pendingWindows[ windowId ])
    clearTimeout( pendingWindows[ windowId ].timer )
  pendingWindows[ windowId ] = {
    timer: setTimeout(() => internWindow( windowId ), 1000 ),
  };
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
  cp.send( 'SuspendWindow', { windowId });
}

export async function onWindowFocused( windowId ) {
  logger.log( 'onWindowFocused', windowId );
  focusWindow( windowId );
}

export async function onTabActivated({ previousTabId, tabId, windowId }) {
  await ready();
  logger.log( 'onTabActivated', { previousTabId, tabId, windowId });
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
    cp.send( 'FocusTab', { previousTabId, tabId, windowId });
  } else {
    const updates = [];
    w.tabList.forEach( t => {
      if ( t !== tab && t.active ) {
        t.active = false;
        updates.push(t);
      }
    });
    tabId = tab.id;
    windowId = w.id;
    tab.active = true;
    updates.push( tab )
    store.saveAll( updates );
    cp.send( 'FocusTab', { tabId, windowId });
  }
}

export async function onTabAttached( tabId, { newWindowId, newPosition }) {
  await ready();
  logger.log( 'onTabAttached', { tabId, newWindowId, newPosition });
  const tab = store.openTabs[ tabId ];
  const w = store.openWindows[ newWindowId ];
  if ( !tab || !w )
    return;
  tabId = tab.id;
  tab.index = newPosition;
  const oldw = store.state.windows[ tab.wid ];
  const pos = findOpenPos( w, newPosition );
  w.addTab( tab, pos );
  if ( oldw.id in store.state.windows )
    cp.send( 'UpdateWindow', { windowId: oldw.id, changes: { tabIds: oldw.tabIds }});
  else
    cp.send( 'RemoveWindow', { windowId: oldw.id });
  cp.send( 'UpdateTab', { tabId, changes: { detached: false, wid: w.id }});
  cp.send( 'AddTab', { tab, pos });
}

export async function onTabCreated( tab ) {
  logger.log( 'onTabCreated', tab );
  const tabId = tab.id;
  if ( store.controlTabIds[ tabId ]) {
    // logger.log( 'control panel tab, ignoring' );
    return;
  }
  await ready();
  _debounceTabWindow({ tab });
  if ( store.openTabs[ tabId ])
    return;
  setTimeout( async () => {
    if ( store.openTabs[ tabId ])
      return;
    tab = await browser.tabs.get( tabId );
    const w = store.openWindows[ tab.windowId ];
    if (!w)
      return;
    logger.log( 'processing onTabCreated', tab, w );
    let pos = -1;
    if ( tab.index >= w.tabIds.length ) {
      tab = store.addTab( tab, w, pos );
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
        match.update({
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
        cp.send( 'ResumeTab', { tabId: tid });
        if ( match.active )
          cp.send( 'FocusTab', {
            tabId: tid,
            windowId: match.wid
          });
        return;
      }
      tab = store.addTab( tab, w, pos );
    }
    tab = store.saveAll([ w, tab ])[ tab.id ];
    cp.send( 'AddTab', { tab, pos });
    const icon = store.state.icons[ tab.iconid ];
    if ( icon ) {
      cp.send( 'AddIcon', { icon: icon.toJson() });
    }
  }, TAB_UPDATE_DELAY );
}

export async function onTabDetached( tabId, { oldWindowId, oldPosition }) {
  await ready();
  logger.log( 'onTabDetached', { tabId, oldWindowId, oldPosition });
  const tab = store.openTabs[ tabId ];
  if ( !tab ) return;
  tabId = tab.id;
  cp.send( 'UpdateTab', { tabId, changes: { detached: true }})
}

export async function onTabHighlighted({ windowId, tabIds }) {
  if ( tabIds.length === 1 ) return;
  await ready();
  const tabs = {};
  const updates = [];
  const w = store.openWindows[ windowId ];
  if (!w) return;
  tabIds.forEach( tid => {
    const tab = store.openTabs[ tid ];
    if ( !tab ) return;
    if ( tab.highlighted ) {
      tabs[ tab.id ] = true;
      return;
    }
    cp.send( 'UpdateTab', { tabId: tab.id, changes: { highlighted: true }});
    tabs[ tab.id ] = true;
    tab.highlighted = true;
    updates.push( tab );
  });
  w.tabIds.forEach( tid => {
    const tab = store.state.tabs[ tid ];
    if ( tabs[ tid ] || !tab || !tab.highlighted ) return;
    cp.send( 'UpdateTab', { tabId: tab.id, changes: { highlighted: false }});
    tab.highlighted = false;
    updates.push( tab );
  });
  store.saveAll( updates );
}

export async function onTabMoved( tabId, { windowId, fromIndex, toIndex }) {
  await ready();
  logger.log( 'onTabMoved', { tabId, windowId, fromIndex, toIndex });
  const tab = store.openTabs[ tabId ];
  if ( !tab ) return;
  tab.index = toIndex;
  const w = store.state.windows[ tab.wid ];
  windowId = w.id;
  const tabIds = w.tabIds;
  tabIds.splice( tabIds.indexOf( tab.id ), 1 );
  tabIds.splice( findOpenPos( w, toIndex ), 0, tab.id );
  cp.send( 'UpdateWindow', { windowId, changes: { tabIds }})
}

export async function onTabRemoved( tabId, { windowId, isWindowClosing }) {
  await ready();
  logger.log( 'onTabRemoved', { tabId, windowId, isWindowClosing });
  const tab = store.openTabs[ tabId ];
  const w = store.openWindows[ windowId ];
  if ( !tab || !w ) return;
  if ( isWindowClosing && !(
    store.state.windows[ tab.wid ]
       && !store.controlIds[ tab.wid ]
       && store.state.windows[ tab.wid ].tabIds
       && store.state.windows[ tab.wid ].tabIds.length === 1 ))
    return;
  const todo = store.autoRemoveTab( tab )
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
  store.cleanupWindow(w);
  cp.send( 'SuspendTab', { tabId: tab.id });
}

export async function onTabReplaced( tabId, { addedTabId, removedTabId }) {
  await ready();
  // TODO: this
}

export async function onTabUpdated( tabId, changes ) {
  await ready();
  logger.log( 'onTabUpdated', tabId );
  _debounceTabWindow({ tabId });
  const tab = store.openTabs[ tabId ];
  if ( !tab ) return;
  tab.update( changes );
  store.save( tab );
  tabId = tab.id;
  // const { favIconUrl, mutedInfo, ...data } = changes
  cp.send( 'UpdateTab', { tabId, changes, tab: tab.toJson() });
  const icon = store.state.icons[ tab.iconid ];
  if ( icon ) {
    cp.send( 'AddIcon', { icon: icon.toJson() });
  }
}

export async function onTabZoomChanged({ tabId, newZoomFactor, zoomSettings }) {
  await ready();
  // TODO: this
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

export default {
  onWindowCreated,
  onWindowRemoved,
  onWindowFocused,
  onTabActivated,
  onTabAttached,
  onTabCreated,
  onTabDetached,
  onTabHighlighted,
  onTabMoved,
  onTabRemoved,
  onTabUpdated,
  onTabZoomChanged,
  onCommand,
  ready
}
