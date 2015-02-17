import Ember from 'ember';

export default Ember.Controller.extend({
  needs: ['application'],

  // Get the list of repositories and add a "checked" attribute to each object
  allRepositories: function() {
    return (this.get('model') || []).map(function(baseRepository) {
      return Ember.Object.create({
        name: baseRepository.full_name,
        checked: false
      });
    }).sortBy('name');
  }.property('model.[]'),

  selectedRepositories: Ember.computed.filterBy('allRepositories', 'checked'),

  selectedRepsitoriesOberver: function() {
    this.set('controllers.application.repositories',
        this.get('selectedRepositories'));
  }.on('init').observes('selectedRepositories.[]'),

  actions: {
    toggleChecked: function(repository) {
      repository.toggleProperty('checked');
    }
  }
});
