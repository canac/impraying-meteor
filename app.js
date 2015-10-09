const Prayers = new Mongo.Collection('prayers');
const Comments = new Mongo.Collection('comments');

if (Meteor.isClient) {
  // This code only runs on the client
  const app = angular.module('im-praying', ['angular-meteor', 'ui.router', 'ngMaterial', 'angularMoment']);

  app.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider.state('prayer-list', {
      url: '/prayers',
      templateUrl: 'client/prayer-list.ng.html',
      controller: 'PrayerListCtrl',
      controllerAs: 'prayerList',
    }).state('prayer-detail', {
      url: '/prayers/:id',
      templateUrl: 'client/prayer-detail.ng.html',
      controller: 'PrayerDetailCtrl',
      controllerAs: 'prayerDetail',
    });

    $urlRouterProvider.otherwise('/prayers');
  });

  app.controller('ImPrayingCtrl', function($scope) {
    // Return the user collection associated with the provided user id
    $scope.lookupUser = (userId) => Meteor.users.findOne(userId);

    // Return a boolean indicating whether or not the provided user id is the currently logged-in user
    $scope.isCurrentUser = (userId) => userId === Meteor.userId();

    // Authenticate the user via Facebook
    this.login = function() {
      Meteor.loginWithFacebook({ requestPermissions: ['public_profile'] });
    };

    // Deauthenticate the user
    this.logout = function() {
      Meteor.logout();
    };
  });

  app.controller('PrayerListCtrl', function($scope, $meteor, $state) {
    // Initialize the scope variables
    this.request = '';
    this.prayers = $scope.$meteorCollection(() => Prayers.find({}, { sort: { timestamp: -1 } }));

    // Create a new prayer request
    this.createPrayer = function() {
      $meteor.call('createPrayer', this.request);

      // Clear the request in preparation for creating the next one
      this.request = '';
    };

    // Open the detail page for the specified prayer
    this.openPrayer = function(prayerId) {
      $state.go('prayer-detail', { id: prayerId });
    };
  });

  app.controller('PrayerDetailCtrl', function($scope, $meteor, $state, $stateParams) {
    const prayerId = $stateParams.id;
    this.prayer = Prayers.findOne(prayerId);
    this.comments = $scope.$meteorCollection(() => Comments.find({ prayerId }, { sort: { timestamp: -1 } }));

    // Create a new comment on the prayer request
    this.createComment = function() {
      $meteor.call('createComment', prayerId, this.comment);

      // Clear the comment in preparation for creating the next one
      this.comment = '';
    };

    // Delete the prayer request and all of its comments
    this.deletePrayer = function() {
      $meteor.call('deletePrayer', prayerId);
      $state.go('prayer-list');
    };

    // Delete the comment
    this.deleteComment = function(commentId) {
      $meteor.call('deleteComment', commentId);
    };
  });
}

// Define Meteor methods
Meteor.methods({
  createPrayer: function(request) {
    // Only logged-in users can create prayer requests
    if (!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Prayers.insert({
      author: Meteor.userId(),
      content: request,
      timestamp: new Date(),
    });
  },

  deletePrayer: function(prayerId) {
    // Users can only delete their own requests
    const prayer = Prayers.findOne(prayerId);
    if (!Meteor.userId() || prayer.author !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Prayers.remove(prayerId);
    Comments.remove({ prayerId });
  },

  createComment: function(prayerId, comment) {
    // Only logged-in users can create comments
    if (!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Comments.insert({
      author: Meteor.userId(),
      prayerId,
      content: comment,
      timestamp: new Date(),
    });
  },

  deleteComment: function(commentId) {
    // Users can only delete their own comments
    const comment = Comments.findOne(commentId);
    if (!Meteor.userId() || comment.author !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Comments.remove(commentId);
  },
});
