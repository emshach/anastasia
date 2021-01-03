<template lang="pug">
.form-export.form
  .form-element
    a.btn.download(
      :href='exportData'
      :download='filename'
      /* target='_blank' */
      @mouseenter='doExport'
      @focus='doExport'
    )
      slot Export Data
</template>

<script lang="js">

export default {
  name: 'form-export',
  mixins: [],
  components: {},
  props: {},
  data() {
    return {
      exportData: '',
      filename: '',
    };
  },
  created() {},
  mounted() {},
  methods: {
    doExport() {
      browser.storage.local.get( null ).then( data => {
        this.filename = ( 'tabcontrol.data.'
                          + ( new Date().toISOString()
                              .replace(  /[^T\d]+/g, '' )
                              .replace( 'T', '_' )) + '.json' )
        this.exportData = 'data:text/plain;charset=utf-8,'
           + encodeURIComponent( JSON.stringify( data ))
        // this.$nextTick(() => {
        //   if ( this.$refs[ 'download-link' ]) {
        //     this.$refs[ 'download-link' ].click()
        //   }
        // })
      })
    }
  },
  computed: {}
}
</script>

<style lang="scss">
.form-export {
  .download {
    display: inline-block;
  }
}
</style>
