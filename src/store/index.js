import Vue from 'vue'
import Vuex from 'vuex'
import sortBy from 'lodash-es/sortBy'
import logger from '@/lib/logger'
import { v4 as uuid } from 'uuid'

Vue.use( Vuex )

export default new Vuex.Store({
  state: {
    port: null,
    models: {
      projects: {},
      windows: {},
      tabs: {},
      notes: {},
      tags: {},
      icons: {},
    },
    projects: {},
    windows: {},
    tabs: {},
    notes: {},
    tags: {},
    icons: {},
    requests: {},
    closedTabs: [],
    closedWindows: [],
    controlActive: false,
    activeWindow: null,
  },
  mutations: {
    setPort( state, port ) {
      state.port = port
    },
    update( state, updates ) {
      // logger.log( 'updating...', { updates })
      try {
        for ( const u in updates ) {
          if ( state.models[u] ) {
            const fr = updates[u]
            const to = state[u]
            for ( const k in fr ) {
              if ( fr[k] == null ) {
                if ( to[k] ) {
                  Vue.delete( to, k )
                }
              } else if ( to[k] ) {
                to[k] = Object.assign( {}, to[k], fr[k] )
              } else {
                Vue.set( to, k, fr[k] )
              }
            }
          } else {
            Vue.set( state, u, updates[u] )
          }
        }
      } catch ( error ) {
        logger.warn( 'what the HELL happened?', error )
      }
      logger.log( 'updated', { state })
    },
    focusControl( state ) {
      state.controlActive = true
    },
    blurControl( state ) {
      state.controlActive = false
    },
    focusWindow( state, windowId ) {
      state.activeWindow = windowId
    },
    // removeWindow( state, windowId ) {
    //   Vue.delete( state.windows, windowId )
    // },
    setRequest( state, requestId ) {
      const obj = {}
      Vue.set( state.requests, requestId, obj)
      obj.promise = new Promise(( resolve, reject ) => {
        obj.resolve = resolve
        obj.reject = reject
      })
    },

    // addProject( state, { project, pos, parentId }) {
    // },
    // removeProject( state, id ) {
    // },
    // suspendProject( state, id  ) {
    // },
    // resumeProject( state, id ) {
    // },
    // moveProject( state, { fromId, toId, pos }) {
    // },
    // updateProject( state, ) {
    // },

    // addWindow( state, ) {
    // },
    // removeWindow( state, ) {
    // },
    // suspendWindow( state, ) {
    // },
    // resumeWindow( state, ) {
    // },
    // moveWindow( state, ) {
    // },
    // updateWindow( state, ) {
    // },

    // addTab( state, ) {
    // },
    // removeTab( state, ) {
    // },
    // suspendTab( state, ) {
    // },
    // moveTab( state, ) {
    // },
    // updateTab( state, ) {
    // },

    // addNote( state, ) {
    // },
    // removeNote( state, ) {
    // },
    // updateNote( state, ) {
    // },

    // addTag( state, ) {
    // },
    // removeTag( state, ) {
    // },
    // addTabTag( state, ) {
    // },
    // removeTabTag( state, ) {
    // },
    // addNoteTag( state, ) {
    // },
    // removeNoteTag( state, ) {
    // },
  },
  actions: {
    init({ dispatch, commit }) {
      const b = browser
      const port = b.runtime.connect({ name: 'anastasia-control-panel' })
      commit( 'setPort', port )
      port.onMessage.addListener( m => {
        logger.log( 'background => control-panel', m )
        dispatch( 'recv', m )
      })
    },
    destroy({ commit }) {
      commit( 'setPort', null )
    },
    send({ commit, dispatch, state }, data ) {
      if ( !state.port ) {
        // TODO: error?
        return
      }
      const requestId = uuid()
      const msg = Object.assign({ requestId }, data )
      commit( 'setRequest', requestId )
      state.port.postMessage( msg )
      return state.requests[ requestId ].promise
    },
    recv({ commit, dispatch, state }, { requestId, ...msg }) {
      if ( requestId ) {
        const req = state.requests[ requestId ]
        if ( req ) {
          req.resolve( msg )
          Vue.delete( state.requests, requestId )
        }
      }
      // TODO: do op with data
      const { op, ...data } = msg
      logger.log({ op, data })
      commit( op, data )
      return msg
    },
    addProject({ commit, dispatch }, { project, pos }) {
    },
    removeProject({ commit, dispatch }, projectId ) {
    },
    suspendProject({ commit, dispatch }, projectId ) {
    },
    resumeProject({ commit, dispatch }, projectId ) {
    },
    moveProject({ commit, dispatch }, { destId, projectId, pos }) {
    },
    updateProject({ commit, dispatch }, project) {
    },

    addWindow({ commit, dispatch }, ) {
    },
    removeWindow({ commit, dispatch }, ) {
    },
    suspendWindow({ commit, dispatch }, ) {
    },
    resumeWindow({ commit, dispatch }, ) {
    },
    moveWindow({ commit, dispatch }, ) {
    },
    updateWindow({ commit, dispatch }, ) {
    },

    addTab({ commit, dispatch }, ) {
    },
    removeTab({ commit, dispatch }, ) {
    },
    suspendTab({ commit, dispatch }, ) {
    },
    moveTab({ commit, dispatch }, ) {
    },
    updateTab({ commit, dispatch }, ) {
    },

    addNote({ commit, dispatch }, ) {
    },
    removeNote({ commit, dispatch }, ) {
    },
    updateNote({ commit, dispatch }, ) {
    },

    addTag({ commit, dispatch }, ) {
    },
    removeTag({ commit, dispatch }, ) {
    },
    addTabTag({ commit, dispatch }, ) {
    },
    removeTabTag({ commit, dispatch }, ) {
    },
    addNoteTag({ commit, dispatch }, ) {
    },
    removeNoteTag({ commit, dispatch }, ) {
    },
  },
  getters: {
    topProjectIds: state => sortBy(
      Object.keys( state.projects ),
      x => parseInt( x.split('-')[1] )
    ).filter( pid => state.projects[ pid ] && !state.projects[ pid ].pid )
  },
})
