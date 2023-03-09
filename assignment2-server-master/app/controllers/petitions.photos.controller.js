const Petitions = require('../models/petitions.model');
const Photos = require('../models/photos.model');
const tools = require('../services/tools');

exports.getPhoto = async function (req, res) {
    try {
        const filename = await Petitions.getPhotoFilename(req.params.id);
        if (filename == null) {
            res.statusMessage = 'Not Found';
            res.status(404).send();
        } else {
            const imageDetails = await Photos.retrievePhoto(filename);
            res.statusMessage = 'OK';
            res.status(200).contentType(imageDetails.mimeType).send(imageDetails.image);
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.setPhoto = async function (req, res) {
    const image = req.body;
    const petitionId = req.params.id;

    const petition = await Petitions.viewDetails(petitionId);
    if (!petition) {
        res.statusMessage = 'Not Found';
        res.status(404).send();
        return;
    }

    // Check that the authenticated user isn't trying to change anyone else's petition's photo
    if (!tools.equalNumbers(petition.authorId, req.authenticatedUserId)) {
        res.statusMessage = 'Forbidden';
        res.status(403).send();
        return;
    }

    // Find the file extension for this photo
    const mimeType = req.header('Content-Type');
    const fileExt = tools.getImageExtension(mimeType);
    if (fileExt === null) {
        res.statusMessage = 'Bad Request: photo must be image/jpeg, image/png, image/gif type, but it was: ' + mimeType;
        res.status(400).send();
        return;
    }

    if (req.body.length === undefined) {
        res.statusMessage = 'Bad request: empty image';
        res.status(400).send();
        return;
    }

    try {
        const existingPhoto = await Petitions.getPhotoFilename(petitionId);
        if (existingPhoto) {
            await Photos.deletePhoto(existingPhoto);
        }

        const filename = await Photos.storePhoto(image, fileExt);
        await Petitions.setPhotoFilename(petitionId, filename);
        if (existingPhoto) {
            res.statusMessage = 'OK';
            res.status(200).send();
        } else {
            res.statusMessage = 'Created';
            res.status(201).send();
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};
