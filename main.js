var html = require("htmlparser2")
var req = require("request")

function main(args) {
  var re = /\/web\/[0-9]+\/http:\/\/www.jw.org.*/
  var reTam = /_(xs|sm|md|lg|xg)\./
  var reId = /.*\/([0-9]+)_.*jpg$/
  var tams = ['xs', 'sm', 'md', 'lg', 'xg'];
  var base = "",
    site = "";

  function BaseParser() {
    html.Parser.apply(this, arguments);
    this.prop = function(prop, val) {
      this._cbs[prop] = val
      this[prop] = this._cbs[prop]
    }
  }

  BaseParser.prototype = Object.create(html.Parser.prototype)
  var alltext = []
  args.forEach(function(val, idx, arr) {
    if (idx < 2);
    else if (idx == 2) base = val;
    else if (idx == 3) site = val;
    else {
      var url = base + "/web/" + val + '*/' + site;
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
      urlparser.prop('results',[]) 

      req.get(url)
        .on('error', function(err) {
          console.log(err)
        }).on('data', function(data) {
          urlparser.write(data)
        }).on('end', function() {
          urlparser.end();

          if (idx == arr.length - 1) {
            //urlparser.results.splice(2, Number.MAX_VALUE)
            var results = {}
            urlparser.results.forEach(function(url, idx, arr) {
              var pageparser = new BaseParser({
                onopentag: function(name, attr) {
                  if (name === 'img' && 
                       (attr.class === 'sliderImg' || 
                        attr.class === 'east_left half')) {
                    var id = reId.exec(attr.src)[1]
                    this.curr = id
                    //console.log('set id ' + id)
                    if (!results[id])
                      results[id] = {
                        'url': url,
                        'images': {}
                      }
                    for (var j in tams) {
                      var urlidx = attr.src.replace(reTam, '_' + tams[j] + '.')
                      results[id].images[urlidx] = true;
                    }
                  } else if (name === 'div') {
                    if (attr.class && attr.class.indexOf('jsImgDescr') > -1) {
                      this.divcount = this.divcount + 1
                      if(!results[this.curr]['info']){
                        results[this.curr]['info'] = {}
                        //console.log(this.url + ' Init info %s %s', this.divcount,this.curr)
                      }
                    } else if (this.divcount) {
                      this.divcount = this.divcount + 1
                      //console.log(this.url + ' Found div ' + this.divcount)
                    }
                  }
                },
                onclosetag: function(name) {
                  if (this.divcount) {
                    if (name === 'div') {
                      //console.log(this.url + ' Closed div ' + this.divcount)
                      this.divcount = this.divcount - 1
                    }
                  }
                },
                ontext: function(text) {
                  text = text.trim()
                  text = text.replace(/.*\\n.*/, '')
                  if (this.divcount) {
                    //console.log('%s %s %s',this.url,this.curr, text)
                    if(text.length)
                      results[this.curr].info[text]=true
                  }
                }
              });
              pageparser.prop('divcount', 0)
              pageparser.prop('curr', "")
              pageparser.prop('url', url)
              req.get(url)
                .on('error', function(err) {
                  console.log(err)
                }).on('data', function(data) {
                  pageparser.write(data);
                }).on('end', function() {
                  pageparser.end();
                  if (idx == arr.length - 1) {
                    console.log(results)
                  }
                });
            })
          }
        })
    }
  })
}
main(process.argv);
