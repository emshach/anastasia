<template lang="pug">
  options-page( :rules='rules' @ctrl='send' )
</template>

<script>
import OptionsPage from '@/components/OptionsPage.vue'
import state from '@/options/state'

export default {
  name: 'App',
  components: { OptionsPage },
  data() {
    return {
      port: null,
      loading: true,
      rules: []
    }
  },
  created() {
    const b = browser
    const port = b.runtime.connect({ name: 'anastasia-options' })
    const manifest = b.runtime.getManifest()
    document.title = `${manifest.name} Options`
    this.port = port
    port.onMessage.addListener( m => {
      console.log( 'background => options', m )
      const e = `on${ m.op }`
      if ( this[e] ) this[e](m)
      else console.warn( `'${ m.op }' not yet implemented` )
    })
    // document.addEventListener( 'keyup', e => {
    //   console.log( 'onKeyUp', e )
    // })
  },
  mounted() {},
  methods: {
    async onLoad({ state }) {
      this.loading = false
      console.log( 'got state', state )
      Object.assign( this, state )
    },
    onImportSuccess( msg ) {
      console.log( 'import success', msg )
      state.importStatus = 'SUCCESS'
    },
    onImportFailed({ error }) {
      console.log( 'import failed', error )
      state.importStatus = 'FAILED'
      state.importMessage = error
    },
    onLoadRules({ rules }) {
      this.rules = rules
    },
    send( msg ) {
      if ( this.port )
        this.port.postMessage( msg )
    },
  },
  beforeDestroy() {
    this.port = null
  },
}
</script>

<style lang="scss">
html, body {
  background: transparent;
  margin: 0;
  padding: 0;
  height: 100%;
}
.form {
  button, select, .btn {
    background-color: #f8f8f8;
    border: 1px solid rgba(0,0,0,0.1);
    margin: 0.25em;
    padding: 0.5em 1em;
    border-radius: 4px;
    font-size: medium;
    &:hover {
      z-index: 1;
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    }
    &.selected {
      background-color: #ddd;
    }
  }
  .form-element {
    margin-bottom: 0.5em;
    > label {
      margin: 0 0 0.5em 0;
      display: block;
    }
    &.inline {
      display: flex;
      align-items: baseline;
      > label {
        line-height: 1em;
        margin: 0 0.5em 0 0;
        display: block;
      }
      button {
        margin: 0;
        border-radius: 0;
        border-left-width: 0;
        &:first-child {
          border-top-left-radius: 4px;
          border-bottom-left-radius: 4px;
          border-left-width: 1px;
        }
        &:last-child {
          border-top-right-radius: 4px;
          border-bottom-right-radius: 4px;
        }
      }
    }
    &.list-item {
      border: 1px solid rgba(0,0,0,0.08);
      padding: 0.5em;
    }
    > textarea {
      width: 100%;
      min-height: 250px;
    }
  }
}
.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
  overflow: hidden;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
