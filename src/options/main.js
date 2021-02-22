import Vue from 'vue'
import App from './App.vue'
import './style.scss'
import Vuebar from 'vuebar'

Vue.use( Vuebar )
/* eslint-disable no-new */
const app = new Vue({
  el: '#app',
  render: h => h( App )
})
window.optionsPage = app
