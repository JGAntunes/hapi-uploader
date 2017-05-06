# hapi-uploader
Hapi plugin allowing easy and configurable file uploads

[![Build Status](https://travis-ci.org/JGAntunes/hapi-uploader.svg?branch=master)](https://travis-ci.org/JGAntunes/hapi-uploader)
[![npm version](https://img.shields.io/npm/v/hapi-uploader.svg)](https://www.npmjs.com/package/hapi-uploader)

# Introduction

Creating a simple route to allow file uploads is pure madness. This plugin allows to register multiple configurable routes, with validation included, that make the burden of file uploading like a walk in the park.

This plugin runs only on Node >=4.0.0.

# Example

```javascript
const Hapi = require('hapi')

const server = new Hapi.Server()
server.connection({ port: 8080 })

server.register({
  register: require('hapi-uploader'),
  options: {
    upload: {path: './'}
  }
}, (err) => {
  if (err) {
    console.log('Failed loading plugin', err)
    process.exit(1)
  }
  server.start((err) => {
    if (err) {
      console.log('Failed to start the server', err)
      process.exit(1)
    }
    console.log('Server running on - ' + server.info.port)
  })
})
```

# API

## Options
- `upload` - the upload configuration object
    - `path` - mandatory path to where the files should be uploaded
    - `[generateName]` - optional function to generate the file names used. It must follow the generateName function signature
    - `[maxBytes]` - optional number, detailing the max bytes size allowed per file
- `[route]` - optional route configuration object similar to the one used in hapi
    - `[path]` - optional route path, defaults to `/files`
    - `[auth]` - auth object like the one specified by the hapi framework, defaults to `false`
    - `[cors]` - the Cross-Origin Resource Sharing options. CORS headers are disabled by default (false). To enable, set cors to true, or to an object specified by the hapi framework.
    - `[tags]` - tags array like the one specified by the hapi framework, defaults to `undefined`
    - `[validate]` - optional route validation configuration file
        - `[query]` - query validation object like the one specified by the hapi framework
        - `[params]` - params validation object like the one specified by the hapi framework
        - `[headers]` - headers validation object like the one specified by the hapi framework
        - `[auth]` - auth validation object like the one specified by the hapi framework
        - `[filename]` - optional Joi validation object to validate the received filename for each file
        - `[extensions]` - optional array containing the valid file extensions allowed (**use either this option or `mimeTypes` not both**)
        - `[mimeTypes]` - optional array containing the valid [mime types](https://en.wikipedia.org/wiki/Media_type) allowed (**use either this option or `extensions` not both**)
- `[preUpload]` - optional method to run before an upload request. It must follow the preUpload function signature
- `[postUpload]` - optional method to run after an upload request. It must follow the postUpload function signature

## generateName(fileName, request)
Method that runs prior to the upload used to generate the name for the file in question. It receives the `fileName` with which the file was uploaded and the `request` object such as detailed by the hapi framework. It will run for each file received and it **must return a string** which will be used to name the file.

## preUpload(request, reply)
Method that runs prior to the upload through the route pre-methods documented on the hapi framework. It receives the `request` and `reply` object such as detailed by the hapi framework. The response passed to the reply method will be saved on a pre key on the request object and will be available on the `postUpload` method through `request.pre.preUpload`

## postUpload(request, reply)
Method that runs after the upload through the route pre-methods documented on the hapi framework. It receives the `request` and `reply` object such as detailed by the hapi framework. It is possible to access both the results of the `preUpload` method (if any) and the upload through the request object - `request.pre.preUpload` and `request.pre.file`. The response passed to the reply method will be saved on a pre key on the request object and **will be used as response** to the request.

## request.pre.file
This will be the response from the upload and will be available on the `postUpload` method. It will be an object as follows:
```
{
  mimeType: 'The file mime type',
  name: 'The name with which the file was stored'
  path: 'Relative path used to save the file'
  extension: 'The file extension'
}
```

## Response
The default response, when no error occurred, will be the `request.pre.file`, without the path prop, which is the result of the upload method. To override the default behaviour return a response on the `postUpload` method which will be used has response to the client instead.
The default will be an object as follows:
```
{
  mimeType: 'The file mime type',
  name: 'The name with which the file was stored'
  extension: 'The file extension'
}
```

# Contributing

This project uses [standard js](https://github.com/feross/standard).

# License

MIT
