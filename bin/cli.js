#!/usr/bin/env node

/**
 * @see: https://www.npmjs.com/package/yargs
 */
const yargs = require('yargs');
const { start } = require('../src');

const argv = yargs
  .option('url', {
    alias: 'u',
    describe: 'URL with {{parameter}}',
  })
  .option('from', {
    alias: 'f',
    describe: 'Provide an initial value from count should start',
    default: 0,
  })
  .option('to', {
    alias: 't',
    describe: 'Provide an last value when count ends',
    default: 10,
  })
  .option('verbose', {
    alias: 'v',
    describe: 'Display endpoints which refused',
  })
  .demandOption(['url'], 'Please provide url argument to work with this tool')
  .help().argv;

start(argv);
