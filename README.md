#Simple Publish#

A beautifully simple way to reactively publish sets of related documents.

##About##

At first glance there seems to be a lot of magic to Meteor. Even Publishing data is pretty magical for a basic application. The magic has its limits though and once you need publish more than just a basic cursor or two the magic fades quickly. *Simple Publish* brings back some of that magic for more complicated publications.

##Features##

- Simple API
- Avoids wasting valuable cpu resources by only starting the minimum number of observers
- Proper clean-up of cursor observers to avoid memory leaks in you publications
- Proper removal of related documents when a document is removed.
- Avoids adding or removing the same record repeatedly to mitigate [Meteor issue #944](https://github.com/meteor/meteor/issues/944).

##API##

###Class -`SimplePublication({options})`###

####options####

*subHandle* - The handle of the current subscription. Generally `this` or  `self`.

*collection* - Reference to the collections from which to find documents.

*selector* - find selector for the collection. i.e. Collection.find(selector);

*options* - find options for the collection. i.e. Collection.find(selector, options);

*dependant* - Another `SimplePublication` instance (or Array of them) that is dependant on this instance.

*foreignKey* - Name of the document key that contains the reference to the related document.

*inverted* - Boolean indicated if the relationship is inverted. i.e. Many to One relations

*alternateCollectionName* - String containing the collection name to publish documents to. Useful if you want to publish documents from one collection to a different one on the client side.

####Method - `SimplePublication.start()`####

Kicks off the publication and all dependant publications recursively. Call this once on a top level publication. All dependant publications will be started by their parent publication.

####Method - `SimplePublication.stop()`####

Stop the publication and all dependant publications recursively. This is automatically called when the subscription stops, but can be used if you need to stop the publications before the subscription stops.

##Examples##

```javascript
Meteor.publish('simplePostsExample', function () {
    var publication = new SimplePublication({
        subHandle:this,
        collection:Posts,
        options:{
            sort:{date:-1, limit:10}
        },
        dependant: new SimplePublication({
            subHandle:this,
            collection:Meteor.users,
            foreignKey:"userId",
            inverted:true
        })

    }).start();


});
```

```javascript
Meteor.publish('complexPostsExample', function () {
    var usersPublication = new SimplePublication({
            subHandle:this,
            collection:Meteor.users,
            foreignKey:"userId",
            inverted:true
    });

    var postCommentsPublication = new SimplePublication({
            subHandle:this,
            collection:PostComments,
            foreignKey:"postId",
            dependant:usersPublication
    });

    var publication = new SimplePublication({
        subHandle:this,
        collection:Posts,
        options:{
            sort:{date:-1, limit:10}
        },
        dependant: [usersPublication, postCommentsPublication]

    }).start();

});
```

##License##
[MIT License](http://opensource.org/licenses/MIT)


