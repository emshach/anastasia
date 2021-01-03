import store from '@/data'
import { controlPanel as cp } from '@/controllers'
import { windowDiff } from '@/util'
import { Window } from '@/models'

export function updateWindow( storedWindow, testWindow, diff, open ) {
  const w = storedWindow;
  const test = testWindow;
  if ( test.windowId && w.windowId !== test.windowId ) {
    w.windowId = test.windowId;
    // post({ op: 'SetWindowId', wid, windowId });
  }
  if ( open && !testWindow.closed ) {
    delete w.closed;
    store.openWindows[ w.windowId ] = w;
  }
  diff.forEach( op => {
    let tab, tid, _, after, insert; // eslint-disable-line no-unused-vars
    switch ( op[0] ) {
    case 'attach':
      op[1].forEach(({ tid, tabId }) => {
        if (!store.state.tabs[ tid ]) {
          console.warn( `tab "${tid}" does not exist!` );
          return;
        }
        store.state.tabs[ tid ].tabId = tabId;
        if ( store.openTabs[ tabId ])
          store.removeTab( store.openTabs[ tabId ] );
        store.openTabs[ tabId ] = store.state.tabs[ tid ];
        cp.send( 'AttachTab', { tid, tabId });
      })
      break;
    case 'reopen':
      op[1].forEach( tid => {
        tab = store.state.tabs[ tid ];
        tab.closed = false;
        cp.send( 'ResumeTab', { tid });
      })
      break;
    case 'close':
      tid = op[1];
      tab = store.state.tabs[ tid ];
      tab.closed = true;
      cp.send( 'SuspendTab', { tid });
      break;
    case 'new':
      [ _, after, insert ] = op;
      tab = store.addTab( insert );
      after = store.openTabs[ after ].toJson();
      cp.send( 'AddTab', { tab, after });
      break;
    }
  });
  if ( test.project )
    test.project.removeWindow( test );
  const wid = test.id;
  store.state.remove( test );
  store.clearData([ wid ]);
}

export async function addWindow( win ) {
  win = ( await store.addWindow( win )).toJson();
  const tabs = win.tabIds.map( tid => store.state.tabs[ tid ].toJson() );
  const p = store.state.projects[ win.pid ];
  let pos = p.windowIds.indexOf( win.id );
  if ( pos < 0) {
    pos = p.windowIds.length;
    p.windowIds.push( win.id );
  }
  cp.send( 'AddWindow', { win, tabs, pos });
}

export async function syncWindows( ws, reopen ) {
  console.log( 'syncWindows', ws );
  const closeEnough = ( tabs, diffs ) => ( tabs / diffs > 3 );
  // get stored urls
  const storedWindows = store.state.windowIds
      .reduce(( lists, wid ) => {
        const w = store.state.windows[ wid ];
        let openUrls = '',
            allUrls = '';
        w.tabIds.forEach( tid => {
          const t = store.state.tabs[ tid ];
          if (!t) return;
          if ( !browser.closed )
            openUrls += `${ t.id }:::::${ t.url }\n`;
          allUrls += `${ t.id }:::::${ t.url }\n`;
        });
        const open = !w.closed;
        lists[ open ? 1 : 0 ].push({
          open,
          wid,
          w,
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
  const windows = await ws;
  console.log({ windows });
  const remainKeys = {},
        unmatchedKeys = {},
        matches = [],
        pairs = {};
  let scores = [],
      remainCount = 0,
      unmatchedCount = 0;
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
    if (!unmatchedCount || !remainCount )
      break;
    const options = pairs[ score ];
    for ( const { pair:{ storedWindow, testWindow }, diff } of options ) {
      // console.log({ wid, windowId, remainKeys, unmatchedKeys });
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
  // console.log({ matches, nearMatches, unmatched, scores, pairs });
  for ( const { pair: { storedWindow, testWindow }, diff } of matches)
    updateWindow( storedWindow, testWindow, diff, reopen );
  for ( const { storedWindow, testWindow, diff } of nearMatches)
    updateWindow( storedWindow, testWindow, diff, reopen );
  unmatched.forEach( addWindow );
  if ( !ws ) {
    const updates = {};
    remaining.forEach( win => {
      win.w.close();
      updates[ win.id ] = win;
    });
    store.saveAll( Object.values( updates ));
  } else
    store.save();               // just in case
}

export async function loadFromUI( windows ) {
  return syncWindows(
    Promise.all(
      ( windows || await browser.windows.getAll()).map( Window.normalize ))
       .filter( w => !store.controlIds[ w.windowId ]), true );
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
}
