const tensorjs = require('tensorjs');
const image_ops = require('./image_ops.js');

// utility function
function copy_array_to_vector(arr, vector) {
  for (var ii = 0; ii < arr.length; ii++) {
    vector.push_back(arr[ii]);
  }
}

function TFJS(graph_runner) {
  this.Session = function (graph_pb) {
    var self = this;
    self._session = new graph_runner.JSSession(graph_pb);
    self.run = function (inputs, outputs) {
      // because emscripten requires us to explicitly delete classes, we keep a list
      const trash_pile = [];

      // encode the inputs and outputs
      const input_pairs = [];
      const input_keys = Object.keys(inputs);
      for (let ii = 0; ii < Object.keys(inputs).length; ii++) {
        let tensor = graph_runner.parseTensor(
          inputs[input_keys[ii]]
        );
        let stpair = graph_runner.makeStringTensorPair(
          input_keys[ii],
          tensor
        )
        input_pairs.push(stpair);

        trash_pile.push(tensor);
        trash_pile.push(stpair);
      }

      const inputs_vector = new graph_runner.VectorStringTensorPair();
      const outputs_vector = new graph_runner.VectorString();

      trash_pile.push(inputs_vector);
      trash_pile.push(outputs_vector);

      copy_array_to_vector(input_pairs, inputs_vector);
      copy_array_to_vector(outputs, outputs_vector);

      // run
      const results_tensor_vector = self._session.run(inputs_vector, outputs_vector);
      const results_vector = graph_runner.tensorVectorToStringVector(
        results_tensor_vector
      );

      trash_pile.push(results_tensor_vector);
      trash_pile.push(results_vector);

      // decode the results
      const results = [];
      for (let ii = 0; ii < results_vector.size(); ii++) {
        results.push(
          tensorjs.make_array(results_vector.get(ii))
        );
      }

      // schedule cleanup
      setTimeout(() => {
        for (var ii = 0; ii < trash_pile.length; ii++) {
          trash_pile[ii].delete();
        }
      }, 0);

      // return results
      return results;
    };

    self.cleanup = function () {
      self._session.delete();
    };
  };

  this.image_ops = image_ops;
};

// constructor functions
TFJS.for_browser = function (url_for_dir) {
  url_for_dir = url_for_dir || "";

  if (url_for_dir != "" && url_for_dir[url_for_dir.length - 1] != '/') {
    throw "Path must end in a trailing slash."
  }

  let loading_promise = new Promise(function (resolve, reject) {
    window.Module = {
      memoryInitializerPrefixURL: url_for_dir,
      onRuntimeInitialized: function () {
        console.log("Emscripten initialized!");
        resolve(new TFJS(window.Module));
      }
    };
  });

  var s = document.createElement("script");
  s.type = "text/javascript";
  s.src = url_for_dir + "graph_runner.js";
  document.body.appendChild(s);

  return loading_promise;
};

TFJS.for_web_worker = function (url_for_dir) {
  url_for_dir = url_for_dir || "";

  if (url_for_dir != "" && url_for_dir[url_for_dir.length - 1] != '/') {
    throw "Path must end in a trailing slash."
  }

  let loading_promise = new Promise(function (resolve, reject) {
    self.Module = {
      // overriding this so that workers can be compiled with webpack, per https://github.com/webpack-contrib/worker-loader
      ENVIRONMENT: 'WORKER',
      memoryInitializerPrefixURL: url_for_dir,
      onRuntimeInitialized: function () {
        console.log("Emscripten initialized!");
        resolve(new TFJS(self.Module));
      }
    };
  });

  importScripts(url_for_dir + "graph_runner.js");

  return loading_promise;
};

TFJS.for_node = function (path_for_dir) {
  path_for_dir = path_for_dir || "./";

  if (path_for_dir[path_for_dir.length - 1] != '/') {
    throw "Path must end in a trailing slash."
  }

  // nasty hack to get around memory initializer non-sense
  let cwd = process.cwd();
  process.chdir(__dirname + '/' + path_for_dir);
  const graph_runner = require(path_for_dir + 'graph_runner.js');
  process.chdir(cwd);

  return new TFJS(graph_runner);
};

// export
module.exports = TFJS;
