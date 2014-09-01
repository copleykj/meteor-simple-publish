Package.describe({
	name: "copleykj:simple-publish",

    summary: "Beautifully Simple Reactive Publications",

    version: "1.0.1",

    git: "https://github.com/copleykj/meteor-simple-publish"
});

Package.on_use(function (api) {
	api.versionsFrom('0.9.0');

    api.use('underscore', 'server');

    api.add_files('simple-publish.js', 'server');

    api.export('SimplePublication');
});
