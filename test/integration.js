'use strict'

const Hapi = require('hapi')
const Lab = require('lab')
const expect = require('code').expect
const plugin = require('../lib/index')
const lab = exports.lab = Lab.script()

lab.experiment('Integration tests', () => {
  let server

  lab.beforeEach((done) => {
    server = new Hapi.Server()
    server.connection({ port: 8080 })
    done()
  })

  lab.test('Post upload method replaces handler response', (done) => {
    server.register({
      register: plugin,
      options: {
        upload: {path: './'},
        postUpload: (request, reply) => {
          reply().code(404)
        }
      }
    }, (err) => {
      if (err) throw err
      server.inject({method: 'POST', url: '/files', payload: {
        a: 'foo',
        b: 'bar'
      }}, (res) => {
        expect(res.statusCode).to.be.equal(404)
        done()
      })
    })
  })
})
