'use strict'

const Lab = require('lab')
const Joi = require('joi')
const Mime = require('mime')
const expect = require('code').expect
const pkg = require('../package.json')
const lab = exports.lab = Lab.script()
const plugin = require('../lib/index')

let mockServer = {
  log: console.log
}

lab.experiment('Unit tests', () => {
  lab.test('Correct attributes', (done) => {
    let attributes = plugin.attributes
    expect(attributes.name).to.be.equal(pkg.name)
    expect(attributes.version).to.be.equal(pkg.version)
    expect(attributes.multiple).to.be.true()
    done()
  })

  lab.test('No upload path', (done) => {
    plugin(mockServer, {}, (err) => {
      expect(err).to.be.instanceof(Error)
      expect(err.message).to.be.equal('Must define a path to upload files')
      done()
    })
  })

  lab.test('Null options', (done) => {
    plugin(mockServer, null, (err) => {
      expect(err).to.be.instanceof(Error)
      expect(err.message).to.be.equal('Must define a path to upload files')
      done()
    })
  })

  lab.test('Invalid upload path', (done) => {
    plugin(mockServer, {upload: {path: './invalid/path'}}, (err) => {
      expect(err).to.be.instanceof(Error)
      expect(err.message).to.be.startWith(
        'Must define a valid accessible path to upload files - '
      )
      done()
    })
  })

  lab.test('Invalid upload path', (done) => {
    plugin(mockServer, {upload: {path: './invalid/path'}}, (err) => {
      expect(err).to.be.instanceof(Error)
      expect(err.message).to.be.startWith(
        'Must define a valid accessible path to upload files - '
      )
      done()
    })
  })

  lab.test('Define route with default options', (done) => {
    mockServer.route = function (route) {
      const config = route.config
      const payload = config.payload
      expect(route.method).to.be.equal('POST')
      expect(route.path).to.be.equal('/files')
      expect(config.tags).to.not.exist()
      expect(config.auth).to.be.false()
      expect(config.cors).to.not.exist()
      expect(payload.output).to.be.equal('stream')
      expect(payload.parse).to.be.true()
      expect(payload.allow).to.be.equal('multipart/form-data')
      expect(payload.maxBytes).to.not.exist()
      expect(config.pre).to.be.instanceof(Array)
      expect(config.pre).to.have.length(1)
      expect(config.pre[0].assign).to.be.equal('file')
      expect(config.validate.query).to.not.exist()
      expect(config.validate.params).to.not.exist()
      expect(config.validate.headers).to.not.exist()
      expect(config.validate.auth).to.not.exist()
      expect(config.validate.payload).to.exist()
      expect(config.validate.payload.isJoi).to.be.true()
      expect(config.description).to.be.equal('Uploads a file')
    }
    plugin(mockServer, {upload: {path: './'}}, (err) => {
      expect(err).to.not.exist()
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
      expect(route.method).to.be.equal('POST')
      expect(route.path).to.be.equal(options.route.path)
      expect(config.tags).to.be.deep.equal(options.route.tags)
      expect(config.cors).to.be.deep.equal(options.route.cors)
      expect(config.auth).to.be.equal(options.route.auth)
      expect(payload.output).to.be.equal('stream')
      expect(payload.parse).to.be.true()
      expect(payload.allow).to.be.equal('multipart/form-data')
      expect(payload.maxBytes).to.be.equal(options.upload.maxBytes)
      expect(config.pre).to.be.instanceof(Array)
      expect(config.pre).to.have.length(1)
      expect(config.pre[0].assign).to.be.equal('file')
      expect(config.validate.query)
        .to.be.deep.equal(options.route.validate.query)
      expect(config.validate.params)
        .to.be.deep.equal(options.route.validate.params)
      expect(config.validate.headers)
        .to.be.deep.equal(options.route.validate.headers)
      expect(config.validate.auth)
        .to.be.deep.equal(options.route.validate.auth)
      expect(config.validate.payload).to.exist()
      expect(config.validate.payload.isJoi).to.be.true()
      // Joi object containing file schema
      let filenameSchema = route.config.validate.payload._inner.patterns[0]
        .rule._inner.children[1].schema._inner.children[0]
      // Joi object containing content-type header
      let contentTypeSchema = route.config.validate.payload._inner.patterns[0]
        .rule._inner.children[1].schema._inner.children[1].schema._inner.children[0]
      expect(contentTypeSchema.key).to.be.equal('content-type')
      // Validate extesions (need to convert from mimetypes)
      contentTypeSchema.schema._valids._set.forEach(function (mimeType) {
        let ext = Mime.extension(mimeType)
        expect(options.route.validate.extensions).to.include(ext)
      })
      expect().to.be.deep.equal(options.route.vali)
      expect(filenameSchema.key).to.be.equal('filename')
      expect(filenameSchema.schema).to.be.deep.equal(filenameSchema.schema)
      expect(config.description).to.be.equal('Uploads a file')
    }
    plugin(mockServer, options, (err) => {
      expect(err).to.not.exist()
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
    plugin(mockServer, options, (err) => {
      expect(err).to.exist()
      expect(err).to.be.instanceof(Error)
      expect(err.message)
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
      expect(contentTypeSchema.key).to.be.equal('content-type')
      // Validate extesions (need to convert from mimetypes)
      contentTypeSchema.schema._valids._set.forEach(function (mimeType) {
        expect(options.route.validate.mimeTypes).to.include(mimeType)
      })
    }
    plugin(mockServer, options, (err) => {
      expect(err).to.not.exist()
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
    plugin(mockServer, options, (err) => {
      expect(err).to.be.instanceof(Error)
      expect(err.message).to.be.equal(
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
    plugin(mockServer, options, (err) => {
      expect(err).to.be.instanceof(Error)
      expect(err.message).to.be.equal(
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
    plugin(mockServer, options, (err) => {
      expect(err).to.be.instanceof(Error)
      expect(err.message).to.be.equal(
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
    plugin(mockServer, options, (err) => {
      expect(err).to.be.instanceof(Error)
      expect(err.message).to.be.equal(
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
    plugin(mockServer, options, (err) => {
      expect(err).to.be.instanceof(Error)
      expect(err.message).to.be.equal(
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
      expect(route.config.pre).to.be.instanceof(Array)
      expect(route.config.pre).to.have.length(2)
      expect(route.config.pre[0].assign).to.be.equal('fileNames')
    }

    plugin(mockServer, options, (err) => {
      expect(err).to.not.exist()
      done()
    })
  })

  lab.test('Valid pre and ext method functions', (done) => {
    const options = {
      upload: {
        path: './',
        generateName: (filename, request) => filename
      },
      preUpload: (request, reply) => reply(),
      postUpload: (request, reply) => reply()
    }
    mockServer.route = function (route) {
      expect(route.config.pre).to.be.instanceof(Array)
      expect(route.config.pre).to.have.length(3)
      expect(route.config.pre[0].assign).to.be.equal('fileNames')
      expect(route.config.pre[1].assign).to.be.equal('preUpload')
      expect(route.config.pre[2].assign).to.be.equal('file')
      expect(route.config.ext['onPreResponse'].method).to.be.equal(options.postUpload)
    }

    plugin(mockServer, options, (err) => {
      expect(err).to.not.exist()
      done()
    })
  })
})
