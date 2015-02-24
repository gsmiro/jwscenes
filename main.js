var html = require("htmlparser2")
var req = require("request")
function main(args){
  var re = /\/web\/[0-9]+\/http:\/\/www.jw.org.*/
  var reTam = /_(xs|sm|md|lg|xg)\./
  var tams = ['xs','sm','md','lg','xg'];
  var base="",site = "";

  function BaseParser(){
    html.Parser.apply(this,arguments);
    this._cbs.results = []
    this.results = this._cbs.results
  }
  BaseParser.prototype = Object.create(html.Parser.prototype)

  args.forEach(function(val,idx,arr){
    if(idx < 2 );
    else if(idx == 2)base = val;
    else if(idx == 3)site = val;
    else {    
      var parser = new BaseParser({
        onopentag:function(name,attr){
          if(name === "a" && re.exec(attr.href)){
            var url = attr.href 
            if(url.lastIndexOf('/') < url.length - 1)
              url = url + '/'
            this.results.push(base + url)
          }
        }
      })
        
      var url =base + "/web/" + val + '*/' +site; 
      req.get(url)
      .on('error',function(err){
        console.log(err)
      }).on('data',function(data){
        parser.write(data)
      }).on('end',function(){
        parser.end()
        var map = {};
        parser.results.forEach(function(url,idx,arr){
          var parser = new BaseParser({
            onopentag:function(name,attr){
              if(name === 'img' && (attr.class === 'sliderImg'||attr.class === 'east_left_map')){
                for( var j in tams){
                  var url = attr.src.replace(reTam,'_'+tams[j]+'.')
                  map[url] = true;
                }
              }
            }
          });
          req.get(url)
          .on('error',function(err){
            console.log(err)
          }).on('data',function(data){
            parser.write(data);
          }).on('end',function(){
            parser.end();
            console.log(map)
          });
        })
      })
    }
  })
}
main(process.argv);

