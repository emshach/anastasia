import store from '@/data'
import logger from '@/lib/logger'
import { controlPanel as cp } from '@/controllers'
import { windowDiff } from '@/util'
import { Window, Tab } from '@/models'

let loadedTimer = null;
// let reject = new Promise(( r, j ) => j() );
let _tabsLoaded = false;
export function ready() {
  if ( _tabsLoaded ) return _tabsLoaded;
  _tabsLoaded = new Promise( r => {
    store.init();
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

export async function focusWindow( winId, delayed ) {
  logger.log( 'focusWindow', winId );
  if ( winId < 0 ) return;
  await ready();
  const updates = {}
  let update = false;
  const controlActive = ( winId === cp.windowId );
  if ( controlActive !== store.state.controlActive ) {
    updates.controlActive = controlActive;
    update = true;
  }
  const w = store.openWindows[ winId ];
  if ( !w ) {
    if ( update ) {
      store.update( updates );
      cp.send( 'update', updates );
    }
    return;
  }
  const activeWindow = w.id;
  if ( store.state.activeWindow &&
       store.state.activeWindow === activeWindow ) {
    if ( update ) {
      store.update( updates );
      cp.send( 'update', updates );
    }
    return;
  }
  updates.activeWindow = activeWindow
  store.update( updates );
  if ( delayed ) {
    setTimeout(() => { cp.send( 'update', updates ); }, 200 )
    // FIXME: ugh, but it works
  } else {
    cp.send( 'update', updates );
  }
}

export async function updateWindow( storedWindow, testWindow, diff, open ) {
  // logger.log( 'updateWindow', { storedWindow, testWindow, diff, open });
  const win = storedWindow;
  const test = testWindow;
  let resume = false;
  const updates = { projects: {}, windows: {}, tabs: {} };
  if ( test.windowId && win.windowId !== test.windowId ) {
    win.windowId = test.windowId;
    // post({ op: 'SetWindowId', wid, windowId });
  }
  if ( !testWindow.closed ) {
    if ( testWindow.windowId ) { // TODO: && windows.get(id)
      store.openWindows[ testWindow.windowId ] = win;
    } else if ( open ) {
      resume = true;
    }
  }
  diff.forEach( op => {
    let tab, tabId, after, insert, pos;
    switch ( op[0] ) {
    case 'attach':
      op[1].forEach(({ tid, tabId }) => {
        if (!store.state.tabs[ tid ]) {
          logger.warn( `tab "${tid}" does not exist!` );
          return;
        }
        if ( tabId ) {
          tab = store.state.tabs[ tid ]
          store.state.tabs[ tid ].tabId = tabId;
          if ( store.openTabs[ tabId ])
            store.removeTab( store.openTabs[ tabId ] );
          store.openTabs[ tabId ] = tab;
          // cp.send( 'AttachTab', { tid, tabId });
          updates.tabs[ tid ] = tab.toDisplay();
        }
      })
      break;
    case 'reopen':
      op[1].forEach( tabId => {
        tab = store.state.tabs[ tabId ];
        tab.closed = false;
        // cp.send( 'ResumeTab', { tabId });
        updates.tabs[ tabId ] = tab.toDisplay();
      })
      break;
    case 'close':
      tabId = op[1];
      tab = store.state.tabs[ tabId ];
      tab.closed = true;
      // cp.send( 'SuspendTab', { tabId });
      updates.tabs[ tabId ] = tab.toDisplay();
      break;
    case 'new':
      [ after, insert ] = op.slice(1);
      pos = win.tabIds.indexOf( after );
      pos = pos > -1 ? pos + 1 : -1;
      insert.wid = null;
      tab = Tab.normalize( insert )
      win.addTab( tab, pos );
      // cp.send( 'AddTab', { tab: tab.toJson(), win, pos });
      updates.windows[ win.id ] = { tabIds: win.tabIds };
      updates.tabs[ tab.id ] = tab.toDisplay();
      if ( !tab.closed  && !tab.tabId ) {
        cp.resumeTab({ tabId: tab.id })
      }
      break;
    }
  });
  if ( !win.pid ) {
    const p = store.state.projects[ 'project-0' ];
    p.addWindow( win );
  }
  updates.projects[ win.project.id ] = {
    windowIds: win.project.windowIds
  };
  cp.send( 'update', updates );
  if ( test !== win ) {
    if ( test.project )
      test.project.removeWindow( test );
    const wid = test.id;
    store.state.remove( test );
    store.clearData([ wid ]);
  }
  if ( resume && win.closed ) {
    cp.resumeWindow({ windowId: win.id });
  } else if ( test.focused ) {
    focusWindow( win.windowId, true )
  }
}

export async function addWindow( win ) {
  win = ( await store.addWindow( win ));
  const w = win.toDisplay();
  const tabs = win.tabList.map( t => t.toDisplay() );
  let p = store.state.projects[ win.pid ];

  if (p) {
    const pos = p.windowIds.indexOf( win.id );
    if ( pos < 0 ) {
      p.windowIds.push( win.id );
    }
  } else {
    p = store.state.projects[ 'project-0' ];
    p.addWindow( win )
  }
  cp.send( 'update', {
    projects: {[ p.id ]: { windowIds: p.windowIds }},
    windows: {[ win.id ]: w },
    tabs,
  })
  return win;
}

export async function syncWindows( ws, reopen ) {
  logger.log( 'syncWindows', { ws, reopen });
  const closeEnough = ( tabs, diffs ) => ( tabs / diffs > 3 );
  // get stored urls
  const storedWindows = store.state.windowIds.reduce(( lists, wid ) => {
    const w = store.state.windows[ wid ];
    let openUrls = '';
    let allUrls = '';
    w.tabIds.forEach( tid => {
      const t = store.state.tabs[ tid ];
      if (!t) return;
      if ( !t.closed )
        openUrls += `${ t.id }:::::${ t.url }\n`;
      allUrls += `${ t.id }:::::${ t.url }\n`;
    });
    lists[ w.closed ? 0 : 1 ].push({
      open,
      wid,
      w,
      tabs: w.tabIds.map( tid => ({
        tid,
        url: ( store.state.tabs[ tid ]
               && store.state.tabs[ tid ].url ),
        active: ( store.state.tabs[ tid ]
                  && store.state.tabs[ tid ].active )
      })),
      openUrls,
      allUrls,
    });
    return lists;
  }, [ [], [] ]).flat();

  const windows = await ws();
  logger.log({ windows, storedWindows });
  const remainKeys = {};
  const unmatchedKeys = {};
  const matches = [];
  const pairs = {};
  let scores = [];
  let remainCount = 0;
  let unmatchedCount = 0;
  let remaining = storedWindows;
  let unmatched = windows.filter( testWindow => {
    let matched = false;
    remaining = remaining.filter( storedWindow => {
      if ( matched ) return true;
      const diff = windowDiff( storedWindow, testWindow );
      storedWindow = storedWindow.w;
      const pair = { storedWindow, testWindow };
      const score = diff.length;
      if ( score === 1 ) {                 // then windows match exactly
        matched = true;
        matches.push({ pair, diff });
        return false;
      } else {
        if ( !pairs[ score ]) {
          pairs[ score ] = [];
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
    unmatchedKeys[ w.id ] = w;
  });
  remainCount = remaining.length;
  remaining.forEach( w => {
    remainKeys[ w.wid ] = w;
  });
  // TODO: optimize with breadth-first range-limted searches
  //       (202001041921) maybe
  const nearMatches = [];
  scores = scores.sort();
  for ( const score of scores ) {
    if ( !unmatchedCount || !remainCount )
      break;
    const options = pairs[ score ];
    for ( const { pair:{ storedWindow, testWindow }, diff } of options ) {
      // logger.log({ wid, windowId, remainKeys, unmatchedKeys });
      if ( !( storedWindow.id in remainKeys )
           || !( testWindow.id in unmatchedKeys ))
        continue;
      if ( closeEnough( testWindow.tabIds.length, diff.length - 1 )) {
        delete remainKeys[ storedWindow.id ];
        delete unmatchedKeys[ testWindow.id ];
        --remainCount;
        --unmatchedCount;
        nearMatches.push({ storedWindow, testWindow, diff });
      }
    }
  }
  unmatched = unmatched.filter( x => unmatchedKeys[ x.id ]);
  remaining = remaining.filter( x => remainKeys[ x.wid ]);
  logger.log({
    matches,
    nearMatches,
    unmatched,
    remaining,
    scores,
    pairs,
    reopen
  });
  for ( const { pair: { storedWindow, testWindow }, diff } of matches )
    updateWindow( storedWindow, testWindow, diff, reopen );
  for ( const { storedWindow, testWindow, diff } of nearMatches )
    updateWindow( storedWindow, testWindow, diff, reopen );
  // unmatched.forEach( reopen ? w => {
  //   if ( w.closed ) {
  //     addWindow(w);
  //     w.close();
  //   } else {
  //     addWindow(w).then(({ id }) => {
  //       cp.resumeWindow({ windowId: id });
  //     });
  //   }
  // } : addWindow );
  unmatched.forEach( addWindow );
  remaining = ( await Promise.all(
    remaining.map(
      r => r.w.windowId
         ? browser.windows.get( r.w.windowId )
         .then( x =>  null)
         .catch( x => r )
         : r
    )
  )).filter( x => x );
  logger.log({ remaining });
  if ( remaining.length ) {
    const updates = {};
    remaining.forEach( reopen ? r => {
      const focusTab = r.tabs.find( t => t.active )
      cp.resumeWindow({
        windowId: r.wid,
        tabId: focusTab && focusTab.tid,
        focus: !!focusTab
      });
      updates[ r.wid ] = r.w;
    } : r => {
      r.w.close();
      updates[ r.id ] = r.w;
    });
    store.saveAll( Object.values( updates ));
  } else
    store.save();               // just in case
}

export async function loadFromUI( windows ) {
  return windows ? syncWindows( async () =>
    ( await Promise.all( windows.map( Window.normalize )))
       .filter( w => !store.controlIds[ w.windowId ]),
    false
  ) : syncWindows(
    async () => (
      ( await Promise.all(
        ( await browser.windows.getAll() ).map( Window.normalize )))
         .filter( w => !store.controlIds[ w.windowId ])
    ),
    true
  );
}

export async function loadFromImport( windows, reopen ) {
  return syncWindows( windows, reopen );
}

export default {
  updateWindow,
  addWindow,
  syncWindows,
  loadFromUI,
  loadFromImport,
  ready,
}
