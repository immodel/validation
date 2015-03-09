var assert = require('assert');
var model = require('immodel')
  .use(require('immodel-base'), {validation: require('..')});

describe('validation', function() {
  it('should validate nested objects', function(done) {
    var User = model
      .attr('name', model
        .attr('familyName', {type: 'string', required: true})
        .attr('givenName', 'string'));

    var doc = new User();
    assert(doc.get('name.familyName').value === '');
    assert(doc.get('name.givenName').value === '');

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
      .validator(function() {
        return !! (this.get('givenName').value || this.get('familyName').value);
      }, 'both');

    var User = model
      .attr('name', Name);

    var doc = new User();
    doc.validate(function(err, doc) {
      assert(err !== null);
      assert(err.key === 'both');

      doc
        .set('name.givenName', 'test')
        .validate(function(err, doc) {
        assert(err === null);

        doc
          .set('name.familyName', 'test')
          .set('name.givenName', null)
          .validate(function(err, doc) {
          assert(err === null);
          doc
            .set('name.familyName', 'test')
            .validate(function(err, doc) {
            assert(err === null);
            done();
          });
        });
      });
    });
  });
});