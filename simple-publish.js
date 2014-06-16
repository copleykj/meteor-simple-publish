SimplePublication = function(options){
    if(!options.subHandle){
        throw new Error("Publications need subscription handles to publish documents to.");
    }

    if(!options.collection){
        throw new Error("Publications need a collection to get documents from.");
    }

    //These properties need defaults before we extend;
    this.selector = {};
    this.options = {};

    //set up properties by extending the options object
    _(this).extend(options);

    //finally set properties we'll use internally and don't want set from outside.
    this.handles = {};
    this.observing = {};
    this.published = {};

};


SimplePublication.prototype = {
    start: function(document) {
        var self = this;
        var selector;

        var foreignId = document ? document._id : "top";

        if(self.incrementTimesObserved(foreignId)){
            selector = self.getQueryKeyRelationSelector(document);

            self.handles[foreignId] = self.collection.find(selector, self.options).observe({
                added: function (document) {
                    self.added(document, foreignId);
                },
                changed: function (newDocument, oldDocument) {
                    self.changed(newDocument, oldDocument, foreignId);
                },
                removed: function (document) {
                    self.removed(document._id, foreignId);
                },
            });

        }

        if(!document){
            self.attachSubscriptionStopFunction();
        }

    },
    stop: function(documentId) {
        var self = this;

        var foreignId = documentId || "top";

        if(self.decrementTimesObserved(foreignId)){
            self.handles[foreignId].stop();

            delete self.handles[foreignId];

            _(self.published[foreignId]).each(function(publishedId) {
                self.removed(publishedId, foreignId);
            });
        }

    },
    added: function(document, parentId) {
        var self = this;
        var collectionName = self.getPublisableCollectionName();
        var stopPublish = false;

        if(self.addHook){
            stopPublish = self.addHook.call(this, document, parentId);
        }

        if(!stopPublish){
            if(self.shouldPublish(document._id, parentId)){
                self.subHandle.added(collectionName, document._id, document);

                self.startDependants(document);
            }
        }

    },
    changed: function(newDocument, oldDocument, parentId) {
        var self = this;
        var collectionName = self.getPublisableCollectionName();

        self.subHandle.changed(collectionName, oldDocument._id, newDocument);
    },
    removed: function(documentId, parentId) {
        var self = this;
        var collectionName =  self.getPublisableCollectionName();

        if(self.shouldUnpublish(documentId, parentId)){
            self.subHandle.removed(collectionName, documentId);

            self.stopDependants(documentId);
        }
    },
    startDependants: function(document){
        var self = this;
        if(self.dependant){
            if(_(self.dependant).isArray()){
                _(self.dependant).each(function(dependant) {
                    dependant.start(document);
                });
            }else{
                self.dependant.start(document);
            }
        }
    },
    stopDependants: function(documentId){
        var self = this;
        if(self.dependant){
            if(_(self.dependant).isArray()){
                _(self.dependant).each(function(dependant) {
                    dependant.stop(documentId);
                });
            }else{
                self.dependant.stop(documentId);
            }
        }
    },
    shouldPublish: function(documentId, parentId){
        if(!this.published[documentId]){
            this.published[documentId] = [];
        }

        this.published[documentId].push(parentId);

        if(this.published[documentId].length === 1){
            return true;
        }
    },
    shouldUnpublish: function(documentId, parentId){
        var index = this.published[documentId].indexOf(parentId);

        if(index !== -1){
            this.published[documentId].splice(index, 1);
        }

        if(this.published[documentId].length === 0){
            return true;
        }
    },
    incrementTimesObserved: function(documentId) {
        var self = this;

        if(!self.observing[documentId]){
            self.observing[documentId] = 1;
            return true;
        }
        self.observing[documentId] += 1;
    },
    decrementTimesObserved: function(documentId) {
        var self = this;

        if(self.observing[documentId]){
            self.observing[documentId] -= 1;

            if(!self.observing[documentId]){
                return true;
            }
        }
    },
    getPublisableCollectionName: function (){
        return this.alternateCollectionName || this.collection._name;
    },
    getQueryKeyRelationSelector: function(document){
        var self = this;
        var selector = _({}).extend(self.selector);

        if(self.foreignKey){
            if(self.inverted){
                selector["_id"] = document[self.foreignKey];
            }else{
                selector[self.foreignKey] = document._id;
            }
        }

        return selector;
    },
    attachSubscriptionStopFunction: function(){
        var self = this;
        self.subHandle.onStop(function () {
            self.stop();
        });
        self.subHandle.ready();
    }
};