<template lang="html">
  <div :class=classes >
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
    },
    opening: {
      type: Boolean,
      default: false,
    },
    closing: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      classes: {
        'tab-item': true,
        active: false,
        focus: false,
        opening: false,
        closing: false,
      }
    };
  },
  created() {
    this.classes.opening = this.opening;
    this.classes.closing = this.closing;
  },
  mounted() {},
  methods: {},
  computed: {}
}
</script>

<style lang="scss">
.tab-item {
  position: relative;
  box-sizing: border-box;
  height: 2em;
  transition-property: height !important;
  transition-timing-function: linear !important;
  transition-duration: 500ms;
  &.opening > .inner {
    border-top-left-radius: 4px;
    /* border-top-right-radius: 4px; */
  }
  &.closing > .inner {
    border-bottom-left-radius: 4px;
    /* border-bottom-right-radius: 4px; */
  }
  .favicon {
    display: block;
    float: left;
    margin: -2px 6px 0 -2px;
    width: 17px;
    height: 17px;
    color: lightskyblue;
    fill: lightskyblue;
    /* transition: 140ms; */
  }
  > .inner {
    box-sizing: border-box;
    /* margin-bottom: 1px; */
    position: relative;
    border: 1px solid transparent;
    background: rgba(255,255,255,0.1);
    height: 100%;
    overflow: hidden;
    transition-duration: 500ms;
    > a {
      display: block;
      padding: 3px 4px;
      > span {
        display: block;
        height: 11px;
        overflow: hidden;
        transition: 400ms;
      }
    }
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
  .active &, &.focus, &:hover {
    > .inner {
      /* background: rgba(255,255,255,0.15); */
      color: black;
      border-color: rgba(255,255,255,0.05);
      border-top-color: rgba(255,255,255,0.1);
      background: lightskyblue;
      > a > span {
        height: auto;
      }
    }
  }
  &.focus, &:hover {
    height: 8em;
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
