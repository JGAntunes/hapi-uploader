'use strict'

const Joi = require('joi')
const Mime = require('mime')

function validation (options) {
  options = options || {}

  if (options.extensions && options.mimeTypes) {
    throw new Error('Can\'t validate both extensions and mime type.')
  }
  if (options.extensions && !Array.isArray(options.extensions)) {
    throw new Error('Extensions provided to validation must be an array.')
  }
  if (options.mimeTypes && !Array.isArray(options.mimeTypes)) {
    throw new Error('MimeTypes provided to validation must be an array.')
  }
  const query = options.query
  const params = options.params
  const headers = options.headers
  const auth = options.auth
  const filename = options.filename || Joi.string().required().description('File name')
  let contentType = Joi.string().required().description('File mime type')
  if (options.extensions) {
    let mimeTypes = []
    options.extensions.forEach((ext) => {
      mimeTypes.push(Mime.lookup(ext))
    })
    contentType = contentType.valid(mimeTypes)
  }
  if (options.mimeTypes) {
    contentType = contentType.valid(options.mimeTypes)
  }

  const validate = {
    query,
    params,
    headers,
    auth,
    payload: Joi.object().pattern(/(\w*\W*)*/,
      Joi.object({
        pipe: Joi.func().required().description('File stream'),
        hapi: Joi.object({
          filename,
          headers: Joi.object({
            'content-type': contentType,
            'content-disposition': Joi.string().required().regex(/\w*\W*filename\w*\W*/).description('File name')
          }).unknown().required().description('File headers')
        }).required().description('File')
      }).unknown()
    ).required().length(1)
  }

  return validate
}

module.exports = validation
