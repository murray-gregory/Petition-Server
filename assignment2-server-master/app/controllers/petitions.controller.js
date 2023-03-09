const Petitions = require('../models/petitions.model');
const Photos = require('../models/photos.model');
const tools = require('../services/tools');
const validator = require('../services/validator');

exports.search = async function (req, res) {
    req.query = tools.unstringifyObject(req.query);
    if (req.query.q) {
        req.query.q = `${req.query.q}`;
    }
    let validation = validator.checkAgainstSchema(
        'components/schemas/PetitionSearchRequest',
        req.query,
        false
    );

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation}`;
        res.status(400).send();
    } else {
        try {
            if (req.query.categoryId) {
                const isValidCategory = await Petitions.isValidCategory(req.query.categoryId);
                if (!isValidCategory) {
                    res.statusMessage = `Bad Request: invalid category ID`;
                    res.status(400).send();
                    return;
                }
            }
            const petitions = await Petitions.search(req.query);
            res.statusMessage = 'OK';
            res.status(200).json(petitions);
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Internal Server Error';
            res.status(500).send();
        }
    }
};

exports.create = async function (req, res) {
    let validation = validator.checkAgainstSchema(
        'paths/~1petitions/post/requestBody/content/application~1json/schema',
        req.body
    );

    if (validation === true) {
        const categories = await Petitions.retrieveCategories();
        if (!categories.find(category => category.categoryId === req.body.categoryId)) {
            validation = 'categoryId does not match any existing category';
        }

        if (tools.isInThePast(req.body.closingDate)) {
            validation = 'closingDate must be in the future'
        }
    }

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation}`;
        res.status(400).send();
    } else {
        try {
            const petitionId = await Petitions.create(req.body, req.authenticatedUserId);
            res.statusMessage = 'Created';
            res.status(201).json({petitionId});
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Internal Server Error';
            res.status(500).send();
        }
    }
};

exports.viewDetails = async function (req, res) {
    try {
        const petition = await Petitions.viewDetails(req.params.id);
        if (petition) {
            res.statusMessage = 'OK';
            res.status(200).json(petition);
        } else {
            res.statusMessage = 'Not Found';
            res.status(404).send();
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.modify = async function (req, res) {
    let validation = validator.checkAgainstSchema(
        'paths/~1petitions~1{id}/patch/requestBody/content/application~1json/schema',
        req.body);

    const petition = await Petitions.viewDetails(req.params.id);

    if (petition === null) {
        res.statusMessage = 'Not Found';
        res.status(404).send();
        return;
    }

    if (validation === true) {
        if (tools.isInThePast(req.body.closingDate)) {
            validation = 'closingDate must be in the future'
        }

        if (tools.isInThePast(petition.closingDate)) {
            validation = 'cannot edit a petition that has closed'
        }

        if (req.body.categoryId) {
            const categories = await Petitions.retrieveCategories();
            if (!categories.find(category => category.categoryId === req.body.categoryId)) {
                validation = 'categoryId does not match any existing category';
            }
        }
    }

    if (!tools.equalNumbers(petition.authorId, req.authenticatedUserId)) {
        res.statusMessage = 'Forbidden';
        res.status(403).send();

    } else if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation}`;
        res.status(400).send();

    } else {
        try {
            await Petitions.modify(req.body, req.params.id);
            res.statusMessage = 'OK';
            res.status(200).send();
        } catch (err) {
            if (!err.hasBeenLogged) console.error(err);
            res.statusMessage = 'Internal Server Error';
            res.status(500).send();
        }
    }
};

exports.delete = async function (req, res) {
    const petitionId = req.params.id;

    try {
        const petition = await Petitions.viewDetails(petitionId);
        if (petition === null) {
            res.statusMessage = 'Petition Not Found';
            res.status(404).send();

        } else if (!tools.equalNumbers(petition.authorId, req.authenticatedUserId)) {
            res.statusMessage = 'Forbidden';
            res.status(403).send();

        } else {
            const filename = await Petitions.getPhotoFilename(petitionId);
            await Promise.all([
                Photos.deletePhoto(filename),
                Petitions.delete(petitionId)
            ]);
            res.statusMessage = 'OK';
            res.status(200).send();
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.getCategories = async function (req, res) {
    try {
        const categories = await Petitions.getCategories();
        res.statusMessage = 'OK';
        res.status(200).json(categories);
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};
