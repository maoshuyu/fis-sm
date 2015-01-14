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


fis.config.merge({

    roadmap : {
        ext : {
            sass : 'css',
            scss : 'css'
        },
        path : [
            {
                //前端模板
                reg : '**.tmpl',
                //当做类html文件处理，可以识别<img src="xxx"/>等资源定位标识
                isJsLike : true,
                //只是内嵌，不用发布
                release : false
            }
        ]
    },

    modules : {
        //fis插件配置
        parser : {
            //.tmpl后缀的文件使用fis-parser-utc插件编译
            tmpl : 'utc',
            sass : 'sass',
            scss : 'scss'
        }
    },

    settings : {
        parser : {
            'utc': {
                variable: 'obj'
            }
        }
    }
});

