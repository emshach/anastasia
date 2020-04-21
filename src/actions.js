import store from '@/data'
import { controlPanel as cp } from '@/controllers'
import { windowDiff } from '@/util'
import { Window } from '@/models'

export function updateWindow( wid, windowId, diff ) {
  const w = store.state.windows[ wid ];
  if ( w.windowId !== windowId ) {
    w.windowId = windowId;
    // post({ op: 'SetWindowId', wid, windowId });
  }
  delete w.closed;
  store.openWindows[ windowId ] = w;
  for ( const op of diff ) {
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
        // post({ op: 'AttachTab', tid, tabId });
      })
      break;
    case 'reopen':
      for ( const tid of  op[1]) {
        tab = store.state.tabs[ tid ];
        tab.closed = false;
        cp.post({ op: 'ResumeTab', tid });
      }
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
  }
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
  const windows = ( await Promise.all(
    ( ws || await browser.windows.getAll())
       .map( Window.normalize )))
        .filter( w => !store.controlIds[ w.windowId ]);
  // get stored urls
  const storedWindows = store.windowIds
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
      const pair = {
        wid: storedWindow.wid,
        windowId: uiWindow.windowId
      };
      const diff = windowDiff( storedWindow, uiWindow );
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
  for ( const score of scores ) {
    if (!unmatchedCount || !remainCount )
      return;
    const options = pairs[ score ];
    for ( const { pair:{ wid, windowId }, diff } of options ) {
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
    }
  }
  unmatched = unmatched.filter( x => unmatchedKeys[ x.windowId ]);
  remaining = remaining.filter( x => remainKeys[ x.wid ]);
  // console.log({ matches, nearMatches, unmatched, scores, pairs });
  for ( const { pair: { wid, windowId }, diff } of matches)
    updateWindow( wid, windowId, diff );
  for ( const { wid, windowId, diff } of nearMatches)
    updateWindow( wid, windowId, diff );
  unmatched.forEach( addWindow );
  if ( !ws ) {
    const updates = {};
     for ( const win of remaining ) {
      win.close()
       for ( const tid of win.tabIds ) {
        const tab = store.state.tabs[ tid ];
        tab.close()
        updates[ tid ] = tab;
      }
       updates[ win.id ] = win;
     }
    store.saveAll( Object.values( updates ));
  }
}

export default {
  updateWindow,
  addWindow,
  loadFromUI,
}
