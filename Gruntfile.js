module.exports = function (grunt) {
  'use strict';

  var path = require('path');

  grunt.loadNpmTasks('grunt-release-it');

  // Project configuration.
  grunt.initConfig({
    'release-it': {
      options: {
        'pkgFiles': ['package.json', 'bower.json'],
        'commitMessage': 'Release %s',
        'tagName': 'v%s',
        'tagAnnotation': 'Release %s',
        'increment': 'patch',
        'buildCommand': 'ember build --environment="gh-pages"',
        'distRepo': '-b gh-pages git@github.com:azirbel/goodwill',
        'distStageDir': '.stage',
        'distBase': 'dist',
        'distFiles': ['**/*'],
        'publish': false
      }
    }
  });
};

