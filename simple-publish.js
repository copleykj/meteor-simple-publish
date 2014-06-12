SimplePublication = function(options){
    if(!options.subHandle){
        throw new Error("Publications need subscription handles to publish documents to.");
    }

    if(!options.collection){
        throw new Error("Publications need a collection to get documents from.");
    }

    this.subHandle = options.subHandle;
    this.collection = options.collection;

    this.selector = options.selector || {};
    this.options = options.options || {};

    this.dependant = options.dependant;
    this.foreignKey = options.foreignKey;
    this.inverted = options.inverted;

    this.alternateCollectionName = options.alternateCollectionName;

    this.handles = {};
    this.published = {};
};

SimplePublication.prototype = {
    setPublished: function(foreignId, documentId){
        if(!this.published[foreignId]){
            this.published[foreignId] = {};
        }
        this.published[foreignId][documentId] = true;
    },
    setUnpublished: function(foreignId, documentId){
        if(this.published[foreignId]){
            delete this.published[foreignId][documentId];
        }
    },
    observe: function(document) {
        var self = this;
        var selector = self.selector;
        var documentId;

        documentId = document ? document._id : "top";

        if(self.foreignKey){
            if(self.inverted){
                selector["_id"] = document[self.foreignKey];
            }else{
                selector[self.foreignKey] = documentId;
            }
        }

        self.handles[documentId] = self.collection.find(selector, self.options).observe({
            added: function (document) {
                self.added(document._id, document, documentId);
            },
            changed: function (newDocument, oldDocument) {
                self.changed(oldDocument._id, newDocument);
            },
            removed: function (document) {
                self.removed(document._id, documentId);
            }
        });

    },
    added: function(documentId, document, foreignId) {
        var name = this.alternateCollectionName || this.collection._name;
        if(! (this.subHandle._documents[name] && this.subHandle._documents[name][documentId]) ){
            this.subHandle.added(name, documentId, document);
            this.setPublished(foreignId, documentId);

            if(this.dependant){
                if(_(this.dependant).isArray()){
                    _(this.dependant).each(function(dependant) {
                         dependant.observe(document);
                    });
                }else{
                    this.dependant.observe(document);
                }
            }
        }
    },
    changed: function(documentId, document) {
        var name = this.alternateCollectionName || this.collection._name;
        if(this.subHandle._documents[name] && this.subHandle._documents[name][documentId]){
            this.subHandle.changed(name, documentId, document);
        }
    },
    removed: function(documentId, foreignId) {
        var name = this.alternateCollectionName || this.collection._name;
        if(this.subHandle._documents[name] && this.subHandle._documents[name][documentId]){
            this.subHandle.removed(name, documentId);
            this.setUnpublished(foreignId, documentId);

            if(this.dependant){
                if(_(this.dependant).isArray()){
                    _(this.dependant).each(function(dependant) {
                        dependant.stop(documentId);
                    });
                }else{
                    this.dependant.stop(documentId);
                }
            }
        }
    },
    stop: function(documentId){
        var self = this;

        if(documentId){
            if(self.handles[documentId]){
                _(self.published[documentId]).each(function(value, key) {
                    self.removed(key, documentId);
                });

                self.handles[documentId].stop();
                delete self.handles[documentId];
            }
        }else{
            _(self.published).each(function(documents, key, published) {
                _(documents).each( function(value, key) {
                    self.removed(key, documentId);
                });
            });

            _(self.handles).each(function(handle, key, handles) {
                handle.stop();
                delete handles[key];
            });

            if(self.dependant){
                self.dependant.stop();
            }
        }
    }
};