/*
 * fis sm
 */

'use strict';

var fis = module.exports = require('fis');

fis.cli.name = 'sm';

//package.json
fis.cli.info = fis.util.readJSON(__dirname + '/package.json');

fis.require.prefixes = ['sm', 'fis'];

// 覆盖fis kernel 的 release api
fis.release = require('./lib/release.js');
