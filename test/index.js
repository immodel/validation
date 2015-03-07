var assert = require('assert');
var model = require('immodel').bootstrap({validation: require('..')});

describe('validation', function() {
  it('should validate nested objects', function(done) {
    var User = model
      .attr('name', model
        .attr('familyName', {type: 'string', required: true})
        .attr('givenName', 'string'));
    
    var doc = new User();
    assert(doc.get('name.familyName') === '');
    assert(doc.get('name.givenName') === '');

    doc.validate(function(err) {
      assert(err !== null);
      done();
    });
  });
  
  it('should allow validators to be set on objects', function(done) {
    // Define a validator that expresses
    // a relation between two properties
    // on the root of this model
    var Name = model
      .attr('familyName', 'string')
      .attr('givenName', 'string')
      .validator(function(value) {
        return !! (value.get('givenName') || value.get('familyName'));
      }, 'both');

    var User = model
      .attr('name', Name);
      
    var doc = new User();
    doc.validate(function(err) {
      assert(err !== null);
      assert(err[0].key === 'both');
      
      doc.set('name.givenName', 'test');
      doc.validate(function(err) {
        assert(err === null);

        doc.set('name.familyName', 'test');
        doc.set('name.givenName', null);
        doc.validate(function(err) {
          assert(err === null);
          doc.set('name.familyName', 'test');
          doc.validate(function(err) {
            assert(err === null);
            done();
          });
        });
      });
    });
  });
});