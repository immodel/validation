var ware = require('ware');

module.exports = function() {
  this.validators = [];

  this.validator = function(fn, key) {
    return this.use(function() {
      this.validators.push([fn, key]);
    });
  };

  this.removeValidator = function(fn, key) {
    return this.use(function() {
      this.validators = this.validators.filter(function(validator, idx) {
        return ! (validator[0] === fn && validator[1] === key);
      });
    });
  };

  this.validate = function(doc, cb) {
    var self = this;
    doc.run('validating', function(err, doc) {
      if(err) return cb(err);

      // Run our own validators first (a model may have
      // validators on its root that validate relations
      // between elements of the model)
      createPipeline(self.validators).run(doc, function(err) {
        if(err) return cb(err, doc);

        doc.eachAttrAsync(function(name, type, next) {
          type.validate(doc.get(name), next);
        }, function(err) {
          if(err) return cb(err, doc);
          doc.run('validated', cb);
        });
      });
    });

    return this;
  };

  this.prototype.validate = function(cb) {
    return this.model.validate(this, cb);
  };

  function wrapValidator(fn, key) {
    return function(doc, next) {
      fn.length === 0
        ? handle(fn.call(doc))
        : fn.call(doc, handle);

      function handle(valid) {
        setTimeout(function() {
          if(valid === false) {
            var err = new Error;
            err.key = key;
            return next(err);
          }

          next(null, doc);
        });
      }
    };
  }

  function createPipeline(validators) {
    var pipeline = ware();

    validators.forEach(function(validator) {
      pipeline.use(wrapValidator(validator[0], validator[1]));
    });

    return pipeline;
  }
};