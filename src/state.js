export default {
  updates: {},
  transactions: {},
  dirty: false,
  controlActive: false,
  projects: {},
  projectIds: [],
  windowIds: [],
  tabIds: [],
  iconIds: [],
  tagIds: [],
  noteIds: [],
  ruleIds: [],
  activeWindow: null,
  windows: {},
  icons: {},
  tabs: {},
  tags: {},
  notes: {},
  rules: {},
  toJson() {
    const out = {
      controlActive: this.controlActive,
      projects: {},
      projectIds: this.projectIds,
      activeWindow: this.activeWindow,
      windows: {},
      icons: {},
      tabs: {},
      tags: {},
      notes: {},
      rules: {},
    }
    for ( const k of this.projectIds )
      out.projects[k] = this.projects[k].toJson();
    for ( const k of this.windowIds )
      out.windows[k] = this.windows[k].toJson();
    for ( const k of this.iconIds )
      out.icons[k] = this.icons[k].toJson();
    for ( const k of this.tabIds )
      out.tabs[k] = this.tabs[k].toJson();
    for ( const k of this.tagIds )
      out.tags[k] = this.tags[k].toJson();
    for ( const k of this.noteIds )
      out.notes[k] = this.notes[k].toJson();
    for ( const k of this.ruleIds )
      out.rules[k] = this.rules[k].toJson();
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
    const registry = this[ model.modelName + 's' ];
    if ( !registry )
      return;
    const idx = model.modelName + 'Ids';
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

    const registry = this[ model.modelName + 's' ];
    if ( !registry )
      return;
    const idx = model.modelName + 'Ids';
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
