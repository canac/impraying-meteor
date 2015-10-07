const Prayers = new Mongo.Collection('prayers');

if (Meteor.isClient) {
  // This code only runs on the client
  var app = angular.module('im-praying', ['angular-meteor', 'ngMaterial', 'angularMoment']);

  app.controller('ImPrayingCtrl', function($meteor) {
    // Initialize the scope variables
    this.request = '';
    this.prayers = $meteor.collection(function() {
      return Prayers.find({}, { sort: { timestamp: -1 } });
    });

    // Create a new prayer request
    this.createPrayer = function() {
      this.prayers.push({
        author: 1,
        content: this.request,
        timestamp: new Date(),
      });

      // Clear the request in preparation for creating the next one
      this.request = '';
    };
  });
}

if (Meteor.isServer) {
  Meteor.startup(function() {
    // Code to run on server at startup
  });
}
