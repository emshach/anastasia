<template lang="pug">
.options-page.page
  h1.page-header {{ title }}
  .tab-view
    .tabs
      a.btn.tab(
        href='#'
        :class="{ active: active === 'rules' }"
        @click.prevent="active = 'rules'"
      ) Rules
      a.btn.tab(
        href='#'
        :class="{ active: active === 'import' }"
        @click.prevent="active = 'import'"
      ) Import
      a.btn.tab(
        href='#'
        :class="{ active: active === 'export' }"
        @click.prevent="active = 'export'"
      ) Export
    .body
      transition( name='fade' mode='out-in' )
        section.options.rules( v-if="active  === 'rules'" v-bar )
          //- header Rules
          form-rules( @input='updateRules' )
        section.options.import( v-else-if="active === 'import'" v-bar )
          //- header Import
          form-import( @input='importData' )
        section.options.export( v-else-if="active === 'export'" v-bar )
          //- header Export
          form-export
</template>

<script>
import FormRules from './form-rules'
import FormImport from './form-import'
import FormExport from './form-export'

export default {
  name: 'OptionsPage',
  components: {
    FormRules,
    FormImport,
    FormExport
  },
  data() {
    return {
      rules: [],
      active: 'rules',
      sections: {
        rules: 'Rules',
        import: 'Import',
        export: 'Export',
      }
    }
  },
  mounted () {
    browser.runtime.sendMessage({})
  },
  methods: {
    updateRules( rules ) {
      this.$emit( 'ctrl', { op: 'updateRules', rules });
    },
    importData( data ) {
      this.$emit( 'ctrl', { op: 'importData', ...data });
    }
  },
  computed: {
    title () {
      return `Options: ${ this.sections[ this.active ]}`
    }
  }
}
</script>

<style lang="scss">
@import "~@/css/breakpoint";

.options-page {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  font-family: sans;
  height: 100%;
  * {
    transition: 400ms;
  }
  font-size: 16px;
  h1 {
    position: relative;
    margin: 0;
    padding: 0.25em 0.25em 1em;
    background-color: white;
    z-index: 2;
  }
  .tab-view {
    > .tabs {
      /* justify-content: stretch; */
      .tab {
        position: relative;
        font-size: large;
        background-color: transparent;
        border: 0 none;
        border-bottom: 3px solid transparent;
        &.active {
          border-color: cornflowerblue;
        }
      }
    }
    > .body {
      padding: 0.5em 1em;
      box-sizing: border-box;
      button {
        background-color: cornflowerblue;
        color: white;
      }
      .jsoneditor {
        button {
          background-color: unset;
          margin: 2px;
          padding: 0;
          border-radius: 2px;
          border: 1px solid transparent;
        }
      }
    }
    @include for-desktop {
      flex: 1;
      display: flex;
      > .tabs {
        flex-basis: 20%;
        border-right: 1px solid rgba(128,128,128,0.2);
        box-shadow: 0 0 20px rgba(0,0,0,0.08);
        z-index: 1;
        > a {
          padding: 0.25em 0.5em;
          display: block;
          &.active {
            border-bottom: 0 none;
            background-color: cornflowerblue;
            color: white;
          }
        }
      }
      > .body {
        padding: 0 1em 0.5em;
        flex: 1;
        > section {
          height: 100%;
          box-sizing: border-box;
        }
      }
    }
    @include for-mobile {
      > .tabs {
        display: flex;
        padding: 0.5em 0.5em 0;
      }
    }
  }
  a:link {
    text-decoration: none;
    color: black;
  }
}
</style>
