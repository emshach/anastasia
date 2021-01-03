<template lang="pug">
.form-rules.form
  transition-group.rules-list( tag='div' name='fade' mode='out-in')
    template( v-for='( rule, index ) in rules')
      .list-item.edit.form-element-form(
        v-if='index === editingRule'
        :key='index'
      )
        .form-element
          label( for='match' ) Match url
          input( type='text' name='match' v-model='editingData.match' )
        .form-element
          label( for='onlytab' ) If this is the only tab in the window
          input( type='checkbox' name='onlytab' v-model='editingData.onlytab' )
        .form-element
          label( for='time' ) If tab has been open less than
          input( type='number' name='time' v-model.number='editingData.time' )
          | second{{ editingData.time === 1 ? '' : 's' }}
        .form-element
          label( for='action' ) If tab has been open less than
          select( name='action' v-model='editingData.action' )
            option(
              v-for='( label, action ) in actions'
              :key='action'
              :value='action'
            ) {{ label }}
        button( @click='updateRule' ) Update Rule
      .list-item.form-element.display( v-else :key='index' )
        div
          | On closing a tab, if:
          ul
            li( v-if='rule.match' )
              | url matches #[span.value {{ rule.match }}]
            li( v-if='rule.onlytab' ) tab is the only tab in the window
            li( v-if='rule.time' )
              | tab has been open less than #[span.value {{ rule.time }}]
              | second{{ rule.time === 1 ? '' : 's' }}
          | then #[span.value {{ actions[ rule.action ]}}]
        button(
          value='edit'
          type='button'
          @click='editRule( index )'
        ) Edit rule
        button(
          value='edit'
          type='button'
          @click='deleteRule( index )'
        ) Delete rule
  template( v-if='editingRule < 0')
    button(
      value='add'
      type='button'
      @click='addRule'
    ) Add a rule
    button(
      v-if='rulesUpdated'
      value='save'
      type='button'
      @click='saveRules'
    ) Save changes
    button(
      v-if='rulesUpdated'
      value='revert'
      type='button'
      @click='revertRules'
    ) Revert chages
</template>

<script lang="js">

export default {
  name: 'form-rules',
  mixins: [],
  components: {},
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
      actions: {
        forget: 'Forget it',
        keep: 'Save it',
        note: 'Save it as a note'
      }
    };
  },
  created() {},
  mounted() {},
  methods: {
    addRule() {
      ++ this.numRules;
      const rules = this.rules.length;
      this.rules.push({
        match: '',
        time: 0,
        onlytab: false,
        action: 'forget'
      });
      this.editRule( rules )
    },
    editRule( index ) {
      this.editingData = Object.assign( {}, this.rules[ index ]);
      this.editingRule = index;
    },
    deleteRule( index ) {
      this.rules.splice( index, 1 );
      this.rulesUpdated = true;
    },
    updateRule( rule ) {
      Object.assign( this.rules[ this.editingRule ], this.editingData );
      // TODO: validate
      this.editingRule = -1;
      this.rulesUpdated = true;
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
.form-rules {
  .value {
    font-weight: bold;
  }
}
</style>
