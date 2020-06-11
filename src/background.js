import store from '@/data'
import controllers, { controlPanel } from '@/controllers'
import models from '@/models'
import events, {
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
  onTabReplaced,
  onTabUpdated,
  onTabZoomChanged,
  onCommand,
  ready,
} from '@/events'
import actions from '@/actions'
import util from '@/util'

window.tabControl = { store, models, controllers, events, actions, util };

browser.browserAction.onClicked.addListener( controlPanel.open );
ready().then(() => {
  browser.windows.onCreated.addListener( onWindowCreated );
  browser.windows.onRemoved.addListener( onWindowRemoved );
  browser.windows.onFocusChanged.addListener( onWindowFocused );
  browser.tabs.onActivated.addListener( onTabActivated );
  browser.tabs.onAttached.addListener( onTabAttached );
  browser.tabs.onCreated.addListener( onTabCreated );
  browser.tabs.onDetached.addListener( onTabDetached );
  browser.tabs.onHighlighted.addListener( onTabHighlighted );
  browser.tabs.onMoved.addListener( onTabMoved );
  browser.tabs.onRemoved.addListener( onTabRemoved );
  browser.tabs.onReplaced.addListener( onTabReplaced );
  browser.tabs.onUpdated.addListener( onTabUpdated );
  if ( browser.tabs.onZoomChanged )
    browser.tabs.onZoomChanged.addListener( onTabZoomChanged );
  if ( browser.commands )
    browser.commands.onCommand.addListener( onCommand );
});
