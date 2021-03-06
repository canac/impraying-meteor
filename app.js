const Prayers = new Mongo.Collection('prayers');
const Comments = new Mongo.Collection('comments');
const Notifications = new Mongo.Collection('notifications');

if (Meteor.isClient) {
  // This code only runs on the client
  const onReady = function() {
    angular.bootstrap(document, ['im-praying']);
  };

  if (Meteor.isCordova) {
    angular.element(document).on('deviceready', onReady);
  } else {
    angular.element(document).ready(onReady);
  }

  Meteor.startup(function() {
    Meteor.subscribe('userData');

    // Update the friend list on startup and after successful logins
    Accounts.onLogin(() => {
      Meteor.call('updateFriends');
    });
    Meteor.call('updateFriends');
  });

  const app = angular.module('im-praying', ['angular-meteor', 'ui.router', 'ngMaterial', 'angularMoment']);

  app.config([
    '$stateProvider',
    '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
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
      }).state('notification-list', {
        url: '/notifications',
        templateUrl: 'client/notification-list.ng.html',
        controller: 'NotificationListCtrl',
        controllerAs: 'notificationList',
      });

      $urlRouterProvider.otherwise('/prayers');
    },
  ]);

  app.controller('ImPrayingCtrl', [
    '$scope',
    function($scope) {
      // Return the user collection associated with the provided user id
      $scope.lookupUser = userId => Meteor.users.findOne(userId);

      // Return a boolean indicating whether or not the provided user id is the currently logged-in user
      $scope.isCurrentUser = userId => userId === Meteor.userId();

      // Authenticate the user via Facebook
      this.login = function() {
        Meteor.loginWithFacebook({ requestPermissions: ['public_profile', 'user_friends'] });
      };

      // Deauthenticate the user
      this.logout = function() {
        Meteor.logout();
      };
    },
  ]);

  app.controller('PrayerListCtrl', [
    '$scope',
    '$meteor',
    '$state',
    function($scope, $meteor, $state) {
      // Initialize the scope variables
      this.request = '';

      // Return the current user's friends as an array of Meteor user ids
      this.getFriends = function() {
        const user = Meteor.user();
        return (user && user.friends) || [];
      };

      // Load all prayers whose author is one of the current user's friends
      this.prayers = $scope.$meteorCollection(() => Prayers.find(
        { author: { $in: [Meteor.userId(), ...this.getFriends()] } },
        { sort: { timestamp: -1 } },
      ));

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
    },
  ]);

  app.controller('PrayerDetailCtrl', [
    '$scope',
    '$meteor',
    '$state',
    '$stateParams',
    function($scope, $meteor, $state, $stateParams) {
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
        this.goBack();
      };

      // Delete the comment
      this.deleteComment = function(commentId) {
        $meteor.call('deleteComment', commentId);
      };

      // Navigate to the prayer list
      this.goBack = function() {
        $state.go('prayer-list');
      };
    },
  ]);

  app.controller('NotificationListCtrl', [
    '$scope',
    '$meteor',
    '$state',
    function($scope, $meteor, $state) {
      this.notifications = $scope.$meteorCollection(() => Notifications.find({ userId: Meteor.userId() }));

      this.lookupComment = commentId => Comments.findOne(commentId);

      this.openNotification = function(notification) {
        const prayerId = this.lookupComment(notification.commentId).prayerId;
        $state.go('prayer-detail', { id: prayerId });

        // Delete the notification now that it has been read
        this.deleteNotification(notification._id);
      };

      this.deleteNotification = function(notificationId) {
        $meteor.call('deleteNotification', notificationId);
      };
    },
  ]);
}

// Define Meteor methods
Meteor.methods({
  updateFriends: function() {
    // Only logged-in users can update their friend list
    if (!this.userId) {
      return;
    }

    const facebookProfile = Meteor.user().services.facebook;
    HTTP.get('https://graph.facebook.com/me/friends', {
      params: {
        access_token: facebookProfile.accessToken,
        fields: 'id',
      },
    }, (err, res) => {
      if (err) {
        throw err;
      }

      // Get the Facebook ids of all the user's friends
      const facebookIds = res.data.data.map(friend => friend.id);

      // Convert the array of Facebook ids to an array of Meteor user ids
      const friendIds = Meteor.users.find(
        { 'services.facebook.id': { $in: facebookIds } },
        { _id: true }
      ).map(friend => friend._id);

      // Ignore this update on clients because they cannot mass update documents
      if (!this.isSimulation) {
        // Add the current user to all of their friends' friend lists
        Meteor.users.update({ _id: { $in: friendIds } }, { $addToSet: { friends: this.userId } });
      }

      // Update the user's friend list
      Meteor.users.update(this.userId, { $set: { friends: friendIds } });
    });
  },

  createPrayer: function(request) {
    // Only logged-in users can create prayer requests
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    Prayers.insert({
      author: this.userId,
      content: request,
      timestamp: new Date(),
    });
  },

  deletePrayer: function(prayerId) {
    // Users can only delete their own requests
    const prayer = Prayers.findOne(prayerId);
    if (!this.userId || prayer.author !== this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    Prayers.remove(prayerId);
    Comments.remove({ prayerId });
  },

  createComment: function(prayerId, comment) {
    // Only logged-in users can create comments
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    const commentId = Comments.insert({
      author: this.userId,
      prayerId,
      content: comment,
      timestamp: new Date(),
    });

    // Notify the prayer's author about the new comment
    const prayer = Prayers.findOne(prayerId);
    if (prayer.author !== this.userId) {
      Notifications.insert({
        userId: prayer.author,
        commentId,
      });
    }
  },

  deleteComment: function(commentId) {
    // Users can only delete their own comments
    const comment = Comments.findOne(commentId);
    if (!this.userId || comment.author !== this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    Comments.remove(commentId);
  },

  deleteNotification: function(notificationId) {
    // Users can only delete their own notifications
    const notification = Notifications.findOne(notificationId);
    if (!this.userId || notification.userId !== this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    Notifications.remove(notificationId);
  },
});

if (Meteor.isServer) {
  Meteor.startup(() => {
    // Allow users to modify their own user document
    Meteor.users.allow({
      update: function(userId, document) {
        return document._id === userId;
      },
    });

    // Publish user friend lists
    Meteor.publish('userData', function() {
      if (this.userId) {
        return Meteor.users.find(this.userId, { fields: { friends: true } });
      } else {
        this.ready();
      }
    });
  });
}
