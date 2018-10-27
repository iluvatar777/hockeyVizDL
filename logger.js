"use strict"

const path = require('path');
const logger = require('winston');
const format = logger.format;
const config = require('config');

const formatFunc = format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)

logger.remove(logger.transports.Console);  
logger.add(new logger.transports.Console({
	level : config.get('logger.consoleLevel'),
    format: format.combine(
      format.timestamp(),
      format.colorize(),
      formatFunc
    )
}));
logger.add(new logger.transports.File({
	filename : path.join(config.get('logger.dir'),'/activity.log'),
	level : config.get('logger.fileLevel'),
    format: format.combine(
      format.timestamp(),
      formatFunc
    ),
	datePattern: '.yyyy-MM-dd',
	maxsize : 12500000	// 100 Mb
}));

module.exports = logger;