<template lang="pug">
.import-viewer
  .object-list.projects
    project-viewer( v-for='p in objects' :key='p.id' :project='p' )
</template>

<script lang="js">
import ProjectViewer from './project-viewer'

export default {
  name: 'import-viewer',
  mixins: [],
  components: { ProjectViewer },
  props: {
    value: {
      type: Object,
      default: () => ({
        projects: [],
        windows: [],
        tabs: [],
        notes: [],
      })
    }
  },
  data() {
    return {
    }
  },
  created() {},
  mounted() {},
  methods: {
    glimpse() {
      console.log( this.objects )
    }
  },
  computed: {
    objects() {
      const value = this.value
      const projects = {}
      const windows = {}
      const tabs = {}
      const notes = {}
      const out = []

      for ( const n of value.notes ) {
        notes[ n.id ] = Object.assign( {}, n )
      }

      for ( const n of Object.values( notes )) {
        n.notes = []
        if ( n.noteIds ) {
          for ( const nid of n.noteIds ) {
            if ( notes[ nid ]) {
              n.notes.push( notes[ nid ])
            }
          }
        }
      }
      for ( const t of value.tabs ) {
        const tab = Object.assign( {}, t )
        tabs[ t.id ] = tab
        tab.notes = []
        if ( t.noteIds ) {
          for ( const nid of t.noteIds ) {
            if ( notes[ nid ]) {
              tab.notes.push( notes[ nid ])
            }
          }
        }
      }
      for ( const w of value.windows ) {
        const win = Object.assign( {}, w )
        windows[ w.id ] = win
        win.tabs = []
        win.notes = []
        if ( w.tabIds ) {
          for ( const tid of w.tabIds ) {
            if ( tabs[ tid ]) {
              win.tabs.push( tabs[ tid ])
            }
          }
        }
        if ( w.noteIds ) {
          for ( const nid of w.noteIds ) {
            if ( notes[ nid ]) {
              win.notes.push( notes[ nid ])
            }
          }
        }
      }

      for ( const p of value.projects ) {
        projects[ p.id ] = Object.assign( {}, p )
        if ( !p.pid ) {
          out.push( projects[ p.id ])
        }
      }
      for ( const p of Object.values( projects )) {
        p.projects = []
        p.windows = []
        p.notes = []

        if ( p.projectIds ) {
          for ( const pid of p.projectIds ) {
            if ( projects[ pid ]) {
              p.projects.push( projects[ pid ])
            }
          }
        }
        if ( p.windowIds ) {
          for ( const wid of p.windowIds ) {
            if ( windows[ wid ]) {
              p.windows.push( windows[ wid ])
            }
          }
        }
        if ( p.noteIds ) {
          for ( const nid of p.noteIds ) {
            if ( notes[ nid ]) {
              p.notes.push( notes[ nid ])
            }
          }
        }
      }
      return out
    },
  }
}
</script>

<style lang="scss">
.import-viewer {
  .object-list {
    .object-list {
      margin-left: 0.5em;
    }
    .list-item {
      border: 1px solid rgba(0,0,0,0.2);
      border-radius: 4px;
      margin-bottom: 4px;
      padding: 2px;
      > .header {
        background: cornflowerblue;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        margin-bottom: 4px;
      }
    }
  }
}
</style>
