const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Log validation errors for debugging
    console.log('❌ Validation failed:', {
      path: req.path,
      method: req.method,
      body: req.body,
      params: req.params,
      errors: errors.array(),
    });
    
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  
  next();
};

module.exports = { validate };
