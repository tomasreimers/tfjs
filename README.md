# TFJS

## About

TFJS is a library that wraps and it easier to interact with the compiled version of TensorFlow.js (https://github.com/tomasreimers/tensorflowjs).

## Installing

Before you can use TFJS, you must have a copy of the compiled version of TensorFlow.js (found [here](https://github.com/tomasreimers/tensorflowjs)). Unfortunately the size of TensorFlow.js means that it can't be uglified or babelified (as doing so will exhaust memory in those gulp plugins, at least in our experience), but must be included separately.

We recommend doing `git clone https://github.com/tomasreimers/tensorflowjs` in the root of your website or node script.

## Usage

### Creating a TFJS Instance

Because TFJS wraps TensorFlow.js, it must first be made aware of where the emscripten module (exported by TensorFlow.js) is.

```
const TFJS = require('tfjs');

let tfjs = TFJS(window.TensorFlowJS); // or similar
```

We recognize that actually creating the emscripten module can be a bother, and so we expose two additional methods to create a TFJS instance:

```
// for node
const TFJS = require('tfjs');

let tfjs = TFJS.for_node("./path/to/tensorflowjs/directory/");
```

```
// for the browser
const TFJS = require('tfjs');

let tfjs_promise = TFJS.for_browser("/url/to/tensorflowjs/directory/");

// NOTE: This returns a promise, so to get tfjs, use then:
tfjs_promise.then(function (tfjs) {
  /*
   * You can call then multiple times, so no need to worry about saving it to
   * another variable, and you can also use this promise to see when the
   * library is done loading.
   */
});
```

### Interacting with a TFJS Instance

Before you can interact with a TFJS instance, you need to be able to create two things:
 - Graph Protobufs
 - Tensor Protobufs

#### Creating Graph Protobufs

```
// for node

const graph_buf = fs.readFileSync('../graphs/example_graph.pb');
const graph_bufview = new Uint8Array(graph_buf);
let graph = "";
for (let ii = 0; ii < graph_bufview.length; ii++) {
  graph += String.fromCharCode(graph_bufview[ii]);
}
```

```
// for the browser

function loadGraph(graph) {
  return new Promise(function (resolve, reject) {
    var oReq = new XMLHttpRequest();
    oReq.open("GET", graph, true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function (oEvent) {
      var arrayBuffer = oReq.response; // Note: not oReq.responseText
      if (arrayBuffer) {
        var byteArray = new Uint8Array(arrayBuffer);

        // convert to string
        let graph = "";
        for (let ii = 0; ii < byteArray.length; ii++) {
          graph += String.fromCharCode(byteArray[ii]);
        }

        resolve(graph);
      }
    };

    oReq.send(null);
  });
}

let graph_promise = loadGraph("/graphs/example_graph.pb");
graph_promise.then(function (graph) {
  // ...
});
```

#### Creating Tensor Protobufs

To create tensor protobufs, we use [tensorjs](https://www.npmjs.com/package/tensorjs). See that readme for a much more detailed explanation. Although the tl;dr is:

```
const tensorjs = require('tensorjs');

tensorjs.intTensor([[1, 2], [3, 4]]); // returns a string for the protobuf of the tensor
```

#### Calling the TFJS Session & Run

To actually call the graph, you have to construct a session, and then you can perform runs against it (passing a feed dictionary of tensors and an array detailing which tensors to fetch).

We tried to make this API mirror the python API for TensorFlow as much as possible.

```
new tfjs.Session(graph_pb)
```

 - `graph_pb`: The protobuf representing the graph for this session.
 - `RETURNS`: A session object.

```
session.run(feed_dict, fetches)
```

- `feed_dict`: A dictionary mapping tensor names to tensors.
- `fetches`: An array of tensor names to fetch.
- `RETURNS`: An array of the same length of fetches with the respective values for all the tensors requested.

Example:

```
/*  
 * simple_addition_graph is basically just:
 *
 * tf.add(
 *   tf.placeholder(name="x"),
 *   tf.placeholder(name="y"),
 *   name="output"     
 * );
 */

const sess = new lib.Session(simple_addition_graph);
const results = sess.run(
  {
    "x": tensorjs.intTensor(40),
    "y": tensorjs.intTensor(2)
  },
  ["output"]
);
console.log(results[0]); // 42
```

#### Calling TFJS Convenience Methods

We understand that certain methods can be tedious to constantly rewrite, and are common; for that reason, we provide them on the tfjs instance object.

```
tfjs.image_ops.get_array(canvas_image_data, grayscale, mean, std);
```

 - `canvas_image_data`: An image_data object
 - `grayscale`: Whether to have 1 color channel (instead of 3)
 - `mean`: All data will be transformed with: `(value - mean) / std`
 - `std`: See above
 - `RETURNS`: A rank-4 tensor encoding the image. Out of convention it is stored as [batch, height, width, channel] for tensorflow graphs.


Example:

```
// ...ctx is a canvas context
const img_data = ctx.getImageData(0, 0, WIDTH, HEIGHT);

tfjs.image_ops.get_array(img_data, true, 0, 1);
```

## License & Author

Copyright 2017 Tomas Reimers

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
