const db = require('../../config/db');
const errors = require('../services/errors');
const tools = require('../services/tools');

exports.search = async function (query) {
    const {searchSQL, values} = buildSearchSQL(query);

    try {
        let petitions = await db.getPool().query(searchSQL, values);
        return petitions.map(petition => tools.toCamelCase(petition));
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

function buildSearchSQL(query) {
    let searchSQL = `SELECT P.petition_id,
                            title,
                            C.name                     as category,
                            U.name                     as authorName,
                            IFNULL(signature_count, 0) as signature_count
                     FROM Petition P
                              LEFT JOIN User U ON user_id = P.author_id
                              LEFT JOIN Category C ON C.category_id = P.category_id
                              LEFT JOIN (SELECT petition_id, count(signatory_id) as signature_count
                                         FROM Signature
                                         GROUP BY petition_id) S ON S.petition_id = P.petition_id `;
    let values = [];

    // WHERE conditions
    let conditions = [];
    if (query.hasOwnProperty("q")) {
        conditions.push('title LIKE ?');
        values.push(`%${query.q}%`);
    }
    if (query.hasOwnProperty("categoryId")) {
        conditions.push('P.category_id = ?');
        values.push(query.categoryId);
    }
    if (query.hasOwnProperty("authorId")) {
        conditions.push('author_id = ?');
        values.push(query.authorId);
    }
    if (conditions.length) {
        searchSQL += `WHERE ${(conditions ? conditions.join(' AND ') : 1)}\n`;
    }

    // ORDER BY
    switch (query.sortBy) {
        case 'ALPHABETICAL_ASC':
            searchSQL += `ORDER BY title ASC`;
            break;
        case 'ALPHABETICAL_DESC':
            searchSQL += `ORDER BY title DESC`;
            break;
        case 'SIGNATURES_ASC':
            searchSQL += `ORDER BY signature_count ASC`;
            break;
        case 'SIGNATURES_DESC':
        default:
            searchSQL += `ORDER BY signature_count DESC`;
            break;
    }
    searchSQL += ', P.petition_id\n';

    // LIMIT and OFFSET
    if (typeof query.count !== 'undefined') {
        searchSQL += 'LIMIT ?\n';
        values.push(parseInt(query.count));
    }
    if (typeof query.startIndex !== 'undefined') {
        if (typeof query.count === 'undefined') {
            searchSQL += 'LIMIT ?\n';
            values.push(1000000000);
        }
        searchSQL += 'OFFSET ?\n';
        values.push(parseInt(query.startIndex));
    }

    return {searchSQL: searchSQL, values: values};
}

exports.create = async function (petition, userId) {
    const insertSQL = `INSERT INTO Petition
                       (title, description, author_id, category_id, created_date, closing_date)
                       VALUES (?, ?, ?, ?, ?, ?)`;

    const petitionData = [
        petition.title,
        petition.description,
        userId,
        petition.categoryId,
        new Date(),
        petition.closingDate
    ];
    try {
        const result = await db.getPool().query(insertSQL, petitionData);
        return result.insertId;
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.retrieveCategories = async function () {
    const selectSQL = `SELECT category_id, name
                       FROM Category`;

    try {
        const categories = await db.getPool().query(selectSQL);
        return categories.map(category => tools.toCamelCase(category));
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.viewDetails = async function (petitionId) {
    const selectSQL = `SELECT P.petition_id,
                              title,
                              description,
                              U.user_id as author_id,
                              U.name    as author_name,
                              U.city    as author_city,
                              U.country as author_country,
                              signature_count,
                              C.name    as category,
                              created_date,
                              closing_date
                       FROM Petition P
                                LEFT JOIN User U ON user_id = P.author_id
                                LEFT JOIN Category C ON C.category_id = P.category_id
                                LEFT JOIN (SELECT petition_id, count(signatory_id) as signature_count
                                           FROM Signature
                                           GROUP BY petition_id) S ON S.petition_id = P.petition_id
                       WHERE P.petition_id = ?`;

    try {
        const rows = (await db.getPool().query(selectSQL, petitionId));
        if (rows.length) return tools.toCamelCase(rows[0]);
        else return null;
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.modify = async function (modifications, petitionId) {
    const updateSQL = 'UPDATE Petition SET ? WHERE petition_id = ?';

    try {
        await db.getPool().query(updateSQL, [tools.toUnderscoreCase(modifications), petitionId]);
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.delete = async function (petitionId) {
    const deleteSql = `DELETE
                       FROM Petition
                       WHERE petition_id = ?`;
    try {
        const result = await db.getPool().query(deleteSql, petitionId);
        if (result.affectedRows !== 1) {
            throw Error(`Should be exactly one petition that was deleted, but it was ${result.changedRows}.`);
        }
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.getPhotoFilename = async function (userId) {
    const selectSQL = `SELECT photo_filename
                       FROM Petition
                       WHERE petition_id = ?`;

    try {
        const rows = await db.getPool().query(selectSQL, userId);
        if (rows.length) {
            return tools.toCamelCase(rows[0]).photoFilename;
        }
    } catch (err) {
        errors.logSqlError(err);
    }

    return null;
};

exports.setPhotoFilename = async function (petitionId, photoFilename) {
    const updateSQL = `UPDATE Petition
                       SET photo_filename = ?
                       WHERE petition_id = ?`;

    try {
        const result = await db.getPool().query(updateSQL, [photoFilename, petitionId]);
        if (result.changedRows !== 1) {
            throw Error(`Should be exactly one petition\'s photo was modified, but it was ${result.changedRows}.`);
        }
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.getCategories = async function () {
    const selectSQL = `SELECT category_id, name
                       FROM Category`;

    try {
        const categories = await db.getPool().query(selectSQL);
        return categories.map(category => tools.toCamelCase(category));
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.isValidCategory = async function (categoryId) {
    const selectSql = `SELECT *
                       FROM Category
                       WHERE category_id = ?`;

    try {
        const categories = await db.getPool().query(selectSql, categoryId);
        return categories.length > 0;
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};
