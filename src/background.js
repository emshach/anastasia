import store from '@/data'
import controllers, { controlPanel } from '@/controllers'
import models from '@/models'
import events, {
  onWindowCreated,
  onWindowRemoved,
  onWindowFocused,
  onTabCreated,
  onTabUpdated,
  onTabFocused,
  onTabRemoved,
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
  browser.tabs.onCreated.addListener( onTabCreated );
  browser.tabs.onUpdated.addListener( onTabUpdated );
  browser.tabs.onRemoved.addListener( onTabRemoved );
  browser.tabs.onActivated.addListener( onTabFocused );
  if ( browser.commands )
    browser.commands.onCommand.addListener( onCommand );
});
