const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Validation middleware factory
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(
      {
        body: req.body,
        params: req.params,
        query: req.query,
      },
      { abortEarly: false },
    );

    if (error) {
      const details = error.details.map((detail) => ({
        message: detail.message,
        path: detail.path.join('.'),
      }));

      logger.warn('Validation error:', details);
      return res.status(400).json({ error: 'Validation failed', details });
    }

    req.validatedData = value;
    next();
  };
}

// Validation schemas
const schemas = {
  cameraRegister: Joi.object({
    body: Joi.object({
      name: Joi.string().max(255).default('Baby Camera'),
    }).unknown(false),
  }),

  streamFrame: Joi.object({
    params: Joi.object({
      cameraId: Joi.string().length(8).required(),
    }),
  }),

  streamAudio: Joi.object({
    params: Joi.object({
      cameraId: Joi.string().length(8).required(),
    }),
  }),

  streamStatus: Joi.object({
    params: Joi.object({
      cameraId: Joi.string().length(8).required(),
    }),
    body: Joi.object({
      streaming: Joi.boolean().optional(),
    }).unknown(false),
  }),

  streamAudioPoll: Joi.object({
    params: Joi.object({
      cameraId: Joi.string().length(8).required(),
    }),
    query: Joi.object({
      since: Joi.number().default(-1),
    }),
  }),

  cameraDelete: Joi.object({
    params: Joi.object({
      cameraId: Joi.string().length(8).required(),
    }),
  }),
};

module.exports = {
  validate,
  schemas,
};
