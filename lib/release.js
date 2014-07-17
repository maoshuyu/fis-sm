function getDepsDir() {
    var deps = fis.config.get('smdeps'),
    rets = [], tmps = [];

    if (!deps) {
        return rets; 
    }

    if (deps.file && deps.file.length > 0) {
        tmps.length = 0;
        deps.file.forEach(function(file) {
            var content, dirs;        

            file = fis.file(file);

            if (file.ext === '.html') {
                content = file.getContent();
                if (content) {
                    dirs = content.match(/<!--inline\[([^\]]+)\]-->/ig);
                    if (dirs && dirs.length > 0) {
                        dirs.forEach(function(dir, i) {
                            dir = dir.replace(/<!--inline\[|\]-->|index.*\.html/ig, '');
                            dir = fis.util.realpath(dir);
                            tmps.push(dir);
                        });
                    }
                }
            }
        });

        rets = rets.concat(tmps);
    }

    if (deps.dir && deps.dir.length > 0) {
        tmps.length = 0;
        deps.dir.forEach(function(dir) {
            tmps.push(fis.util.realpath(dir));     
        }); 

        rets = rets.concat(tmps);
    }

    return rets;
}

function getSource() {
    var dirs = getDepsDir(),
    deps = fis.config.get('smdeps'),
    include = fis.config.get('project.include'),
    exclude = fis.config.get('project.exclude'),
    source = {};

    dirs.forEach(function(dir, i) {
        fis.util.find(dir, null, null).forEach(function(file){
            file = fis.file(file);
            if(file.release && fis.util.filter(file.subpath, include, exclude)){
                source[file.subpath] = file;
            }
        });
    });

    if (deps && deps.file && deps.file.length > 0) {
        deps.file.forEach(function(file) {
            file = fis.file(fis.util.realpath(file));            
            if(file.release && fis.util.filter(file.subpath, include, exclude)){
                source[file.subpath] = file;
            }
        }); 
    }

    /*fis.util.map(source, function(key) {
        console.log(key); 
    });*/

    return source;
}

/**
 * @type {Function}
 * @param {Object} [opt]
 * @param {Function} callback
 * opt = {
 *     include : {RegExp} find include filter,
 *     exclude : {RegExp} find exclude filter,
 *     debug    : {Boolean} debug model,
 *     optimize : {Boolean} if optimize,
 *     pack     : {Boolean|String} if package,
 *     lint     : {Boolean} if lint,
 *     test     : {Boolean} if test,
 *     hash     : {Boolean} if with hash,
 *     domain   : {Boolean} if with domain,
 *     beforeEach : {Function} before compile each file callback,
 *     afterEach : {Function} after compile each file callback,
 *     beforePack : {Function} before pack file callback,
 *     afterPack : {Function} after pack file callback
 * }
 */
var exports = module.exports = function(opt, callback){
    if(typeof opt === 'function'){
        callback = opt;
        opt = {};
    } else {
        opt = opt || {};
    }
    var ret = {
        src : getSource(),
        ids : {},
        pkg : {},
        map : {
            res : {},
            pkg : {}
        }
    };
    opt.hash = opt.md5 > 0;
    fis.compile.setup(opt);

    fis.util.map(ret.src, function(subpath, file){
        if(opt.beforeEach) {
            opt.beforeEach(file, ret);
        }
        file = fis.compile(file);
        if(opt.afterEach) {
            opt.afterEach(file, ret);
        }
        if(file.release && file.useMap) {
            //add resource map
            var id = file.getId();
            ret.ids[id] = file;
            if(file.isJsLike){
                file.addSameNameRequire('.css');
            } else if(file.isHtmlLike){
                file.addSameNameRequire('.js');
                file.addSameNameRequire('.css');
            }
            var res = ret.map.res[id] = {
                uri  : file.getUrl(opt.hash, opt.domain),
                type : file.rExt.replace(/^\./, '')
            };
            for(var key in file.extras){
                if(file.extras.hasOwnProperty(key)){
                    res.extras = file.extras;
                    break;
                }
            }
            if(file.requires && file.requires.length){
                res.deps = file.requires;
            }
        }
    });
    
    //project root
    var root = fis.project.getProjectPath();
    
    var ns = fis.config.get('namespace');
    
    //get pack config
    var conf = fis.config.get('pack');
    if(typeof conf === 'undefined'){
        //from fis-pack.json
        var file = root + '/fis-pack.json';
        if(fis.util.isFile(file)){
            fis.config.set('pack', conf = fis.util.readJSON(file));
        }
    }
    
    //package callback
    var cb = function(packager, settings, key){
        fis.log.debug('[' + key + '] start');
        packager(ret, conf, settings, opt);
        fis.log.debug('[' + key + '] end');
    };
    
    //prepackage
    fis.util.pipe('prepackager', cb, opt.prepackager);
    
    //package
    if(opt.pack){
        //package
        fis.util.pipe('packager', cb, opt.packager);
        //css sprites
        fis.util.pipe('spriter', cb, opt.spriter);
    }
    
    //postpackage
    fis.util.pipe('postpackager', cb, opt.postpackager);
    
    //create map.json
    var map = fis.file(root, (ns ? ns + '-' : '') + 'map.json');
    if(map.release){
        map.setContent(JSON.stringify(ret.map, null, opt.optimize ? null : 4));
        ret.pkg[map.subpath] = map;
    }
    
    //done
    if(callback){
        callback(ret);
    }
}
