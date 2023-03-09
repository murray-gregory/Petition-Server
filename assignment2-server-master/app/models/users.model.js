const db = require('../../config/db');
const errors = require('../services/errors');
const passwords = require('../services/passwords');
const tools = require('../services/tools');
const randtoken = require('rand-token');

exports.create = async function (user) {
    const createSQL = 'INSERT INTO User (name, email, password, city, country) VALUES (?, ?, ?, ?, ?)';

    const userData = [user.name, user.email, await passwords.hash(user.password), user.city, user.country];

    try {
        const result = await db.getPool().query(createSQL, userData);
        return result.insertId;
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.findByEmail = async function (email) {
    const findSQL = 'SELECT * FROM User WHERE email = ?';

    try {
        const rows = await db.getPool().query(findSQL, [email]);
        return rows.length < 1 ? null : tools.toCamelCase(rows[0]);
    } catch (err) {
        errors.logSqlError(err);
        return null;
    }
};

exports.login = async function (userId) {
    const loginSQL = 'UPDATE User SET auth_token = ? WHERE user_id = ?';
    const token = randtoken.generate(32);

    try {
        await db.getPool().query(loginSQL, [token, userId]);
        return {userId, token}
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.logout = async function (userId) {
    const logoutSQL = 'UPDATE User SET auth_token = NULL WHERE user_id = ?';

    try {
        await db.getPool().query(logoutSQL, userId);
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.findById = async function (id, isCurrentUser = false) {
    const viewSQL = 'SELECT * FROM User WHERE user_id = ?';

    try {
        const rows = await db.getPool().query(viewSQL, id);
        if (rows.length < 1) {
            return null;
        } else {
            const foundUser = tools.toCamelCase(rows[0]);
            let userData = {
                name: foundUser.name,
                city: foundUser.city,
                country: foundUser.country,
            };
            if (isCurrentUser) {
                userData.email = foundUser.email;
            }
            return userData;
        }
    } catch (err) {
        errors.logSqlError(err);
        return null;
    }
};

exports.modify = async function (userId, modification) {
    const updateSQL = 'UPDATE User SET ? WHERE user_id = ?';

    // Hash the new password if it has been changed
    if (modification.password) {
        modification.password = await passwords.hash(modification.password);
    }

    try {
        await db.getPool().query(updateSQL, [tools.toUnderscoreCase(modification), userId]);
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};

exports.getProfilePhotoFilename = async function (userId) {
    const selectSQL = 'SELECT photo_filename FROM User WHERE user_id = ?';

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

exports.setProfilePhotoFilename = async function (userId, photoFilename) {
    const updateSQL = 'UPDATE User SET photo_filename = ? WHERE user_id = ?';

    try {
        const result = await db.getPool().query(updateSQL, [photoFilename, userId]);
        if (result.changedRows !== 1) {
            throw Error('Should be exactly one user whose profile photo was modified.');
        }
    } catch (err) {
        errors.logSqlError(err);
        throw err;
    }
};
