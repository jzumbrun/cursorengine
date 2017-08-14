const config = require('./config'),
    parser = require('body-parser'),
    compression = require('compression'),
    logger = require('./lib/logger'),
    site = require('./lib/site'),
    _ = require('./lib/mixins'),

    // Finally the server object
    express = require('express'),
    server = express()



/**
 *  Define the server
 */
class CursorEngine {

    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    terminator(sig) {
        if (typeof sig === 'string') {
            console.log('%s: Received %s - terminating server ...',
                Date(Date.now()), sig)
            process.exit(1)
        }
        console.log('%s: Node server stopped.', Date(Date.now()))
    }

    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    setupTerminationHandlers() {
        //  Process on exit and signals.
        process.on('exit', () => {
            this.terminator()
        })

        // Removed 'SIGPIPE' from the list - bugz 852598.
        let signals = ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
            'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ]
        signals.forEach((element, index, array) => {
            process.on(element, () => this.terminator(element))
        })
    }


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    initialize() {

        server.use(compression())
        server.use(express.static(config.base + '/public'))
        server.use(parser.json())
        server.use(parser.urlencoded({ extended: true }))

        // View engine setup
        server.set('view engine', 'ejs')

        // Build the site
        site.build(server)

        // Error handlers
        this.errors(server)

        // Stream info logs now
        logger.streamInfo()

    }

    /**
     *  Set Error Handlers
     */
    errors() {

        server.use((err, req, res, next) => {
            if (err.constructor.name === 'UnauthorizedError') {
                res.status(401).send('unauthorized')
            }
        })

        // catch 404 and forward to error handler
        server.use((req, res, next) => {
            let err = new Error('not_found')
            err.status = 404
            next(err)
        })

        // development error handler
        // will print stacktrace
        if (config.env === 'development') {
            server.use((err, req, res, next) => {
                res.status(err.status || 500)
                res.send({
                    message: err.message,
                    error: err
                })
            })
        }

    }

    /**
     *  Start the server (starts up the sample serverlication).
     */
    start() {

        // Lets start the fatal logging before anything
        logger.streamFatal()

        this.setupTerminationHandlers()

        // Create the express server and routes.
        this.initialize()

        server.listen(config.port, (err) => {
            console.log('CursorEngine Server started at %s on %s:%d ...', Date(Date.now()), '127.0.0.1', config.port)
        })

    }

}

var cursorengine = new CursorEngine()
cursorengine.start()