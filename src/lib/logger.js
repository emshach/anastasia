class Logger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  dir() {
    if ( this.isProduction ) return
    return console.dir.apply( console, arguments )
  }

  debug() {
    if ( this.isProduction ) return
    return console.debug.apply( console, arguments )
  }

  info() {
    if ( this.isProduction ) return
    return console.info.apply( console, arguments )
  }

  log() {
    if ( this.isProduction ) return
    return console.log.apply( console, arguments )
  }

  warn() {
    if ( this.isProduction ) return
    return console.warn.apply( console, arguments )
  }

  error() {
    if ( this.isProduction ) return
    return console.error.apply( console, arguments )
  }

  trace() {
    if ( this.isProduction ) return
    return console.trace.apply( console, arguments )
  }
}
const logger = new Logger()
export default logger
