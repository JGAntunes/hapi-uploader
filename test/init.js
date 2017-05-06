'use strict'

const Lab = require('lab')
const Code = require('code')
const Joi = require('joi')
const Mime = require('mime')
const pkg = require('../package.json')
const lab = exports.lab = Lab.script()
const Plugin = require('../lib/index')

let mockServer = {
  log: console.log
}

lab.experiment('Plugin - init', () => {
  lab.test('Correct attributes', (done) => {
    let attributes = Plugin.attributes
    Code.expect(attributes.name).to.be.equal(pkg.name)
    Code.expect(attributes.version).to.be.equal(pkg.version)
    Code.expect(attributes.multiple).to.be.true()
    done()
  })

  lab.test('No upload path', (done) => {
    Plugin(mockServer, {}, (err) => {
      Code.expect(err).to.be.instanceof(Error)
      Code.expect(err.message).to.be.equal('Must define a path to upload files')
      done()
    })
  })

  lab.test('Null options', (done) => {
    Plugin(mockServer, null, (err) => {
      Code.expect(err).to.be.instanceof(Error)
      Code.expect(err.message).to.be.equal('Must define a path to upload files')
      done()
    })
  })

  lab.test('Invalid upload path', (done) => {
    Plugin(mockServer, {upload: {path: './invalid/path'}}, (err) => {
      Code.expect(err).to.be.instanceof(Error)
      Code.expect(err.message).to.be.startWith(
        'Must define a valid accessible path to upload files - '
      )
      done()
    })
  })

  lab.test('Invalid upload path', (done) => {
    Plugin(mockServer, {upload: {path: './invalid/path'}}, (err) => {
      Code.expect(err).to.be.instanceof(Error)
      Code.expect(err.message).to.be.startWith(
        'Must define a valid accessible path to upload files - '
      )
      done()
    })
  })

  lab.test('Define route with default options', (done) => {
    mockServer.route = function (route) {
      const config = route.config
      const payload = config.payload
      Code.expect(route.method).to.be.equal('POST')
      Code.expect(route.path).to.be.equal('/files')
      Code.expect(config.tags).to.not.exist()
      Code.expect(config.auth).to.be.false()
      Code.expect(config.cors).to.not.exist()
      Code.expect(payload.output).to.be.equal('stream')
      Code.expect(payload.parse).to.be.true()
      Code.expect(payload.allow).to.be.equal('multipart/form-data')
      Code.expect(payload.maxBytes).to.not.exist()
      Code.expect(config.pre).to.be.instanceof(Array)
      Code.expect(config.pre).to.have.length(1)
      Code.expect(config.pre[0].assign).to.be.equal('file')
      Code.expect(config.validate.query).to.not.exist()
      Code.expect(config.validate.params).to.not.exist()
      Code.expect(config.validate.headers).to.not.exist()
      Code.expect(config.validate.auth).to.not.exist()
      Code.expect(config.validate.payload).to.exist()
      Code.expect(config.validate.payload.isJoi).to.be.true()
      Code.expect(config.description).to.be.equal('Uploads a file')
    }
    Plugin(mockServer, {upload: {path: './'}}, (err) => {
      Code.expect(err).to.not.exist()
      done()
    })
  })

  lab.test('Define route with given options', (done) => {
    const options = {
      upload: {
        path: './',
        maxBytes: 100
      },
      route: {
        path: '/files/{id}',
        tags: ['mock', 'upload'],
        auth: 'mock-strategy',
        cors: { origin: ['http://localhost'], credentials: true },
        validate: {
          query: Joi.object().required(),
          params: Joi.object().keys({a: Joi.string()}).required(),
          headers: Joi.object().keys({b: Joi.string()}).required(),
          auth: Joi.object().keys({c: Joi.string()}).required(),
          filename: Joi.string().valid(['mock']).required(),
          extensions: ['pdf', 'txt']
        }
      }
    }
    mockServer.route = function (route) {
      const config = route.config
      const payload = config.payload
      Code.expect(route.method).to.be.equal('POST')
      Code.expect(route.path).to.be.equal(options.route.path)
      Code.expect(config.tags).to.be.deep.equal(options.route.tags)
      Code.expect(config.cors).to.be.deep.equal(options.route.cors)
      Code.expect(config.auth).to.be.equal(options.route.auth)
      Code.expect(payload.output).to.be.equal('stream')
      Code.expect(payload.parse).to.be.true()
      Code.expect(payload.allow).to.be.equal('multipart/form-data')
      Code.expect(payload.maxBytes).to.be.equal(options.upload.maxBytes)
      Code.expect(config.pre).to.be.instanceof(Array)
      Code.expect(config.pre).to.have.length(1)
      Code.expect(config.pre[0].assign).to.be.equal('file')
      Code.expect(config.validate.query)
        .to.be.deep.equal(options.route.validate.query)
      Code.expect(config.validate.params)
        .to.be.deep.equal(options.route.validate.params)
      Code.expect(config.validate.headers)
        .to.be.deep.equal(options.route.validate.headers)
      Code.expect(config.validate.auth)
        .to.be.deep.equal(options.route.validate.auth)
      Code.expect(config.validate.payload).to.exist()
      Code.expect(config.validate.payload.isJoi).to.be.true()
      // Joi object containing file schema
      let filenameSchema = route.config.validate.payload._inner.patterns[0]
        .rule._inner.children[1].schema._inner.children[0]
      // Joi object containing content-type header
      let contentTypeSchema = route.config.validate.payload._inner.patterns[0]
        .rule._inner.children[1].schema._inner.children[1].schema._inner.children[0]
      Code.expect(contentTypeSchema.key).to.be.equal('content-type')
      // Validate extesions (need to convert from mimetypes)
      contentTypeSchema.schema._valids._set.forEach(function (mimeType) {
        let ext = Mime.extension(mimeType)
        Code.expect(options.route.validate.extensions).to.include(ext)
      })
      Code.expect().to.be.deep.equal(options.route.vali)
      Code.expect(filenameSchema.key).to.be.equal('filename')
      Code.expect(filenameSchema.schema).to.be.deep.equal(filenameSchema.schema)
      Code.expect(config.description).to.be.equal('Uploads a file')
    }
    Plugin(mockServer, options, (err) => {
      Code.expect(err).to.not.exist()
      done()
    })
  })

  lab.test('Accept validation for extensions or mimeTypes not both', (done) => {
    const options = {
      upload: {
        path: './',
        maxBytes: 100
      },
      route: {
        path: '/files/{id}',
        tags: ['mock', 'upload'],
        auth: 'mock-strategy',
        validate: {
          extensions: ['pdf', 'txt'],
          mimeTypes: ['application/pdf', 'text/plain']
        }
      }
    }
    Plugin(mockServer, options, (err) => {
      Code.expect(err).to.exist()
      Code.expect(err).to.be.instanceof(Error)
      Code.expect(err.message)
        .to.be.equal('Can\'t validate both extensions and mime type.')
      done()
    })
  })

  lab.test('Accept validation for extensions or mimeTypes not both', (done) => {
    const options = {
      upload: {
        path: './',
        maxBytes: 100
      },
      route: {
        path: '/files/{id}',
        tags: ['mock', 'upload'],
        auth: 'mock-strategy',
        validate: {
          mimeTypes: ['application/pdf', 'text/plain']
        }
      }
    }
    mockServer.route = function (route) {
      const validate = route.config.validate
      // Joi object containing content-type header
      const contentTypeSchema = validate.payload._inner.patterns[0]
        .rule._inner.children[1].schema._inner.children[1].schema._inner.children[0]
      Code.expect(contentTypeSchema.key).to.be.equal('content-type')
      // Validate extesions (need to convert from mimetypes)
      contentTypeSchema.schema._valids._set.forEach(function (mimeType) {
        Code.expect(options.route.validate.mimeTypes).to.include(mimeType)
      })
    }
    Plugin(mockServer, options, (err) => {
      Code.expect(err).to.not.exist()
      done()
    })
  })

  lab.test('MimeTypes must be an array', (done) => {
    const options = {
      upload: {
        path: './',
        maxBytes: 100
      },
      route: {
        path: '/files/{id}',
        tags: ['mock', 'upload'],
        auth: 'mock-strategy',
        validate: {
          mimeTypes: 'invalid-mimes'
        }
      }
    }
    Plugin(mockServer, options, (err) => {
      Code.expect(err).to.be.instanceof(Error)
      Code.expect(err.message).to.be.equal(
        'MimeTypes provided to validation must be an array.'
      )
      done()
    })
  })

  lab.test('Extensions must be an array', (done) => {
    const options = {
      upload: {
        path: './',
        maxBytes: 100
      },
      route: {
        path: '/files/{id}',
        tags: ['mock', 'upload'],
        auth: 'mock-strategy',
        validate: {
          extensions: 'invalid-extensions'
        }
      }
    }
    Plugin(mockServer, options, (err) => {
      Code.expect(err).to.be.instanceof(Error)
      Code.expect(err.message).to.be.equal(
        'Extensions provided to validation must be an array.'
      )
      done()
    })
  })

  lab.test('Invalid pre upload function', (done) => {
    const options = {
      upload: {
        path: './'
      },
      preUpload: 'invalid'
    }
    Plugin(mockServer, options, (err) => {
      Code.expect(err).to.be.instanceof(Error)
      Code.expect(err.message).to.be.equal(
        'Pre upload must be a function'
      )
      done()
    })
  })

  lab.test('Invalid post upload function', (done) => {
    const options = {
      upload: {
        path: './'
      },
      postUpload: 'invalid'
    }
    Plugin(mockServer, options, (err) => {
      Code.expect(err).to.be.instanceof(Error)
      Code.expect(err.message).to.be.equal(
        'Post upload must be a function'
      )
      done()
    })
  })

  lab.test('Invalid generate name function', (done) => {
    const options = {
      upload: {
        path: './',
        generateName: 'invalid'
      }
    }
    Plugin(mockServer, options, (err) => {
      Code.expect(err).to.be.instanceof(Error)
      Code.expect(err.message).to.be.equal(
        'Generate name must be a function'
      )
      done()
    })
  })

  lab.test('Valid generate name function', (done) => {
    const options = {
      upload: {
        path: './',
        generateName: (filename, request) => filename
      }
    }
    mockServer.route = function (route) {
      Code.expect(route.config.pre).to.be.instanceof(Array)
      Code.expect(route.config.pre).to.have.length(2)
      Code.expect(route.config.pre[0].assign).to.be.equal('fileNames')
    }

    Plugin(mockServer, options, (err) => {
      Code.expect(err).to.not.exist()
      done()
    })
  })

  lab.test('Valid pre method functions', (done) => {
    const options = {
      upload: {
        path: './',
        generateName: (filename, request) => filename
      },
      preUpload: (request, reply) => reply(),
      postUpload: (request, reply) => reply()
    }
    mockServer.route = function (route) {
      Code.expect(route.config.pre).to.be.instanceof(Array)
      Code.expect(route.config.pre).to.have.length(4)
      Code.expect(route.config.pre[0].assign).to.be.equal('fileNames')
      Code.expect(route.config.pre[1].assign).to.be.equal('preUpload')
      Code.expect(route.config.pre[2].assign).to.be.equal('file')
      Code.expect(route.config.pre[3].assign).to.be.equal('postUpload')
    }

    Plugin(mockServer, options, (err) => {
      Code.expect(err).to.not.exist()
      done()
    })
  })
})
