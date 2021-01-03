<template lang="pug">
.options-page.page
  h1.page-header {{ title }}
  .tab-view
    .tabs
      button.tab(
        :class="{ active: active === 'rules' }"
        @click="active = 'rules'"
      ) Rules
      button.tab(
        :class="{ active: active === 'import' }"
        @click="active = 'import'"
      ) Import
      button.tab(
        :class="{ active: active === 'export' }"
        @click="active = 'export'"
      ) Export
    transition( name='fade' mode='out-in' )
      section.options.rules( v-if="active  === 'rules'" )
        //- header Rules
        form-rules( @input='updateRules' )
      section.options.import( v-else-if="active === 'import'" )
        //- header Import
        form-import( @input='importData' )
      section.options.export( v-else-if="active === 'export'" )
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
      return `${ browser.i18n.getMessage('extName') } Options`
    }
  }
}
</script>

<style lang="scss">
.options-page {
  * {
    transition: 400ms;
  }
  font-size: 16px;
  padding: 0.5em;
  h1 {
    text-align: center;
    margin-bottom: 1em;
  }
  section {
    header {
      font-size: larger;
      margin-bottom: 0.5em;
    }
    padding: 0.5em;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    margin-bottom: 1em;
  }
  .tab-view {
    > .tabs {
      display: flex;
      /* justify-content: stretch; */
      .tab {
        font-size: large;
        background: transparent;
        border: 0 none;
        border-bottom: 3px solid transparent;
        &.active {
          border-color: cornflowerblue;
        }
      }
    }
  }
  a:link {
    text-decoration: none;
    color: black;
  }
}
</style>
