const Signatures = require('../models/signatures.model');
const Petitions = require('../models/petitions.model');
const tools = require('../services/tools');

exports.viewSignatures = async function (req, res) {
    const petitionId = req.params.id;

    try {
        const petition = await Petitions.viewDetails(petitionId);
        if (petition === null) {
            res.statusMessage = 'Not Found';
            res.status(404).send();
        } else {
            const signatures = await Signatures.viewSignatures(petitionId);
            res.statusMessage = 'OK';
            res.status(200).json(signatures);
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.addSignature = async function (req, res) {
    const petitionId = req.params.id;
    const signatoryId = req.authenticatedUserId;

    try {
        const petition = await Petitions.viewDetails(petitionId);
        if (petition === null) {
            res.statusMessage = 'Not Found';
            res.status(404).send();
        } else {
            const existingSignatures = await Signatures.viewSignatures(petitionId);

            if (existingSignatures.find(signature => tools.equalNumbers(signature.signatoryId, signatoryId))) {
                res.statusMessage = 'Forbidden: cannot sign a petition more than once';
                res.status(403).send();
            } else if (tools.isInThePast(petition.closingDate)) {
                res.statusMessage = 'Forbidden: cannot sign a petition that has closed';
                res.status(403).send();
            } else {
                await Signatures.addSignature(petitionId, signatoryId);
                res.statusMessage = 'Created';
                res.status(201).json();
            }
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};

exports.removeSignature = async function (req, res) {
    const petitionId = req.params.id;
    const signatoryId = req.authenticatedUserId;

    try {
        const petition = await Petitions.viewDetails(petitionId);
        if (petition === null) {
            res.statusMessage = 'Not Found';
            res.status(404).send();
        } else if (tools.equalNumbers(petition.authorId, signatoryId)) {
            res.statusMessage = 'Forbidden: cannot remove signature from a petition you created';
            res.status(403).send();
        } else {
            const existingSignatures = await Signatures.viewSignatures(petitionId);

            if (!existingSignatures.find(signature => tools.equalNumbers(signature.signatoryId, signatoryId))) {
                res.statusMessage = 'Forbidden: cannot remove signature from a petition without first signing it';
                res.status(403).send();
            } else if (tools.isInThePast(petition.closingDate)) {
                res.statusMessage = 'Forbidden: cannot sign a petition that has closed';
                res.status(403).send();
            } else {
                await Signatures.removeSignature(petitionId, signatoryId);
                res.statusMessage = 'OK';
                res.status(200).json();
            }
        }
    } catch (err) {
        if (!err.hasBeenLogged) console.error(err);
        res.statusMessage = 'Internal Server Error';
        res.status(500).send();
    }
};
