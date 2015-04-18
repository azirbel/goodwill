import Ember from 'ember';

export default Ember.Route.extend({
  hideErrors: function() {
    this.send('hideError');
  }.on('deactivate')
});
