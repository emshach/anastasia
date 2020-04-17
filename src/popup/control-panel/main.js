import Vue from 'vue'
import App from './App.vue'

/* eslint-disable no-new */
const app = new Vue({
  el: '#app',
  render: h => h(App)
})
window.controlPanel = app;
