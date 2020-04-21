export default {
  updates: {},
  dirty: false,
  controlActive: false,
  projects: {},
  projectIds: [],
  windowIds: [],
  tabIds: [],
  // tagIds: [],
  // noteIds: [],
  activeWindow: null,
  windows: {},
  tabs: {},
  tags: {},
  notes: {},
  toJson() {
    const out = {
      controlActive: this.controlActive,
      projects: {},
      projectIds: this.projectIds,
      activeWindow: this.activeWindow,
      windows: {},
      tabs: {},
      tags: {},
      notes: {}
    }
    for ( const p of this.projectIds )
      out.projects[ p ] = this.projects[p].toJson();
    for ( const p of this.windowIds )
      out.windows[ p ] = this.windows[p].toJson();
    for ( const p of this.tabIds )
      out.tabs[ p ] = this.tabs[p].toJson();
    // for ( const p of this.tagIds )
    //   out.tags[ p ] = this.tags[p].toJson();
    // for ( const p of this.noteIds )
    //   out.notes[ p ] = this.notes[p].toJson();
    return out;
  },
  queue( obj ) {
    Object.assign( this.updates, obj );
    this.dirty = true;
  },
  queueModel( model ) {
    this.updates[ model.id ] = model.toJson();
    this.dirty = true;
  },
  flush() {
    const out = this.updates;
    this.updates = {};
    this.dirty = false;
    return out;
  },
  add( model, init ) {
    if ( !model ) return;
    const registry = this[ model.model_name + 's' ];
    if ( !registry )
      return;
    const idx = model.model_name + 'Ids';
    const regIds = this[ idx ];
    if ( registry[ model.id ]) {
      registry[ model.id ] = model;
    } else {
      registry[ model.id ] = model;
      regIds.push( model.id );
      if ( !init )
        this.queue({
          [ idx ]: regIds,
          [ model.id ]: model.toJson(),
      });
    }
  },
  remove( model ) {
    if ( !model ) return;
    if ( this.updates[ model.id ])
      delete this.updates[ model.id ];
    
    const registry = this[ model.model_name + 's' ];
    if ( !registry )
      return;
    const idx = model.model_name + 'Ids';
    const regIds = this[ idx ];

    const pos = regIds.indexOf( model.id );
    if ( pos > -1 ) {
      regIds.splice( pos, 1 );
      this.queue({[ idx ]: regIds });
    }
    if ( registry[ model.id ])
      delete registry[ model.id ];
  }
}
