import store from '@/data'
import { controlPanel as cp } from '@/controllers'
import { windowDiff } from '@/util'
import { Window } from '@/models'

export function updateWindow( storedWindow, uiWindow, diff ) {
  const w = storedWindow;
  const ui = uiWindow;
  if ( w.windowId !== ui.windowId ) {
    w.windowId = ui.windowId;
    // post({ op: 'SetWindowId', wid, windowId });
  }
  delete w.closed;
  store.openWindows[ w.windowId ] = w;
  diff.forEach( op => {
    let tab, tid, _, after, insert;
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
        cp.post({ op: 'AttachTab', tid, tabId });
      })
      break;
    case 'reopen':
      op[1].forEach( tid => {
        tab = store.state.tabs[ tid ];
        tab.closed = false;
        cp.post({ op: 'ResumeTab', tid });
      })
      break;
    case 'close':
      tid = op[1];
      tab = store.state.tabs[ tid ];
      tab.closed = true;
      cp.post({ op: 'SuspendTab', tid });
      break;
    case 'new':
      [ _, after, insert ] = op;
      tab = store.addTab( insert);
      after = store.openTabs[ after ].toJson();
      cp.post({ op: 'AddTab', tab, after });
      break;
    }
  });
  if ( uiWindow.project )
    uiWindow.project.removeWindow( uiWindow );
  const wid = uiWindow.id;
  store.state.remove( uiWindow );
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
  cp.post({ op: 'AddWindow', win, tabs, pos });
}

export async function loadFromUI( ws ) {
  // console.log( 'loadFromUI', ws );
  const closeEnough = ( tabs, diffs ) => ( diffs < 5 && tabs / diffs > 2 );
  // get stored urls
  const storedWindows = store.state.windowIds
      .reduce(( lists, wid ) => {
        const w = store.state.windows[ wid ];
        let openUrls = '',
            allUrls = '';
        w.tabIds.forEach( tid => {
          const t = store.state.tabs[ tid ];
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
  const windows = ( await Promise.all(
    ( ws || await browser.windows.getAll())
       .map( Window.normalize )))
        .filter( w => !store.controlIds[ w.windowId ]);
  const remainKeys = {},
        unmatchedKeys = {},
        matches = [],
        pairs = {};
  let scores = [],
      remainCount = 0,
      unmatchedCount = 0;
  let remaining = storedWindows;
  let unmatched = windows.filter( uiWindow => {
    let matched = false;
    remaining = remaining.filter( storedWindow => {
      if ( matched ) return true;
      const diff = windowDiff( storedWindow, uiWindow );
      storedWindow = storedWindow.w;
      const pair = { storedWindow, uiWindow };
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
    for ( const { pair:{ storedWindow, uiWindow }, diff } of options ) {
      // console.log({ wid, windowId, remainKeys, unmatchedKeys });
      if ( !( storedWindow.id in remainKeys )
           || !( uiWindow.id in unmatchedKeys ))
        continue;
      if ( closeEnough( uiWindow.tabIds.length, diff.length - 1 )) {
        delete remainKeys[ storedWindow.id ];
        delete unmatchedKeys[ uiWindow.id ];
        --remainCount;
        --unmatchedCount;
        nearMatches.push({ storedWindow, uiWindow, diff });
      }
    }
  }
  unmatched = unmatched.filter( x => unmatchedKeys[ x.id ]);
  remaining = remaining.filter( x => remainKeys[ x.wid ]);
  // console.log({ matches, nearMatches, unmatched, scores, pairs });
  for ( const { pair: { storedWindow, uiWindow }, diff } of matches)
    updateWindow( storedWindow, uiWindow, diff );
  for ( const { storedWindow, uiWindow, diff } of nearMatches)
    updateWindow( storedWindow, uiWindow, diff );
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

export default {
  updateWindow,
  addWindow,
  loadFromUI,
}
