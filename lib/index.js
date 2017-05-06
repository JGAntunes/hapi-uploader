'use strict'

const pkg = require('../package.json')
const fs = require('fs')
const Async = require('async')
const Hoek = require('hoek')
const Boom = require('boom')
const Validation = require('./helpers/validation')
const Uploader = require('./uploader')

function fileUploader (server, options, next) {
  options = Hoek.clone(options || {})
  const routeOptions = options.route || {}
  const uploadOptions = options.upload || {}
  const path = routeOptions.path || '/files'
  const tags = routeOptions.tags
  const cors = routeOptions.cors
  const auth = routeOptions.auth || false
  const maxBytes = uploadOptions.maxBytes
  const log = server.log
  // TODO best practice?
  uploadOptions.log = server.log

  Async.waterfall([
    errorValidation,
    setPreMethods,
    defineRoute
  ], (err) => next(err))

  function errorValidation (cb) {
    let methods = {}
    if (uploadOptions.generateName) {
      if (typeof uploadOptions.generateName !== 'function') {
        return cb(new Error('Generate name must be a function'))
      }
      methods.generateName = uploadOptions.generateName
    }
    if (options.preUpload) {
      if (typeof options.preUpload !== 'function') {
        return cb(new Error('Pre upload must be a function'))
      }
      methods.pre = options.preUpload
    }
    if (options.postUpload) {
      if (typeof options.postUpload !== 'function') {
        return cb(new Error('Post upload must be a function'))
      }
      methods.post = options.postUpload
    }
    if (!uploadOptions.path) {
      return cb(new Error('Must define a path to upload files'))
    }
    fs.access(uploadOptions.path, fs.W_OK, (err) => {
      if (err) {
        return cb(new Error(
          'Must define a valid accessible path to upload files - ' +
          err
        ))
      }
      return cb(null, methods)
    })
  }

  function setPreMethods (methods, cb) {
    const upload = Uploader(uploadOptions)
    const pre = []
    const uploadMethod = function (request, reply) {
      let options = {}
      if (request.pre.fileNames) options.fileNames = request.pre.fileNames
      return upload(request.payload, options, reply)
    }
    const fileNamesMethod = function (request, reply) {
      let names = {}
      Async.forEachOf(request.payload, (item, key, cb) => {
        try {
          names[key] = methods.generateName(item.hapi.filename, request)
        } catch (e) {
          return cb(e)
        }
        cb()
      }, (err) => {
        if (err) {
          log(['error'], err)
          return reply(Boom.internal())
        }
        reply(null, names)
      })
    }

    if (methods.generateName) {
      pre.push({method: fileNamesMethod, assign: 'fileNames'})
    }
    if (methods.pre) pre.push({method: methods.pre, assign: 'preUpload'})
    pre.push({method: uploadMethod, assign: 'file'})
    if (methods.post) pre.push({method: methods.post, assign: 'postUpload'})
    return cb(null, pre)
  }

  function defineRoute (pre, cb) {
    let validate
    try {
      validate = Validation(routeOptions.validate)
    } catch (e) {
      return cb(e)
    }

    server.route({
      method: 'POST',
      path,
      config: {
        tags,
        cors,
        auth,
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes
        },
        validate,
        pre,
        handler: function (request, reply) {
          if (request.pre.postUpload) return reply(request.pre.postUpload)
          let response = Hoek.clone(request.pre.file)
          delete response.path
          reply(response)
        },
        description: 'Uploads a file'
      }
    })
    return cb()
  }
}

fileUploader.attributes = {
  name: pkg.name,
  version: pkg.version,
  multiple: true
}

module.exports = fileUploader
