import Vue from 'vue'
import App from './App.vue'
import '@/css/style.scss'
import { HoverIntent } from '@/directives'

Vue.directive( 'hover-intent', HoverIntent )

/* eslint-disable no-new */
new Vue({
  el: '#app',
  render: h => h(App)
})
