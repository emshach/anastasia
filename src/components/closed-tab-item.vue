<template lang="pug">
.closed-tab-item.tab-item( :class='classes' )
  .inner
    slot( name='ctrl-before' )
      .ctrl-before
        slot( name='ctrl-before-prepend' )
        a.btn.close-btn(
          href='#'
          title="delete tab"
          @click.stop.prevent='removeTab'
        )
          delete-icon.icon( decoration )
        a.btn.close-btn(
          href='#'
          title="keep tab"
          @click.stop.prevent='keepTab'
        )
          save-icon.icon( decoration )
    a.name( :href='tab.url' @click.stop.prevent='focusTab' )
      tab-icon( :icon-id='tab.iconId' )
      span.title {{ tab.title || tab.url }}
    .space

</template>

<script lang="js">
import { mapActions } from 'vuex'
import TabIcon from './tab-icon'
import SaveIcon from 'icons/Floppy'
import DeleteIcon from 'icons/Delete'
export default {
  name: 'closed-tab-item',
  mixins: [],
  components: { TabIcon, SaveIcon, DeleteIcon },
  props: {
    tabId: {
      type: String,
      required: true
    },
    search: String
  },
  data() {
    return {
    }
  },
  created() {},
  mounted() {},
  methods: {
    ...mapActions([ 'send' ]),
    keepTab() {
      this.send({ op: 'keepTab', tabId: this.tabId })
    },
    removeTab() {
      this.send({ op: 'removeTab', tabId: this.tabId })
    }
  },
  computed: {
    tab() {
      return this.$store.state.tabs[ this.tabId ] || {}
    },
    classes() {
      return {
        hovered: true,
        active: true,
      }
    },
  }
}
</script>

<style lang="scss">
.closed-tab-item {

}
</style>
