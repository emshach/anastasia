<template lang="pug">
img.tab-icon.favicon( :src='icon.data || icon.url' )
</template>

<script lang="js">
export default {
  name: 'tab-icon',
  mixins: [],
  components: {},
  props: {
    icon: {
      type: Object,
      default: () => ({
        url: '/icons/48.png',
        data: ''
      })
    }
  },
  data() {
    return {
    };
  },
  created() {},
  mounted() {},
  methods: {},
  computed: {}
}
</script>

<style lang="scss">
.tab-icon {

}
</style>
