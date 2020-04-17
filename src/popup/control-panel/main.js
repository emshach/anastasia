import Vue from 'vue'
import App from './App.vue'
import '@/css/style.scss'

/* eslint-disable no-new */
const app = new Vue({
  el: '#app',
  render: h => h(App)
})
window.controlPanel = app;
