const petitionsPhotos = require('../controllers/petitions.photos.controller');
const authenticate = require('../middleware/authenticate');

module.exports = function (app) {
    app.route(app.rootUrl + '/petitions/:id/photo')
        .get(petitionsPhotos.getPhoto)
        .put(authenticate.loginRequired, petitionsPhotos.setPhoto);
};
