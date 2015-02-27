var html = require('htmlparser2')
var req = require('request')

function BaseParser() {
  html.Parser.apply(this, arguments);
  this.prop = function(prop, val) {
    this._cbs[prop] = val
    this[prop] = this._cbs[prop]
  }
}

BaseParser.prototype = Object.create(html.Parser.prototype)

function parseUrls(args,base,site,end){
  var results = [];
  var re = /\/web\/[0-9]+\/http:\/\/www.jw.org.*/
  args.forEach(function(val,idx,arr){
    var urlparser = new BaseParser({
      onopentag: function(name, attr) {
        if (name === "a" && re.test(attr.href)) {
          var url = attr.href
          if (url.lastIndexOf('/') < url.length - 1)
            url = url + '/'
          this.results.push(base + url);
        }
      }
    })
    urlparser.prop('results',results) 
    var url = base + val + site;

    console.log(url)
    req.get(url)
      .on('error', function(err) {
        console.log(err)
      }).on('data', function(data) {
        urlparser.write(data)
      }).on('end', function() {
        urlparser.end();
        if (idx == arr.length - 1 && typeof end == 'function') {
            end(urlparser.results)
        }
      })
  })

}
function parsePages(urls,end){
  var allresults = {}
  var reTam = /_(xs|sm|md|lg|xg)\./
  var reId = /.*\/([0-9]+)_.*jpg$/
  var tams = ['xs', 'sm', 'md', 'lg', 'xg'];

  urls.splice(2,Number.MAX_VALUE)
  urls.forEach(function(url,idx,arr){
    console.log(url)
      var pageparser = new BaseParser({
        onopentag: function(name, attr) {
        /*if (name === 'img' && 
             (attr.class === 'sliderImg' || 
              attr.class === 'east_left half')) {
          var id = reId.exec(attr.src)[1]
          this.curr = id
          //console.log('set id ' + id)
          if (!this.results[id])
            this.results[id] = {
              'url': this.url,
              'images': {}
            }
          for (var j in tams)
            if(!this.results[id].images[tams[j]]){
              var urlidx = attr.src.replace(reTam, '_' + tams[j] + '.')
              this.results[id].images[tams[j]] = urlidx;
            }
        }else*/
        if(name === 'span' && attr.class === 'jsRespImg' && 
          (attr['data-img-type'] === 'cnt' || attr['data-img-type'] === 'pnr' )){
          for(var att in attr){
            var tam = /data-img-size-(.+)/.exec(att)
            if(tam){
              tam = tam[1]
              var id = reId.exec(attr[att])[1]
              this.curr = id
              if (!this.results[id])
                this.results[id] = {
                  'url': this.url,
                  'images': {}
                }
              this.results[id].images[attr['data-img-type']+'_'+tam] = attr[att];  
            }
          }
        }else if (name === 'div') {
          if (attr.class && attr.class.indexOf('jsImgDescr') > -1) {
            this.divcount = this.divcount + 1
            if(!this.results[this.curr]['info']){
              this.results[this.curr]['info'] = {
                  'title':{},
                  'facts':{},
                  'population':{},
                  'ministers':{},
                  'congregations':{},
                  'ratio':{}
                }
              //console.log(this.url + ' Init info %s %s', this.divcount,this.curr)
            }
          } else if (this.divcount) {
            this.divcount = this.divcount + 1
            //console.log(this.url + ' Found div ' + this.divcount)
          }
        }
        if(this.divcount){
          this.title = this.title || name === 'h2'
          this.facts = this.facts || name === 'h3'
          if(name === 'li'){
            this.factsData = this.factsData + 1
          }
        }
      },
      onclosetag: function(name) {
        if (this.divcount) {
          if (name === 'div') {
            //console.log(this.url + ' Closed div ' + this.divcount)
            this.divcount = this.divcount - 1
          } else if(this.title && name === 'h2')this.title = false
          else if(this.facts && name === 'h3')this.facts = false
          else if(this.factsData == 4 && name === 'li') this.factsData = 0
        }
      },
      ontext: function(text) {
        text = text.trim()
        text = text.replace(/.*\\n.*/, '')
        if (this.divcount) {
          if(text.length){
              var sel = ''
              switch(this.factsData){
                case 1: sel = 'population';break;
                case 2: sel = 'ministers';break;
                case 3: sel = 'congregations';break;
                case 4: sel = 'ratio';break;
                default:
                  if(this.facts)sel = 'facts'
                  else if(this.title) sel ='title'
              }
              if(sel.length){
                this.results[this.curr].info[sel][text] = true
              }
          }
        }
      }
    });
    pageparser.prop('results',allresults)
    pageparser.prop('divcount', 0)
    pageparser.prop('curr', "")
    pageparser.prop('title',false)
    pageparser.prop('facts',false)
    pageparser.prop('factsData',0)
    pageparser.prop('url',url)

    req.get(url)
      .on('error', function(err) {
        console.log(err)
      }).on('data', function(data) {
        pageparser.write(data);
      }).on('end', function() {
        pageparser.end();
        console.log(pageparser.results)
        if (idx == arr.length - 1 && typeof end == 'function') {
          end(pageparser.results)  
        }
      });
  })
}
function connect(dbname,func){
    // default to a 'localhost' configuration:
    var connection_string = 'mongodb://127.0.0.1:27017/'+dbname;
    // if OPENSHIFT env variables are present, use the available connection info:
    if(process.env.OPENSHIFT_MONGODB_DB_PASSWORD){
        connection_string = 'mongodb://'+
        process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
          process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
            process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
              process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
                process.env.OPENSHIFT_APP_NAME;
    }
    var db = require('mongodb').MongoClient
    console.log(connection_string);
    db.connect(connection_string,function(err,mongo){
      if(err){
        console.log(err)
        throw err;
      }
      func(mongo);
    })
}
function set(o,map){
  var set = []
  for(var i in o)set.push(map?map(i,o[i]):i)
  return set;
}
connect('jwscenes',function(mongo){
  var jw = mongo.collection('jwscenes')
  console.log(jw.find().toArray(function(err,docs){
    if(!docs.length){
        parseUrls(process.argv.slice(4),process.argv[2],process.argv[3],function(arr){
        parsePages(arr,
        function(o){
          o = set(o,function(idx,it){
            it._id = idx
            for(var info in it.info){
              it.info[info] = set(it.info[info])
            }
            return it;
          });
          console.log(o)
       
          var jw = mongo.collection('jwscenes');
          jw.insert(o,function(err,res){
            console.log(arguments)
            try{
              if(err){
                console.log(err)
                throw err
              }
              console.log(res)
            }finally{
              mongo.close()
            }
          })
        })
      });
    }
  })
  mongo.close();
})
