const path = require('path')
const CopyPlugin = require( 'copy-webpack-plugin' )
module.exports = {
  pages: {
    popup: {
      template: 'public/browser-extension.html',
      entry: './src/popup/control-panel/main.js',
      title: 'TabControl Panel'
    },
    'close-prompt': {
      template: 'public/browser-extension.html',
      entry: './src/popup/close-prompt/main.js',
      title: 'Keep Tab?'
    },
    options: {
      template: 'public/browser-extension.html',
      entry: './src/options/main.js',
      title: 'Options'
    },
    standalone: {
      template: 'public/browser-extension.html',
      entry: './src/standalone/main.js',
      title: 'Standalone',
      filename: 'index.html'
    }
  },
  pluginOptions: {
    browserExtension: {
      componentOptions: {
        background: {
          entry: 'src/background.js'
        },
        contentScripts: {
          entries: {
            'content-script': [
              'src/content-scripts/content-script.js'
            ]
          }
        }
      },
      extensionReloaderOptions: {
        port: 9091
      },
      manifestTransformer: manifest => {
        if (process.env.BROWSER === 'gecko' ) {
          manifest.background = { page: 'background.html' };
          manifest.commands = {
            'goto-tab-1': {
              'suggested_key': {
                'default': 'Ctrl+1'
              },
              'description': 'Go to 1st tab'
            },
            'goto-tab-2': {
              'suggested_key': {
                'default': 'Ctrl+2'
              },
              'description': 'Go to 2nd tab'
            },
            'goto-tab-3': {
              'suggested_key': {
                'default': 'Ctrl+3'
              },
              'description': 'Go to 3rd tab'
            },
            'goto-tab-4': {
              'suggested_key': {
                'default': 'Ctrl+4'
              },
              'description': 'Go to 4th tab'
            },
            'goto-tab-5': {
              'suggested_key': {
                'default': 'Ctrl+5'
              },
              'description': 'Go to 5th tab'
            },
            'goto-tab-6': {
              'suggested_key': {
                'default': 'Ctrl+6'
              },
              'description': 'Go to 6th tab'
            },
            'goto-tab-7': {
              'suggested_key': {
                'default': 'Ctrl+7'
              },
              'description': 'Go to 7th tab'
            },
            'goto-tab-8': {
              'suggested_key': {
                'default': 'Ctrl+8'
              },
              'description': 'Go to 8th tab'
            },
            'goto-last-tab': {
              'suggested_key': {
                'default': 'Ctrl+9'
              },
              'description': 'Go to last tab'
            }
          }
        }
        return manifest
      }
    }
  },
  configureWebpack: {
    // resolve: {
    //   alias: require('./aliases.config').webpack
    // },
    resolve: {
      alias: {
        icons: path.resolve(__dirname, 'node_modules/vue-material-design-icons' )
      }
    },
    plugins: [
      new CopyPlugin([{
        from: path.join( __dirname, 'src/background.html' ),
        to: path.join( __dirname, 'dist/background.html' ),
      }])
    ],
    devtool: 'source-map'
  },
}
