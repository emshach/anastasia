<template lang="pug">
.project-viewer
  .title Project: {{ project.name }}
  .object-list
    .header Projects
    project-viewer.list-item(
      v-for='p in project.projects'
      :key='p.id'
      :project='p'
    )
  .object-list
    .header Windows
    .object-list.windows
      .list-item( v-for='w in project.windows' :key='w.id' )
        .header {{ w.title }}
        .object-list.tabs
          .header Tabs
          .list-item( v-for='t in w.tabs.slice(0,10)' :key='t.id' )
            | {{ t.title || t.url }}
          .tail( v-if='w.tabs.length > 10' )
            | and {{ w.tabs.length - 10 }} more
        .object-list.notes
          .list-item( v-for='n in w.notes.slice(0,10)' :key='n.id' )
            | {{ n.summary }}
          .tail( v-if='w.notes.length > 10' )
            | and {{ w.notes.length - 10 }} more
  .object-list
    .header Notes
    .list-item( v-for='n in project.notes.slice(0,20)' :key='n.id' )
      | {{ n.summary }}
</template>

<script lang="js">

export default {
  name: 'project-viewer',
  mixins: [],
  components: {},
  props: {
    project: Object
  },
  data() {
    return {
    }
  },
  created() {},
  mounted() {},
  methods: {},
  computed: {}
}
</script>

<style lang="scss">
.project-viewer {
  .title {
    background-color: cornflowerblue;
    color: white;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
  }
  .tail {
    color: grey;
    font-size: 90%;
    font-style: italic;
  }
}
</style>
