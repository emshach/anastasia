<template lang="pug">
img.tab-icon.favicon( :src='icon.data || icon.url' )
</template>

<script lang="js">
export default {
  name: 'tab-icon',
  mixins: [],
  components: {},
  props: {
    iconId: String
  },
  data() {
    return {
    };
  },
  created() {},
  mounted() {},
  methods: {},
  computed: {
    icon() {
      return this.$store.state.icons[ this.iconId ] ||
         { url: '/icons/48.png' }
    }
  }
}
</script>

<style lang="scss">
.tab-icon {

}
</style>
