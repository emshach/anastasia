<template lang="pug">
.object-manager.form
  .object-list.projects
    header Projects
    template( v-for='project in projects' )
      .form-element.list-item( :key='project.id' )
        .form-element.inline
          label.name {{ project.id }}
          input(
            type='text'
            :value='project.title'
            @input='updateProjectTitle( project.id, $event )'
          )
        .form-element
          label Projects
          tags(
            :value='project.projects'
            :options='projects'
            @add='addToProject( project.id, $event )'
            @remove='removeFromProject( project.id, $event )'
          )
        .form-element
          label Windows
          tags(
            :value='project.windows'
            :options='windows'
            @add='addToProject( window.id, $event )'
            @remove='removeFromProject( window.id, $event )'
          )
  section.object-list.windows
    header Windows
    template( v-for='window in windows' )
      .form-element.list-item( :key='window.id' )
        .form-element.inline
          label.name {{ window.id }}
          input(
            type='text'
            :value='window.title'
            @input='updateWindowTitle( window.id, $event )'
          )
        .form-element
          label
            a(
              href='#'
              @click='toggleExpanded(expanded.windowTabs, window.id )'
            ) Tabs
          tags(
            v-if='expanded.windowTabs[ window.id ]'
            :value='window.tabs'
            :options='tabs'
            @add='addToWindow( window.id, $event )'
            @remove='removeFromWindow( window.id, $event )'
          )
  section.object-list.tabs
    header Tabs
    template( v-for='tab in tabs' )
      .form-element.list-item( :key='tab.id' )
        img.thumbnail( :src='tab.icon' )
        .name
          | {{ tab.id }}
          |
          span.meta( v-if='tab.orphaned' ) orphaned
        .name {{ tab.title }}
        .property {{ tab.url }}
        tags(
          :value='urlTabs[ tab.url ]'
          label='wid'
          @remove='removeTab( $event )'
        )
  section.object-list.notes
    header Notes
    template( v-for='note in notes' )
      .form-element.list-item( :key='note.id' )
        .form-element.inline
          label.name {{ note.id }}
          .name
            input(
              type='text'
              :value='note.title'
              @input='updateNoteTitle( note.id, $event )'
            )
</template>

<script lang="js">
import debounce from 'debounce'
import Tags from './tags'

export default {
  name: 'object-manager',
  mixins: [],
  components: { Tags },
  props: {
    value: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      editingId: '',
      expanded: {
        projectProjects: {},
        projectWindows: {},
        windowTabs: {},
      },
      debouncedUpdate: debounce(( vm, data ) => {
        vm.$emit( 'input', data );
      }, 400 )
    };
  },
  created() {},
  mounted() {},
  methods: {
    updateProjectTitle( id, value ) {
      this.debouncedUpdate( this, {
        change: 'rename',
        type: 'project',
        subject: id,
        object: value,
      })
    },
    updateWindowTitle( id, value ) {
      this.debouncedUpdate( this, {
        change: 'rename',
        type: 'window',
        subject: id,
        object: value,
      })
    },
    updateNoteTitle( id, value ) {
      this.debouncedUpdate( this, {
        change: 'rename',
        type: 'note',
        subject: id,
        object: value,
      })
    },
    toggleExpanded( thing, id ) {
      this.$set( thing, id, !thing[ id ]);
    },
    addProject( id ) {
      this.$emit( 'input', { change: 'add', type: 'project' });
    },
    addWindow( id ) {
      this.$emit( 'input', { change: 'add', type: 'window' });
    },
    addTab( id ) {
      this.$emit( 'input', { change: 'add', type: 'tab' });
    },
    addNote( id ) {
      this.$emit( 'input', { change: 'add', type: 'note' });
    },
    removeProject( id ) {
      this.$emit( 'input', { change: 'remove', type: 'project', subject: id });
    },
    removeWindow( id ) {
      this.$emit( 'input', { change: 'remove', type: 'window', subject: id });
    },
    removeTab( id ) {
      this.$emit( 'input', { change: 'remove', type: 'tab', subject: id });
    },
    removeNote( id ) {
      this.$emit( 'input', { change: 'remove', type: 'note', subject: id });
    },
    addToProject( id, object ) {
      this.$emit( 'input', {
        change: 'attach',
        type: 'project',
        subject: id,
        object
      });
    },
    addToWindow( id, object ) {
      this.$emit( 'input', {
        change: 'attach',
        type: 'window',
        subject: id,
        object
      });
    },
    addToTab( id, object ) {
      this.$emit( 'input', { change: 'attach', type: 'tab', subject: id, object });
    },
    addToNote( id, object ) {
      this.$emit( 'input', { change: 'attach', type: 'note', subject: id, object });
    },
    removeFromProject( id, object ) {
      this.$emit( 'input', {
        change: 'detach',
        type: 'project',
        subject: id,
        object
      });
    },
    removeFromWindow( id, object ) {
      this.$emit( 'input', {
        change: 'detach',
        type: 'window',
        subject: id,
        object
      });
    },
    removeFromTab( id, object ) {
      this.$emit( 'input', { change: 'detach', type: 'tab', subject: id, object });
    },
    removeFromNote( id, object ) {
      this.$emit( 'input', { change: 'detach', type: 'note', subject: id, object });
    }
  },
  computed: {
    objects() { return this.value },
    projects() { return this.objects.projects },
    windows() { return this.objects.windows },
    tabs() { return this.objects.tabs },
    urlTabs() { return this.objects.urlTabs },
    notes() { return this.objects.notes },
  }
}
</script>

<style lang="scss">
.object-manager {
  max-height: 600px;
  overflow-x: hidden;
  overflow-y: scroll;
  .thumbnail {
    float: left;
    padding: 0.25em;
    height: 2.5em;
  }
  .meta {
    font-style: italic;
  }
}
</style>
