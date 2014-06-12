Package.describe({
    summary: "Beautifully Simple Reactive Publications"
});

Package.on_use(function (api) {
    api.use('underscore', 'server');

    api.add_files('simple-publish.js', 'server');

    api.export('SimplePublication');
});