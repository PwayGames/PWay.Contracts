'use strict';

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;
require('winston-daily-rotate-file')

const fs = require('fs');

const logDir = '../log';
if (!fs.existsSync(logDir)) {
 fs.mkdirSync(logDir);
}

const myFormat = printf(info => {
  return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

module.exports = (prefix) => createLogger({
  format: combine(
    label({ label: prefix }),
    timestamp(),
    myFormat
  ),
 transports: [
   new transports.Console({
     level: 'debug',
     colorize: true,
     label: prefix
   }),
   new transports.DailyRotateFile({
     datePattern: 'YYYY-MM-DD',
     level: 'info',
     filename: `${logDir}/%DATE%-logs.log`,
     label: prefix
   })
 ]
});