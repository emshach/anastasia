import store from '@/data'

export function urlsToRegexp( urls ) {
  const rxescape = s =>  s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  return new RegExp( '^((?:.+\\n)*?)' + urls.filter( x => x ).map( x => {
    x = `(?:(tab-[0-9]+:::::${ rxescape(x) })\\n((?:.+\\n)*?))?`;
    return x;
  }).join( '' ) + '$');
}

export function windowDiff( storedWindow, uiWindow ) {
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
          const [ tid ] = x.split( ':::::' );
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
  const tabs = uiWindow.tabIds.map( t => uiWindow.tabs[t] );
  // console.log({ rx, open, all, tabs });
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

export default {
  urlsToRegexp,
  windowDiff,
}
