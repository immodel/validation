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
    })
  };
  
  this.validate = function(doc, cb) {
    var self = this;

    // Run our own validators first (a model may have 
    // validators on its root that validate relations
    // between elements of the model)
    createPipeline(this.validators).run(doc, function(err) {
      if(err) return cb(err);
      // If this is a simple type (has no attrs)
      // then we're done
      if(! self.complex) return cb(null);

      function checkDone() {
        if(done && n === 0) cb(errors.length ? errors : null);
      }

      var done = false;
      var n = 0;
      var errors = [];
      self.eachAttr(function(name, type) {
        var value = doc.get(name);
        n++;
        type.validate(value, function(err) {
          n--;
          if(err) errors.push(err);
          checkDone();
        });
      });
            
      done = true;
      checkDone();
    });
    
    return this;
  };
  
  this.prototype.validate = function(cb) {
    return this.model.validate(this, cb);
  };
  
  function wrapValidator(fn, key) {
    return function(value, next) {
      fn.length === 1
        ? handle(fn(value))
        : fn(value, handle);
      
      function handle(valid) {
        setTimeout(function() {
          if(valid === false) {
            var err = new Error;
            err.key = key;
            return next(err);
          }
          
          next(null, value);
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