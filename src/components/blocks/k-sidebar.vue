<template lang="pug">
.k-sidebar( :class='{ open }')
  a.btn.close-btn( href='#' @click.prevent='close')
    close-icon
  .pane( v-bar )
    .inner
      h2.title Menu
      ul.menu
        li.menu-item
          a( href='#' @click.prevent='openOptions' )
            cog-icon.icon
            | Options
        li.menu-item
          a( href='#' @click.prevent='openFeedback' )
            feedback-icon.icon
            | Give feedback
        li.menu-item
          a( href='#' @click.prevent='reportIssue' )
            issue-icon.icon
            | Report Issue
        li.menu-item
          a( href='#' @click.prevent='requestFeature' )
            request-icon.icon
            | Request feature
        li.menu-item
          a( href='#' @click.prevent='openSource' )
            source-icon.icon
            | View project source
        li.menu-item
          a( href='#' @click.prevent='openDonation' )
            gift-icon.icon
            | Support project
            
</template>

<script lang="js">
import CloseIcon from 'icons/Close'
import CogIcon from 'icons/Cog'
import FeedbackIcon from 'icons/CommentText'
import RequestIcon from 'icons/CommentQuestion'
import IssueIcon from 'icons/CommentAlert'
import SourceIcon from 'icons/Github'
import GiftIcon from 'icons/Gift'

export default {
  name: 'SidebarBlock',
  mixins: [],
  components: {
    CloseIcon,
    CogIcon,
    FeedbackIcon,
    RequestIcon,
    IssueIcon,
    SourceIcon,
    GiftIcon,
  },
  props: {
    open: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
    }
  },
  created() {},
  mounted() {},
  methods: {
    close() {
      this.$emit( 'close' )
    },
    openOptions() {
      this.$emit( 'ctrl', { op: 'openOptions' })
    },
    openFeedback() {
    },
    reportIssue() {
    },
    requestFeature() {
    },
    openSource() {
    },
    openDonation() {
    }
  },
  computed: {}
}
</script>

<style lang="scss">
.k-sidebar {
  font-size: 1.5em;
  position: absolute;
  height: 100vh;
  top: 0;
  left: -100vw;
  transition: left 400ms;
  background: rgba(0,0,0,0.3);
  width: 100vw;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
  &.open {
    left: 0;
  }
  z-index: 10;
  .close-btn {
    font-size: 20px;
    color: white;
    position: absolute;
    right: 8px;
    top: 8px;
    padding: 2px;
    box-sizing: border-box;
    width: auto;
    height: auto;
    z-index: 1;
  }
  .title {
    text-align: center;
    font-family: sans;
    font-size: 1.5em;
  }
  .menu {
    width: 100%;
    padding: 0;
  }
  .menu-item {
    list-style-type: none;
    margin: 0;
    > a {
      transition: color 400ms, background 400ms;
      display: block;
      padding: 0.5em;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      &:hover {
        background: lightskyblue;
        color: black;
      }
      > .icon {
        margin-right: 0.5em;
      }
    }
  }
}
</style>
