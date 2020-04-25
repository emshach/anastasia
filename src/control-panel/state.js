import Vue from 'vue'

export default {
  focus: null,
  setFocus( obj ) {
    if ( this.focus ) {
      this.focus.selected = false;
    }
    this.focus = obj;
    Vue.set( obj, 'selected', true );
  }
}
