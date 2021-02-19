<template lang="pug">
.form-import.form
  .form-element( v-if="state.importStatus === 'SUCCESS'" )
    .message Import Successful!!
    button( @click='reset' ) OK

  .form-element( v-if="state.importStatus === 'FAILED'" )
    .message
      | Import Failed:
      pre {{ state.importMessage || 'Unknown Error' }}
      | Please try again.
    button( @click='reset' ) OK

  template( v-else )
    .form-element( v-if='importObjects' )
      button( value='import' @click='submit' ) Import
      label
        input( type='checkbox' v-model='importObjects.reopen' )
        | Reopen imported open windows
      label
        input( type='checkbox' v-model='importObjects.sync' )
        | Sync import data with current browser state
      label
        input( type='checkbox' v-model='importObjects.orphaned' )
        | Import orphaned tabs as notes
      object-manager( :value='importObjects', @input='updateObjects' )
      button( value='import' @click='submit' ) Import

    .form-element( v-else-if='importData')
      label You can edit the data below before importing
      button( value='import' @click='process' ) Process Data
      v-json-editor( v-model='importData' )
      button( value='import' @click='process' ) Process Data

    .form-element
      label Paste json data below or upload file
      input( type='file' :key='uploadTry' @change='updateFile' )
      textarea( @input='updateData' )

</template>

<script lang="js">
import debounce from 'debounce'
// import VueJsonEditor from 'vue-json-editor'
import VJsonEditor from 'v-jsoneditor'
import state from '@/options/state'
import ObjectManager from './object-manager'

export default {
  name: 'form-import',
  mixins: [],
  components: { VJsonEditor, ObjectManager },
  props: {},
  data() {
    return {
      type: 'text',
      importData: '',
      importObjects: null,
      importFile: null,
      uploadTry: 1,
      debouncedRead: debounce(( vm, event ) => vm.readFile( event ), 1000 ),
      state
    };
  },
  created() {},
  mounted() {},
  methods: {
    updateFile( event ) {
      this.debouncedRead( this, event );
    },
    async readFile( event ) {
      const input = event.target;
      if ( 'files' in input && input.files.length > 0 ) {
        const file = input.files[0];
        const reader = new FileReader();
        const text = await new Promise(( resolve, reject ) => {
          reader.onload = event => resolve( event.target.result );
          reader.onerror = error => reject( error );
          reader.readAsText( file );
        }).catch( e => '' );
        if ( text ) {
          this.updateData( text );
        }
      }
    },
    updateData( text ) {
      try {
        const json = JSON.parse( text )
        this.importData = json;
      } catch ( err ) {}
    },
    updateObjects({ change, type, subject, object }) {
      const data = this.importObjects;
      console.log( 'updateObject', { change, type, subject, object });
      if ( change === 'add' ) {
        if ( type === 'project' ) {
          data.projects.push({
            id: '',
            title: '',
            projectIds: [],
            windowIds: [],
            projects: [],
            windows: [],
          });
        } else if ( type === 'window' ) {
          data.windows.push({
            id: '',
            title: '',
            tabIds: [],
            tabs: [],
          });
        } else if ( type === 'tab' ) {
          data.tabs.push({
            id: '',
            title: '',
          });
        } else if ( type === 'note' ) {
          data.notes.push({
            id: '',
            title: '',
          });
        } else {
        }
      } else if ( change === 'remove' ) {
        if ( type === 'project' ) {
          const index = data.projects.findIndex( x => x.id === subject );
          if ( index < 0 ) return;
          const project = data.projects.splice( index, 1 )[0];
          // TODO: remove from projects, windows, etc
        } else if ( type === 'window' ) {
          const index = data.windows.findIndex( x => x.id === subject );
          if ( index < 0 ) return;
          const window = data.windows.splice( index, 1 )[0];
          // TODO: remove from projects, windows, etc
        } else if ( type === 'tab' ) {
          const index = data.tabs.findIndex( x => x.id === subject );
          if ( index < 0 ) return;
          const tab = data.tabs.splice( index, 1 )[0];
          const urlIndex = data.urlTabs[ tab.url ].findIndex( x => x.id === subject );
          if ( urlIndex ) {
            data.urlTabs[ tab.url ].splice( urlIndex, 1 );
          }
          if ( tab.window ) {
            this.updateObjects({
              change: 'detach',
              type: 'window',
              subject: tab.wid,
              object: tab.id
            });
          }
          // TODO: remove from projects, windows, etc
        } else if ( type === 'note' ) {
          const index = data.notes.findIndex( x => x.id === subject );
          if ( index < 0 ) return;
          const note = data.notes.splice( index, 1 )[0];
          // TODO: remove from projects, windows, etc
        } else {
        }
      } else if ( change === 'attach' ) {
        if ( type === 'project' ) {
        } else if ( type === 'window' ) {
          const w = data.windows.find( x => x.id === subject );
          const t = data.tabs.find( x => x.id === object );
          if ( !w || !t ) return;
          w.tabIds.push( object );
          w.tabs.push(t);
        } else if ( type === 'tab' ) {
        } else if ( type === 'note' ) {
        } else {
        }
      } else if ( change === 'detach' ) {
        if ( type === 'project' ) {
          const index = data.projects.findIndex( x => x.id === subject );
          if ( index < 0 ) return;
          const project = data.projects.splice( index, 1 )[0];
        } else if ( type === 'window' ) {
          const w = data.windows.find( x => x.id === subject );
          if ( !w ) return;
          let index = w.tabIds.indexOf( object );
          if ( index < 0 ) return;
          index = w.tabs.findIndex( x => x.id === object );
          if ( index < 0 ) return;
          const t = w.tabs.splice( index, 1 );
          t.parent = t.window = null;
        } else if ( type === 'tab' ) {
        } else if ( type === 'note' ) {
        } else {
        }
      } else {
        console.error( `unknown change type : '${change}'`)
      }
    },
    process() {
      const data = this.importData;
      const out = {
        projects: [],
        windows: [],
        icons: {},
        tabs: [],
        notes: [],
        urlTabs: {},
        reopen: true,
        sync: true,
        orphaned: false,
      }
      const { projects, windows, icons, tabs, notes, urlTabs } = out;
      for ( const k of Object.keys( data )) {
        if ( k.startsWith( 'project-' )) {
          projects.push( data[k] )
        } else if ( k.startsWith( 'window-' )) {
          windows.push( data[k] )
        } else if ( k.startsWith( 'tab-' )) {
          tabs.push( data[k] )
          if ( !urlTabs[ data[k].url ]) {
            urlTabs[ data[k].url ] = []
          }
          urlTabs[ data[k].url ].push( data[k] );
        } else if ( k.startsWith( 'icon-' )) {
          icons[k] = data[k]
        } else if ( k.startsWith( 'note-' )) {
          notes.push( data[k] )
        } else {
          // TODO: ignore for now
        }
      }
      for ( const p of projects ) {
        p.projects = p.projectIds.map( id => {
          const p2 = data[ id ];
          if ( p2 ) {
            p2.parent = p2.project = p;
          }
          return p2;
        });
        p.windows = p.windowIds.map( id => {
          const w = data[ id ];
          if (w) {
            w.parent = w.project = p;
          }
          return w;
        });
      }
      const windowIds = {}
      for ( const w of windows ) {
        windowIds[ w.id ] = true;
        w.tabs = w.tabIds.map( id => {
          const t = data[ id ];
          if (t) {
            t.parent = t.window = w;
          }
          return t;
        });
      }
      for ( const t of tabs ) {
        if ( !windowIds[ t.wid ]) {
          t.wid = `closed ${t.wid}`
          t.orphaned = true
        }
      }
      // TODO: notes
      console.log( 'processed data', data, out );
      this.importObjects = out;
    },
    submit() {
      const data = this.importObjects;
      for ( const p of data.projects ) {
        delete p.parent;
        delete p.projects;
        delete p.windows;
      }
      for ( const w of data.windows )  {
        delete w.parent;
        delete w.project;
        delete w.tabs
      }
      for ( const t of data.tabs ) {
        delete t.parent;
        delete t.window;
      }
      // TODO: notes
      this.$emit( 'input', data );
    },
    reset() {
      state.importStatus = null;
      this.importData = '';
      this.importObjects = null;
      ++this.uploadTry;
    }
  },
  computed: {
    isText() { return this.type === 'text'; },
    isFile() { return this.type === 'file'; },
    // filePreview() {
    //   return this.isFile && this.importData && this.importData.substr( 0, 300 ) +
    //      ( this.importData && this.importData.length > 300 ? '...' : '' )
    // }
  }
}
</script>

<style lang="scss">
.form-import{
  .message {
    pre {
      background: rgba(0,0,0,0.1);
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 4px;
      padding: 0.5em;
    }
  }
}
</style>
