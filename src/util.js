import store from '@/data'
import logger from '@/lib/logger'

export function urlsToRegexp( urls ) {
  const rxescape = s =>  s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  return new RegExp( '^((?:.+\\n)*?)' + urls.filter( x => x ).map( x => {
    x = `(?:(tab-[0-9]+:::::${ rxescape(x) })\\n((?:.+\\n)*?))?`;
    return x;
  }).join( '' ) + '$');
}

export function windowDiff( storedWindow, testWindow ) {
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
          lastTab = tid;
        } else {
          unknown.push([ lastTab, tabs[j] ]);
        }
        lastTab = tabs[j].id;
      } else if (x) {
        let urls = x.split( '\n' );
        urls.pop();
        urls = urls.map( y => y.split( ':::::' ));
        closed.push.apply( closed, urls );
        closedCount += urls.length;
      }
    });
    logger.log({ m, found, closed, unknown, foundCount, closedCount });
    return { found, closed, unknown, foundCount, closedCount };
  };
  const rx = testWindow.tabsMatch;
  const open = storedWindow.openUrls.match( rx );
  const all = storedWindow.allUrls.match( rx );
  const tabs = testWindow.tabIds.map( tid => store.state.tabs[ tid ]);
  logger.log({ rx, open, all, tabs });
  let d = parseData( open, tabs ),
      allData;
  if ( d.foundCount < testWindow.tabIds.length ) {
    allData = parseData( all, tabs );
    if ( allData.foundCount > d.foundCount )
      d = allData;
    else
      allData = null;
  }
  const reopen = [];
  if ( d.foundCount === testWindow.tabIds.length && d.closedCount === 0 ) {
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

export function findOpenPos( win, pos ) {
  const tabIds = win.tabIds;
  const tabs = tabIds.map( tid => store.state.tabs[ tid ]);
  let open = 0;
  tabs.find(( x, i ) => {
    if ( x.closed ) return false;
    if ( open === pos ) {
      return true;
    }
    ++open;
    return false;
  });
  return open;
}

export default {
  urlsToRegexp,
  windowDiff,
  findOpenPos,
}
