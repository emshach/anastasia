<template lang="html">
  <div class="tab-item active focus">
    <div class="inner">
      <a href="#">
        <img id="favicon" class="favicon" :src=tab.icon />
        <span>{{ tab.title || tab.url }}</span>
      </a>
    </div>
  </div>
</template>

<script lang="js">

export default {
  name: 'TabItem',
  mixins: [],
  components: {},
  props: {
    tab: {
      type: Object,
      required: true
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
.tab-item {
  .favicon {
    display: block;
    float: left;
    margin: -3px 6px 0 -4px;
    width: 17px;
    height: 17px;
    color: lightskyblue;
    fill: lightskyblue;
    transition: 0s;
  }
  > .inner {
    position: relative;
    border: 1px solid transparent;
    background: rgba(255,255,255,0.1);
    height: 100%;
    overflow: hidden;
  }
  &:last-child > .inner, &.next-closed > .inner {
    border-bottom-left-radius: 2px;
    border-bottom-right-radius: 2px;
  }
  &.active {
    > .inner {
      background: rgba(205,225,255,0.2);
      > a {
        color: lightcyan;
        /* font-weight: bold; */
        /* text-shadow: 0 0 2px lightskyblue; */
      }
    }
  }
  .active & {
    > .inner {
      /* background: rgba(255,255,255,0.15); */
      color: black;
      border-color: rgba(255,255,255,0.05);
      border-top-color: rgba(255,255,255,0.1);
      background: lightskyblue;
    }
  }
  &.focus, &:hover {
    * {
      color: black;
    }
    .favicon {
      width: 32px;
      height: 32px;
    }
  }
}
</style>
