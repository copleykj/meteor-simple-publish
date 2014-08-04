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
    this.published = {};
    this.subHandle.observing = this.subHandle.obeserving || {};
    this.subHandle.parents = this.subHandle.parents || {};
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
        
        if(self.shouldPublish(document._id, parentId)){
            if(self.addedHook){
                stopPublish = self.addedHook.call(this, document, parentId);
            }

            if(!stopPublish){
                self.subHandle.added(collectionName, document._id, document);

                self.startDependants(document);
            }
        }

    },
    changed: function(newDocument, oldDocument, parentId) {
        var self = this;
        var collectionName = self.getPublisableCollectionName();

        if(self.changedHook){
            stopChange = self.changedHook.call(this, newDocument, oldDocument, parentId);
        }

        if(!stopChange){
            self.subHandle.changed(collectionName, oldDocument._id, newDocument);
        }
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
        var shouldPublish;
        var parents = this.subHandle.parents;

        if(typeof this.published[parentId] === "undefined"){
            this.published[parentId] = [];
        }

        if(_(parents[documentId]).isEmpty()){
            parents[documentId] = [];
            shouldPublish = true;
        }

        if(this.published[parentId].indexOf(documentId) === -1){
            this.published[parentId].push(documentId);
        }

        parents[documentId].push(parentId);


        return shouldPublish;
        
    },
    shouldUnpublish: function(documentId, parentId){
        var parents = this.subHandle.parents;
        var index = parents[documentId].indexOf(parentId);
        var collectionName;

        if(index !== -1){
            collectionName = this.getPublisableCollectionName();

            parents[documentId].splice(index, 1);

            if(parents[documentId].indexOf(parentId) === -1){
                
                index = this.published[parentId].indexOf(documentId);
                this.published[parentId].splice(index, 1);

                return true;
            }
        }

    },
    incrementTimesObserved: function(documentId) {
        var self = this;
        var observing = self.subHandle.observing;

        if(!observing[documentId]){
            observing[documentId] = 1;
            return true;
        }
        observing[documentId] += 1;
    },
    decrementTimesObserved: function(documentId) {
        var self = this;
        var observing = self.subHandle.observing;

        if(observing[documentId]){
            observing[documentId] = 1;

            if(!observing[documentId]){
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
                if(self.primaryKey){
                    selector[self.primaryKey] = document[self.foreignKey];
                }else{
                    selector["_id"] = document[self.foreignKey];
                }
            }else{
                if(self.primaryKey){
                    selector[self.foreignKey] = document[self.primaryKey];
                }else{
                    selector[self.foreignKey] = document["_id"];
                }
            }
        }

        return selector;
    },
    attachSubscriptionStopFunction: function(){
        var self = this;
        self.subHandle.onStop(function () {
            self.stop();
            self.stopOpenHandles();
        });
        self.subHandle.ready();
    },
    stopOpenHandles: function(){
        var self = this;
        var size = _(self.handles).size();

        if(size > 0){
            _(self.handles).each( function(handle) {
                handle.stop();
            });
        }
        if(self.dependant){
            if(_(self.dependant).isArray()){
                _(self.dependant).each(function(dependant) {
                    dependant.stopOpenHandles();
                });
            }else{
                self.dependant.stopOpenHandles();
            }
        }
    }
};
