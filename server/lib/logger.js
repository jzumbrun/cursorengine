const Bunyan = require('bunyan'),
    config = require('../config')

/**
 * Logger
 * Log stuff
 */
class Logger {

    constructor(){
        this.logger = new Bunyan({
            name: 'contestfarm',
            serializers: Bunyan.stdSerializers
        })
    }

    /**
     * Stream info
     */
    streamInfo(){
        // Not Yet
        // const MongoDBStream = require('bunyan-mongodb-stream')
        // this.logger.addStream({   
        //     level: 'info',
        //     stream: MongoDBStream({model: require('../logs/models/log_model')})
        // })

    }

    /**
     * Stream Fatal
     */
    streamFatal(){
        const BunyanNodeMailer = require('bunyan-nodemailer')

        this.logger.addStream({   
            type: 'raw',
            level: 'fatal',
            stream: new BunyanNodeMailer({
                from: config.logger.fatal.from,
                to: config.logger.fatal.to,
                transport: config.sparkpost.smtp
            })
        })

        // Catch and email fatal issues
        process.on('uncaughtException', err => {
            this.logger.fatal(err, 'Uncaught Exception')
            process.exit(1);
        })
    }

    /**
     * Info level
     */
    info() {
        this.logger.info.apply(this.logger, arguments)
    }

    /**
     * Fatal level
     */
    fatal() {
        this.logger.fatal.apply(this.logger, arguments)
    }

}

module.exports = new Logger()