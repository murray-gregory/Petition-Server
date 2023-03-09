const petitions = require('../controllers/petitions.controller');
const authenticate = require('../middleware/authenticate');

module.exports = function (app) {
    const baseUrl = app.rootUrl + '/petitions';

    app.route(baseUrl)
        .get(petitions.search)
        .post(authenticate.loginRequired, petitions.create);

    app.route(baseUrl + '/categories')
        .get(petitions.getCategories);

    app.route(baseUrl + '/:id')
        .get(petitions.viewDetails)
        .patch(authenticate.loginRequired, petitions.modify)
        .delete(authenticate.loginRequired, petitions.delete);
};
