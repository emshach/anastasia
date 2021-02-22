import Vue from 'vue'
import App from './App.vue'
import '@/css/style.scss'
import Vuebar from 'vuebar'
import { HoverIntent } from '@/directives'

Vue.use( Vuebar )
Vue.directive( 'hover-intent', HoverIntent )

/* eslint-disable no-new */
const app = new Vue({
  el: '#app',
  render: h => h( App )
})
window.controlPanel = app;
