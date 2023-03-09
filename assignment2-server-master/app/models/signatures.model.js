const db = require('../../config/db');
const errors = require('../services/errors');
const tools = require('../services/tools');

exports.viewSignatures = async function (petitionId) {
    const selectSql = `SELECT signatory_id, name, city, country, signed_date
                       FROM Signature S
                                LEFT JOIN User U on S.signatory_id = U.user_id
                       WHERE petition_id = ?
                       ORDER BY signed_date`;

    try {
        const rows = (await db.getPool().query(selectSql, petitionId));
        return tools.toCamelCase(rows);
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.addSignature = async function (petitionId, signatoryId) {
    const insertSQL = `INSERT INTO Signature (signatory_id, petition_id, signed_date)
                       VALUES (?, ?, ?)`;

    const signatureData = [signatoryId, petitionId, new Date()];
    try {
        await db.getPool().query(insertSQL, signatureData);
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.removeSignature = async function (petitionId, signatoryId) {
    const deleteSql = `DELETE
                       FROM Signature
                       WHERE signatory_id = ?
                         AND petition_id = ?`;
    const signatureData = [signatoryId, petitionId];
    try {
        await db.getPool().query(deleteSql, signatureData);
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};
