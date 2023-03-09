const signatures = require('../controllers/signatures.controller');
const authenticate = require('../middleware/authenticate');

module.exports = function (app) {
    app.route(app.rootUrl + '/petitions/:id/signatures')
        .get(signatures.viewSignatures)
        .post(authenticate.loginRequired, signatures.addSignature)
        .delete(authenticate.loginRequired, signatures.removeSignature)
};
