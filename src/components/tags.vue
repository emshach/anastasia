<template lang="pug">
.tags
  template( v-for='tag in value' )
    a.tag( href='#' :key='tag[ tagKey ]' )
      | {{ tag[ label ] }}
      button( @click.stop.prevent='removeTag( tag[ tagKey ])' ) x
  select(
    v-if='(( notInList && notInList.length ) || add ) && $listeners.add'
    @change='addTag'
  )
    option( :value='null') +
    option( v-for='option in notInList' :key='option[ tagKey ]' )
      | {{ option[ label ] }}
</template>

<script lang="js">

export default {
  name: 'tags',
  mixins: [],
  components: {},
  props: {
    value:{
      type: Array,
      default: () => []
    },
    options:{
      type: Array,
      default: () => []
    },
    tagKey: {
      type: String,
      default: 'id'
    },
    label: {
      type: String,
      default: 'title'
    },
    add: {
      type: Boolean,
      default: false
    },
  },
  data() {
    return {
    };
  },
  created() {},
  mounted() {},
  methods: {
    removeTag( id ) {
      this.$emit( 'remove', id );
    },
    addTag( id ) {
      this.$emit( 'add', id );
    },
  },
  computed: {
    byKey() {
      const out = {}
      for ( const x of this.value ) {
        out[ x[ this.tagKey ]] = x
      }
      return out;
    },
    notInList() {
      return this.options.filter( x => !this.byKey[ x[ this.tagKey ]])
    }
  }
}
</script>

<style lang="scss">
.tags {
  display: flex;
  flex-wrap: wrap;
  .tag {
    border: 1px solid rgba(0,0,0,0.1);
    padding: 0 4px;
    border-radius: 3px;
    margin: 0 0.25em 0.25em 0;
    button {
      border: 0 none;
      background: transparent;
      margin-left: 0.25em;
      padding: 2px 10px;
    }
  }
}
</style>
