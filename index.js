var ware = require('ware');

module.exports = function(model) {
  model._validators = model._validators || [];
    
  model.validators = ware();
  
  function createPipeline(validators) {
    var pipeline = ware();
    validators.forEach(function(validator) {
      var fn = validator[0];
      var key = validator[1];
      
      pipeline.use(function(value, next) {
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
      });
    });
    
    return pipeline;
  }
  
  model.validator = function(fn, key) {
    return this.use(function(model) {
      model._validators.push([fn, key]);
      model.validators = createPipeline(model._validators);

      return model;
    });
  };
  
  model.removeValidator = function(fn, key) {
    return this.use(function(model) {
      model._validators = model._validators.filter(function(validator, idx) {
        return ! (validator[0] === fn && validator[1] === key);
      });
      
      model.validators = createPipeline(model._validators);      
      return model;
    })
  };
  
  model.validate = function(doc, cb) {
    var self = this;

    // Run our own validators first (a model may have 
    // validators on its root that validate relations
    // between elements of the model)
    this.validators.run(doc, function(err) {
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
  
  
  model.prototype.validate = function(cb) {
    return this.model.validate(this, cb);
  };
  
  return model;
};