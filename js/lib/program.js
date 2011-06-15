function Program() {}

Program.load = function(url, cb) {
  var wrapper = function() {
    onmessage = function(e) {
      var data = e.data;
      var index = data.index;
      var ret;
      try {
        ret = program[data.program][data.action].apply({}, data.args || []);
      } catch(e) {
        e.message += ' Data: ' + JSON.stringify(data);
        return postMessage({
          index: index,
          err: e
        });
      }
      postMessage({
        index: index,
        ret: ret
      });
    };
  };
  $.get(url, function(data) {
    var code = 'var program = {' + data + '};\n(' + wrapper.toString() + ')()\n;';
    console.log(code);
    var bb = new (window.BlobBuilder|| window.WebKitBlobBuilder || window.MozBlobBuilder)();
    bb.append(code);

    var blobURL = (window.URL || window.webkitURL || window.mozURL).createObjectURL(bb.getBlob());
    var worker = new Worker(blobURL);

    var index  = 0;
    var cbs = {};
    worker.onmessage = function(e) {
      var data = e.data;
      var cb = cbs[data.index];
      if(cb) {
        delete cbs[data.index];
      } else {
        console.log('Missing cb or double invocation for index ' + data.index);
        return;
      }
      if(data.err) {
        var e = new Error;
        for(var field in data.err) {
          e[field] = data.err[field];
        }
        cb(e);
      } else {
        cb(null, data.ret);
      }
    };
    var caller = function(program, action, args, cb) {
      worker.postMessage({
        index: index,
        program: program,
        action: action,
        args: args
      });
      cbs[index] = cb;
      index++;
    };
    cb(caller);
  }, 'html');
};
