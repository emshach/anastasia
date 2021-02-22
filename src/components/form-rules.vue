<template lang="pug">
.form-rules.form
  transition-group.rules-list( tag='div' name='fade' mode='out-in')
    template( v-for='( rule, index ) in rules')
      .list-item.edit.form-element-form(
        v-if='index === editingRule'
        :key='`editing-${index}`'
      )
        .form-element
          label( for='match' ) Match url
          input( type='text' name='match' v-model='editingData.match' ref='match' )
        .form-element
          input( type='checkbox' name='onlytab' v-model='editingData.onlytab' )
          label( for='onlytab' ) If this is the only tab in the window
        .form-element
          input( type='checkbox' name='popup' v-model='editingData.popup' )
          label( for='popup' ) If this is a popup
        .form-element
          label( for='time' ) If tab has been open less than
          input( type='number' name='time' v-model.number='editingData.time' )
          | second{{ editingData.time === 1 ? '' : 's' }}
        .form-element
          label( for='action' ) then
          select( name='action' v-model='editingData.action' )
            option(
              v-for='( label, action ) in actions'
              :key='action'
              :value='action'
            ) {{ label }}
        .actions
          a.btn(
            href='#'
            :title=`newRule ? 'Save Rule' : 'Update Rule'`
            @click.prevent='updateRule'
          )
            save-icon( :title=`newRule ? 'Save Rule' : 'Update Rule'` )
          a.btn(
            href='#'
            title='Delete Rule'
            @click.prevent='deleteRule'
          )
            delete-icon( title='Delete Rule' )
          a.btn(
            href='#'
            title='Discard Changes'
            @click='cancelEdit'
          )
            revert-icon( title='Discard Changes' )
      .list-item.form-element.display( v-else :key='index' )
        div
          | On #[span.value closing] a tab, if:
          ul
            li( v-if='rule.match' )
              | url matches #[span.value {{ rule.match }}]
            li( v-if='rule.onlytab' ) tab is the only tab in the window
            li( v-if='rule.popup' ) window is a popup
            li( v-if='rule.time' )
              | tab has been open less than #[span.value {{ rule.time }}]
              | second{{ rule.time === 1 ? '' : 's' }}
          | then
          |
          span.value {{ actions[ rule.action ] }}
        .actions
          a.btn(
            href='#'
            title='Edit Rule'
            @click.prevent='editRule( index )'
          )
            edit-icon
          a.btn(
            href='#'
            title='Delet Rule'
            @click.prevent='deleteRule( index )'
          )
            delete-icon

  .btn-group( v-if='editingRule < 0')
    button(
      value='add'
      type='button'
      @click='addRule'
    )
      add-icon
      | Add a new rule
    .space
    button(
      v-if='rulesUpdated'
      value='save'
      type='button'
      @click='saveRules'
    )
      save-icon
      | Save changes
    button(
      v-if='rulesUpdated'
      value='revert'
      type='button'
      @click='revertRules'
    )
      revert-icon
      | Revert chages
</template>

<script lang="js">
import AddIcon from 'icons/PlaylistPlus'
import SaveIcon from 'icons/ContentSave'
import EditIcon from 'icons/Pencil'
import DeleteIcon from 'icons/Delete'
import CloseIcon from 'icons/Close'
import RevertIcon from 'icons/UndoVariant'

export default {
  name: 'form-rules',
  mixins: [],
  components: {
    AddIcon,
    SaveIcon,
    EditIcon,
    DeleteIcon,
    CloseIcon,
    RevertIcon,
  },
  props: {
    value: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      rules: [],
      numRules: 0,
      editingRule: -1,
      editingData: {},
      rulesUpdated: false,
      newRule: false,
      actions: {
        forget: 'Forget it',
        keep: 'Save it',
        note: 'Save it as a note'
      }
    }
  },
  created() {},
  mounted() {},
  methods: {
    addRule() {
      ++ this.numRules
      const rules = this.rules.length
      this.rules.push({
        match: '',
        time: 0,
        onlytab: false,
        popup: false,
        action: 'forget'
      })
      this.newRule = true
      this.editRule( rules )
    },
    editRule( index ) {
      this.editingData = Object.assign( {}, this.rules[ index ])
      this.editingRule = index
      this.$nextTick(() => {
        if ( this.$refs.match )
          this.$refs.match[0].select()
      })
    },
    deleteRule( index ) {
      let editing = false
      if ( typeof index !== 'number' ) {
        index = this.editingRule
        editing = true
      }
      this.rules.splice( index, 1 )
      if ( !editing || !this.newRule )
        this.sendUpdates()
      if ( editing ) {
        this.cancelEdit()
      }
    },
    updateRule() {
      Object.assign( this.rules[ this.editingRule ], this.editingData )
      // TODO: validate
      this.editingRule = -1
      this.newRule = false
      this.sendUpdates()
    },
    sendUpdates() {
      this.rulesUpdated = true
    },
    cancelEdit() {
      this.editingRule = -1
      this.newRule = false
    },
    saveRules() {
      // TODO: send rules to background
    },
    revertRules() {
      // TODO: re-retrieve rules from background
    }
  },
  computed: {}
}
</script>

<style lang="scss">
@import "~@/css/breakpoint";

.form.form-rules {
  .value {
    font-weight: bold;
  }
  button {
    display: flex;
    align-items: center;
    .material-design-icon {
      height: 1.5em;
      margin-right: 0.25em;
    }
  }
  .form-element {
    position: relative;
    margin-bottom: 1em;
    input {
      font-size: 1em;
      border: 0 none;
      border-bottom: 2px solid rgba(128,128,128, 0.4);
      transition: border 400ms;
      &:focus {
        outline: 0 none !important;
        border-color: cornflowerblue
      }
    }
    @include for-desktop {
      display: flex;
      align-items: center;
      > label, > input {
        margin: 0 0.5em 0 0;
      }
      input[type='text'] {
        flex: 1;
      }
      input[type='number'] {
        width: 5em;
      }
    }
  }
  .form-element-form {
    position: relative;
  }
  .actions {
    position: absolute;
    bottom: 0;
    right: 0;
    display: flex;
    .btn {
      transition-property: background, color, box-shadow;
      transition-duration:400ms;
      display: block;
      padding: 0.25em;
      background: transparent;
      border: 0 none;
      color: cornflowerblue;
      margin: 0;
      &:hover {
        background: cornflowerblue;
        color: white;
      }
    }
  }
  .btn-group {
    display: flex;
    .space {
      height: 100%;
      flex: 1;
    }
  }
}
</style>
