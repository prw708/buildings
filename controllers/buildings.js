const { v4: uuidv4 } = require('uuid');
const { body, param, query, matchedData, validationResult } = require('express-validator');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage()
});

const cookieOptions = require('../../scripts/cookieOptions');
const utils = require('../../scripts/utilities');
const winston = require('../../scripts/log');
const rateLimiter = require('../../scripts/rateLimiter');

const web = require('../../dbWeb.js');
const simcity4 = require('../../dbSimCity4.js');

const BASEPATH = '/projects/buildings';

exports.home_get = function(req, res, next) {
  web.user.findOne({ username: req.session.loggedInAs, admin: true }).exec()
    .then(function(user) {
      if (!user) {
        res.render('../buildings/views/all', {
          title: 'SimCity 4 Buildings',
          admin: 'false'
        });
      } else {
        res.render('../buildings/views/all', {
          title: 'SimCity 4 Buildings',
          admin: 'true'
        });
      }
    });
};

exports.buildings_add_post = [
  upload.single('image'),
  body('id', 'Invalid ID.')
    .trim()
    .isLength({ min: 36, max: 36 })
    .matches(/^[A-Fa-f0-9\-]{36}$/)
    .whitelist('A-Fa-f0-9\\-')
    .escape()
    .optional({ checkFalsy: true }),
  body('name', 'Must be 1 to 200 characters. Can contain A-Z, a-z, 0-9, spaces, and .,_"\'()-.')
    .trim()
    .isLength({ min: 1, max: 200 })
    .matches(/^[A-Za-z0-9 .,_"'()-]{1,200}$/)
    .whitelist('A-Za-z0-9 .,_"\'\(\)\\-'),
  body('occupancy', 'Must be a valid number.')
    .trim()
    .isLength({ min: 1, max: 4 })
    .matches(/^[0-9]{1,4}$/)
    .whitelist('0-9')
    .isNumeric({ no_symbols: true })
    .isInt({ min: 1, max: 9999 })
    .escape(),
  body('type', 'Must be a valid type.')
    .trim()
    .isIn([
      'R-$', 'R-$$', 'R-$$$',
      'CS-$', 'CS-$$', 'CS-$$$',
      'CO-$$', 'CO-$$$',
      'I-AG', 'I-D', 'I-M', 'I-HT'
    ])
    .escape(),
  body('tiles.*', 'Must be a valid type.')
    .trim()
    .isIn([
      '1x1', '1x2', '1x3', '1x4',
      '2x1', '2x2', '2x3', '2x4',
      '3x1', '3x2', '3x3', '3x4',
      '4x1', '4x2', '4x3', '4x4'
    ])
    .escape(),
  body('style', 'Must be a valid style.')
    .trim()
    .isIn([
      'None',
      '1890 Chicago',
      '1940 New York',
      '1990 Houston',
      'Euro Contemporary'
    ])
    .escape(),
  body('time', 'Invalid value.')
    .trim()
    .escape()
    .isNumeric({ no_symbols: true })
    .isInt()
    .toInt(10),
  body('g-recaptcha-response', 'Failed reCAPTCHA test.')
    .trim()
    .escape()
    .matches(/^[A-Za-z0-9_\-]+$/),
  async function(req, res, next) {
    let data = matchedData(req, { includeOptionals: true, onlyValidData: true, locations: ['body'] });
    let errors = validationResult(req);
    let pastTime = utils.pastTimeFrame(data.time, 2);
    if (!req.session.loggedInAs || !req.session.loggedInAsId) {
      res.status(401).json('Not logged in.');
    } else if (req.file && req.file.size > 1000000) {
      errors = errors.array({ onlyFirstError: true });
      errors.push({
        param: 'image',
        msg: 'Image file must be less than 1MB.'
      });
      res.status(400).json(errors);
    } else if (req.file && 
      req.file.mimetype !== 'image/png' && 
      req.file.mimetype !== 'image/jpeg' && 
      req.file.mimetype !== 'image/gif'
    ) {
      errors = errors.array({ onlyFirstError: true });
      errors.push({
        param: 'image',
        msg: 'Please use a valid image.'
      });
      res.status(400).json(errors);
    } else if (errors.isEmpty() && pastTime) {
      try {
        const url = 'https://www.google.com/recaptcha/api/siteverify';
        const requestData = 'secret=' + encodeURIComponent(process.env.RECAPTCHA_SECRET_KEY) + '&' + 
                            'response=' + encodeURIComponent(data['g-recaptcha-response']);
        let success = await utils.postJSON(url, {}, requestData, (parsedJSON) => {
          if (parsedJSON.success === true && 
              parsedJSON.score >= 0.7 && 
              parsedJSON.action === 'add' &&
              parsedJSON.hostname === req.hostname) {
            return true;
          } else {
            throw new Error('Failed reCAPTCHA test.');
          }
        });
        let existing;
        let query;
        if (data.id) {
          query = { id: data.id };
        } else {
          query = { name: data.name };
        }
        simcity4.building.findOne(query).exec()
          .then(function(doc) {
            existing = doc;
            return simcity4.pendingAddition.findOne({ name: data.name }).exec();
          })
          .then(function(building) {
            let image;
            if (req.file) {
              image = req.file.buffer.toString('base64');
            } else if (existing && existing.image) {
              image = existing.image;
            } else {
              image = '';
            }
            if (building) {
              building.id = (existing && existing.id) ? existing.id : building.id;
              building.name = data.name;
              building.occupancy = data.occupancy;
              building.type = data.type;
              building.tiles = data.tiles;
              building.style = data.style;
              building.lastUpdated = Date.now();
              building.image = image;
            } else {
              building = new simcity4.pendingAddition({
                id: (existing && existing.id) ? existing.id : uuidv4(),
                name: data.name,
                occupancy: data.occupancy,
                type: data.type,
                tiles: data.tiles,
                style: data.style,
                lastUpdated: Date.now(),
                image: image
              });
            }
            return building.save();
          })
          .then(function(doc) {
            res.status(200).json('Addition awaiting approval!');
          })
          .catch(function(error) {
            if (error) {
              winston.logger.error(error);
            }
            errors = [];
            errors.push({
              param: 'addBuildingMessage',
              msg: 'Add building failed.'
            });
            res.status(400).json(errors);
          });
      } catch (error) {
        if (error) {
          winston.logger.error(error);
        }
        errors = errors.array({ onlyFirstError: true });
        errors.push({
          param: 'addBuildingMessage',
          msg: 'Add building failed.'
        });
        res.status(400).json(errors);
      }
    } else {
      errors = errors.array({ onlyFirstError: true });
      res.status(400).json(errors);
    }
  }
];

exports.pending_additions_get = [
  param('sortBy', 'Invalid sort.')
    .isIn([ 'name', 'occupancy', 'type', 'lastUpdated' ]),
  param('sortDir', 'Must be asc or desc.')
    .isIn([ 'asc', 'desc' ]),
  function(req, res, next) {
    let data = matchedData(req, { includeOptionals: true, onlyValidData: true, locations: ['params'] });
    let errors = validationResult(req);
    if (errors.isEmpty()) {
      let sortParameters = {};
      sortParameters[data.sortBy] = data.sortDir;
      sortParameters['name'] = data.sortDir;
      simcity4.pendingAddition.find({})
        .collation({ locale: 'en' })
        .select('-image')
        .sort(sortParameters)
        .lean()
        .exec()
        .then(function(additions) {
          if (!additions) {
            res.status(404).json('No buildings found.');
          } else {
            for (let addition of additions) {
              let formattedLastUpdated = utils.getDateTime(req.signedCookies.TD, addition.lastUpdated);
              addition.lastUpdated = formattedLastUpdated.dateString + ' ' + formattedLastUpdated.timeString;
            }
            res.status(200).json(additions);
          }
        })
        .catch(function(err) {
          if (err) {
            winston.logger.error(err);
          }
          res.status(400).json('Get pending additions failed.');
        });
    } else {
      errors = errors.array({ onlyFirstError: true });
      res.status(400).json(errors);
    }
  }
];

exports.approve_pending_addition_post = [
  body('id', 'Invalid ID.')
    .trim()
    .isLength({ min: 36, max: 36 })
    .matches(/^[A-Fa-f0-9\-]{36}$/)
    .whitelist('A-Fa-f0-9\\-')
    .escape(),
  body('time', 'Invalid value.')
    .trim()
    .escape()
    .isNumeric({ no_symbols: true })
    .isInt()
    .toInt(10),
  body('g-recaptcha-response', 'Failed reCAPTCHA test.')
    .trim()
    .escape()
    .matches(/^[A-Za-z0-9_\-]+$/),
  param('sortBy', 'Invalid sort.')
    .isIn([ 'name', 'occupancy', 'type', 'lastUpdated' ]),
  param('sortDir', 'Must be asc or desc.')
    .isIn([ 'asc', 'desc' ]),
  function(req, res, next) {
    let data = matchedData(req, { includeOptionals: true, onlyValidData: true, locations: ['body', 'params'] });
    let errors = validationResult(req);
    let pastTime = utils.pastTimeFrame(data.time, 2);
    if (!req.session.loggedInAs || !req.session.loggedInAsId) {
      res.status(401).json('Not logged in.');
    } else if (!req.session.admin) {
      res.status(401).json('Your account does not have access to this content.');
    } else if (errors.isEmpty() && pastTime) {
      let approved;
      const url = 'https://www.google.com/recaptcha/api/siteverify';
      const requestData = 'secret=' + encodeURIComponent(process.env.RECAPTCHA_SECRET_KEY) + '&' + 
                          'response=' + encodeURIComponent(data['g-recaptcha-response']);
      utils.postJSON(url, {}, requestData, (parsedJSON) => {
        if (parsedJSON.success === true && 
            parsedJSON.score >= 0.7 && 
            parsedJSON.action === 'approve' &&
            parsedJSON.hostname === req.hostname) {
          return simcity4.pendingAddition.findOneAndDelete({ id: data.id }).exec();
        } else {
          return Promise.reject('Failed reCAPTCHA test.');
        }
      })
      .then(function(match) {
        if (!match) {
          return Promise.reject(null);
        }
        approved = match;
        return simcity4.building.findOne({ id: approved.id }).exec();
      })
      .then(function(building) {
        if (building) {
          building.id = approved.id;
          building.name = approved.name;
          building.occupancy = approved.occupancy,
          building.type = approved.type,
          building.tiles = approved.tiles,
          building.style = approved.style,
          building.lastUpdated = Date.now(),
          building.image = (approved.image) ? approved.image : building.image
        } else {
          building = new simcity4.building({
            id: approved.id,
            name: approved.name,
            occupancy: approved.occupancy,
            type: approved.type,
            tiles: approved.tiles,
            style: approved.style,
            lastUpdated: Date.now(),
            image: approved.image
          });
        }
        return building.save();
      })
      .then(function(match) {
        if (!match) {
          return Promise.reject(null);
        }
        let sortParameters = {};
        sortParameters[data.sortBy] = data.sortDir;
        sortParameters['name'] = data.sortDir;
        return simcity4.pendingAddition.find({})
          .collation({ locale: 'en' })
          .select('-image')
          .sort(sortParameters)
          .lean()
          .exec();
      })
      .then(function(additions) {
        if (!additions) {
          errors = [];
          errors.push({
            param: 'noPendingAdditionsFoundMessage',
            msg: 'An error occurred while getting the pending additions.'
          });
          res.status(404).json(errors);
        } else {
          for (let addition of additions) {
            let formattedLastUpdated = utils.getDateTime(req.signedCookies.TD, addition.lastUpdated);
            addition.lastUpdated = formattedLastUpdated.dateString + ' ' + formattedLastUpdated.timeString;
          }
          res.status(200).json(additions);
        }
      })
      .catch(function(err) {
        if (err) {
          winston.logger.error(err);
        }
        errors = errors.array({ onlyFirstError: true });
        errors.push({
          param: 'approvePendingAdditionMessage',
          msg: 'An error occurred while approving the pending addition.'
        });
        res.status(400).json(errors);
      });
    } else {
      errors = errors.array({ onlyFirstError: true });
      res.status(400).json(errors);
    }
  }
];

exports.remove_pending_addition_post = [
  body('id', 'Invalid ID.')
    .trim()
    .isLength({ min: 36, max: 36 })
    .matches(/^[A-Fa-f0-9\-]{36}$/)
    .whitelist('A-Fa-f0-9\\-')
    .escape(),
  body('time', 'Invalid value.')
    .trim()
    .escape()
    .isNumeric({ no_symbols: true })
    .isInt()
    .toInt(10),
  body('g-recaptcha-response', 'Failed reCAPTCHA test.')
    .trim()
    .escape()
    .matches(/^[A-Za-z0-9_\-]+$/),
  param('sortBy', 'Invalid sort.')
    .isIn([ 'name', 'occupancy', 'type', 'lastUpdated' ]),
  param('sortDir', 'Must be asc or desc.')
    .isIn([ 'asc', 'desc' ]),
  function(req, res, next) {
    let data = matchedData(req, { includeOptionals: true, onlyValidData: true, locations: ['body', 'params'] });
    let errors = validationResult(req);
    let pastTime = utils.pastTimeFrame(data.time, 2);
    if (!req.session.loggedInAs || !req.session.loggedInAsId) {
      res.status(401).json('Not logged in.');
    } else if (!req.session.admin) {
      res.status(401).json('Your account does not have access to this content.');
    } else if (errors.isEmpty() && pastTime) {
      const url = 'https://www.google.com/recaptcha/api/siteverify';
      const requestData = 'secret=' + encodeURIComponent(process.env.RECAPTCHA_SECRET_KEY) + '&' + 
                          'response=' + encodeURIComponent(data['g-recaptcha-response']);
      utils.postJSON(url, {}, requestData, (parsedJSON) => {
        if (parsedJSON.success === true && 
            parsedJSON.score >= 0.7 && 
            parsedJSON.action === 'remove' &&
            parsedJSON.hostname === req.hostname) {
          return simcity4.pendingAddition.findOneAndDelete({ id: data.id }).exec();
        } else {
          return Promise.reject('Failed reCAPTCHA test.');
        }
      })
      .then(function(match) {
        if (!match) {
          return Promise.reject(null);
        }
        let sortParameters = {};
        sortParameters[data.sortBy] = data.sortDir;
        sortParameters['name'] = data.sortDir;
        return simcity4.pendingAddition.find({})
          .collation({ locale: 'en' })
          .select('-image')
          .sort(sortParameters)
          .lean()
          .exec();
      })
      .then(function(additions) {
        if (!additions) {
          errors = [];
          errors.push({
            param: 'noPendingAdditionsFoundMessage',
            msg: 'An error occurred while getting the pending additions.'
          });
          res.status(404).json(errors);
        } else {
          for (let addition of additions) {
            let formattedLastUpdated = utils.getDateTime(req.signedCookies.TD, addition.lastUpdated);
            addition.lastUpdated = formattedLastUpdated.dateString + ' ' + formattedLastUpdated.timeString;
          }
          res.status(200).json(additions);
        }
      })
      .catch(function(err) {
        if (err) {
          winston.logger.error(err);
        }
        errors = errors.array({ onlyFirstError: true });
        errors.push({
          param: 'removePendingAdditionMessage',
          msg: 'An error occurred while removing the pending addition.'
        });
        res.status(400).json(errors);
      });
    } else {
      errors = errors.array({ onlyFirstError: true });
      res.status(400).json(errors);
    }
  }
];

exports.pending_get = [
  param('buildingId', 'Invalid ID.')
    .trim()
    .isLength({ min: 36, max: 36 })
    .matches(/^[A-Fa-f0-9\-]{36}$/)
    .whitelist('A-Fa-f0-9\\-')
    .escape(),
  function(req, res, next) {
    let data = matchedData(req, { includeOptionals: true, onlyValidData: true, locations: ['params'] });
    let errors = validationResult(req);
    if (!req.session.admin) {
      winston.logger.error('Insufficient privileges.');
      errors = [];
      errors.push({
        param: 'insufficientPrivileges',
        msg: 'Your account does not have access to this content.'
      });
      res.status(401).json(errors);
    } else if (errors.isEmpty()) {
      simcity4.pendingAddition.findOne({ id: data.buildingId })
        .lean()
        .exec()
        .then(function(building) {
          let formattedLastUpdated = utils.getDateTime(req.signedCookies.TD, building.lastUpdated);
          building.lastUpdated = formattedLastUpdated.dateString + ' ' + formattedLastUpdated.timeString;
          res.status(200).json(building);
        })
        .catch(function(error) {
          if (error) {
            winston.logger.error(error);
          }
          errors = [];
          errors.push({
            param: 'displayPendingAdditionMessage',
            msg: 'An error occurred while getting the pending addition.'
          });
          res.status(400).json(errors);
        });
    } else {
      errors = errors.array({ onlyFirstError: true });
      res.status(400).json(errors);
    }
  }
];

exports.buildings_delete_post = [
  body('id', 'Invalid ID.')
    .trim()
    .isLength({ min: 36, max: 36 })
    .matches(/^[A-Fa-f0-9\-]{36}$/)
    .whitelist('A-Fa-f0-9\\-')
    .escape(),
  body('time', 'Invalid value.')
    .trim()
    .escape()
    .isNumeric({ no_symbols: true })
    .isInt()
    .toInt(10),
  body('g-recaptcha-response', 'Failed reCAPTCHA test.')
    .trim()
    .escape()
    .matches(/^[A-Za-z0-9_\-]+$/),
  function(req, res, next) {
    let data = matchedData(req, { includeOptionals: true, onlyValidData: true, locations: ['body'] });
    let errors = validationResult(req);
    let pastTime = utils.pastTimeFrame(data.time, 2);
    if (!req.session.loggedInAs || !req.session.loggedInAsId) {
      errors = [];
      errors.push({
        param: 'removeDeletionMessage',
        msg: 'You must be logged in to delete buildings.'
      });
      res.status(401).json(errors);
    } else if (errors.isEmpty() && pastTime) {
      let deletion;
      const url = 'https://www.google.com/recaptcha/api/siteverify';
      const requestData = 'secret=' + encodeURIComponent(process.env.RECAPTCHA_SECRET_KEY) + '&' + 
                          'response=' + encodeURIComponent(data['g-recaptcha-response']);
      utils.postJSON(url, {}, requestData, (parsedJSON) => {
        if (parsedJSON.success === true && 
            parsedJSON.score >= 0.7 && 
            parsedJSON.action === 'delete' &&
            parsedJSON.hostname === req.hostname) {
          return simcity4.building.findOne({ id: data.id }).exec();
        } else {
          return Promise.reject('Failed reCAPTCHA test.');
        }
      })
      .then(function(match) {
        if (!match) {
          return Promise.reject(null);
        }
        deletion = match;
        return simcity4.pendingDeletion.findOne({ name: deletion.name }).exec();
      })
      .then(function(building) {
        if (building) {
          building.name = deletion.name;
          building.submittedDate = Date.now();
        } else {
          building = new simcity4.pendingDeletion({
            building: deletion._id,
            name: deletion.name,
            submittedDate: Date.now(),
          });
        }
        return building.save();
      })
      .then(function(deletion) {
        res.status(200).json('Deletion awaiting approval!');
      })
      .catch(function(err) {
        if (err) {
          winston.logger.error(err);
        }
        errors = errors.array({ onlyFirstError: true });
        errors.push({
          param: 'removeDeletionMessage',
          msg: 'An error occurred while deleting the building.'
        });
        res.status(400).json(errors);
      });
    } else {
      errors = errors.array({ onlyFirstError: true });
      res.status(400).json(errors);
    }
  }
];

exports.all_buildings_get = [
  param('sortBy', 'Invalid sort.')
    .isIn([ 'name', 'occupancy', 'type', 'lastUpdated' ]),
  param('sortDir', 'Must be asc or desc.')
    .isIn([ 'asc', 'desc' ]),
  query('skip', 'Invalid skip.')
    .trim()
    .escape()
    .isNumeric({ no_symbols: true })
    .isInt({ min: 0 })
    .toInt(10)
    .optional({ checkFalsy: true }),
  query('limit', 'Invalid limit.')
    .trim()
    .escape()
    .isNumeric({ no_symbols: true })
    .isInt({ min: 1 })
    .toInt(10)
    .optional({ checkFalsy: true }),
  query('searchText', 'Invalid search text.')
    .trim()
    .isLength({ min: 1, max: 200 })
    .matches(/^[A-Za-z0-9 .,_"'()-]{1,200}$/)
    .whitelist('A-Za-z0-9 .,_"\'\(\)\\-')
    .optional({ checkFalsy: true }),
  function(req, res, next) {
    let data = matchedData(req, { includeOptionals: true, onlyValidData: true, locations: ['params', 'query'] });
    let errors = validationResult(req);
    if (errors.isEmpty()) {
      let sortParameters = {};
      sortParameters[data.sortBy] = data.sortDir;
      sortParameters['name'] = data.sortDir;
      let limit = (data.limit) ? data.limit : Number.MAX_VALUE;
      let searchParameters = (data.searchText) ? { name: new RegExp(data.searchText, 'i') } : {};
      simcity4.building.find(searchParameters)
        .collation({ locale: 'en' })
        .sort(sortParameters)
        .skip(data.skip)
        .limit(limit)
        .lean()
        .exec()
        .then(function(buildings) {
          if (!buildings) {
            res.status(404).json('No buildings found.');
          } else {
            for (let building of buildings) {
              let formattedLastUpdated = utils.getDateTime(req.signedCookies.TD, building.lastUpdated);
              building.lastUpdated = formattedLastUpdated.dateString + ' ' + formattedLastUpdated.timeString;
            }
            res.status(200).json(buildings);
          }
        })
        .catch(function(err) {
          if (err) {
            winston.logger.error(err);
          }
          res.status(400).json('Get buildings failed.');
        });
    } else {
      errors = errors.array({ onlyFirstError: true });
      res.status(400).json(errors);
    }
  }
];

exports.pending_deletions_get = [
  param('sortBy', 'Invalid sort.')
    .isIn([ 'name', 'occupancy', 'type', 'submittedDate' ]),
  param('sortDir', 'Must be asc or desc.')
    .isIn([ 'asc', 'desc' ]),
  function(req, res, next) {
    let data = matchedData(req, { includeOptionals: true, onlyValidData: true, locations: ['params'] });
    let errors = validationResult(req);
    if (errors.isEmpty()) {
      let sortParameters = {};
      sortParameters[data.sortBy] = data.sortDir;
      sortParameters['name'] = data.sortDir;
      simcity4.pendingDeletion.find({})
        .collation({ locale: 'en' })
        .select('-image')
        .sort(sortParameters)
        .populate('building')
        .lean()
        .exec()
        .then(function(deletions) {
          if (!deletions) {
            res.status(404).json('No buildings found.');
          } else {
            for (let d of deletions) {
              let formattedSubmittedDate = utils.getDateTime(req.signedCookies.TD, d.submittedDate);
              d.submittedDate = formattedSubmittedDate.dateString + ' ' + formattedSubmittedDate.timeString;
            }
            if (data.sortBy === 'occupancy') {
              deletions.sort((a, b) => {
                if (a.building.occupancy > b.building.occupancy) {
                  if (data.sortDir === 'asc') {
                    return 1;
                  } else {
                    return -1;
                  }
                } else if (a.building.occupancy < b.building.occupancy) {
                  if (data.sortDir === 'asc') {
                    return -1;
                  } else {
                    return 1;
                  }
                } else {
                  if (a.building.name > b.building.name) {
                    if (data.sortDir === 'asc') {
                      return 1;
                    } else {
                      return -1;
                    }
                  } else if (a.building.name < b.building.name) {
                    if (data.sortDir === 'asc') {
                      return -1;
                    } else {
                      return 1;
                    }
                  } else {
                    return 0;
                  }
                }
              });
            } else if (data.sortBy === 'type') {
              deletions.sort((a, b) => {
                if (a.building.type > b.building.type) {
                  if (data.sortDir === 'asc') {
                    return 1;
                  } else {
                    return -1;
                  }
                } else if (a.building.type < b.building.type) {
                  if (data.sortDir === 'asc') {
                    return -1;
                  } else {
                    return 1;
                  }
                } else {
                  if (a.building.name > b.building.name) {
                    if (data.sortDir === 'asc') {
                      return 1;
                    } else {
                      return -1;
                    }
                  } else if (a.building.name < b.building.name) {
                    if (data.sortDir === 'asc') {
                      return -1;
                    } else {
                      return 1;
                    }
                  } else {
                    return 0;
                  }
                }
              });
            }
            res.status(200).json(deletions);
          }
        })
        .catch(function(err) {
          if (err) {
            winston.logger.error(err);
          }
          res.status(400).json('Get pending deletions failed.');
        });
    } else {
      errors = errors.array({ onlyFirstError: true });
      res.status(400).json(errors);
    }
  }
];

exports.approve_pending_deletion_post = [
  body('id', 'Invalid ID.')
    .trim()
    .isLength({ min: 36, max: 36 })
    .matches(/^[A-Fa-f0-9\-]{36}$/)
    .whitelist('A-Fa-f0-9\\-')
    .escape(),
  body('time', 'Invalid value.')
    .trim()
    .escape()
    .isNumeric({ no_symbols: true })
    .isInt()
    .toInt(10),
  body('g-recaptcha-response', 'Failed reCAPTCHA test.')
    .trim()
    .escape()
    .matches(/^[A-Za-z0-9_\-]+$/),
  param('sortBy', 'Invalid sort.')
    .isIn([ 'name', 'occupancy', 'type', 'submittedDate' ]),
  param('sortDir', 'Must be asc or desc.')
    .isIn([ 'asc', 'desc' ]),
  function(req, res, next) {
    let data = matchedData(req, { includeOptionals: true, onlyValidData: true, locations: ['body', 'params'] });
    let errors = validationResult(req);
    let pastTime = utils.pastTimeFrame(data.time, 2);
    if (!req.session.loggedInAs || !req.session.loggedInAsId) {
      res.status(401).json('Not logged in.');
    } else if (!req.session.admin) {
      res.status(401).json('Your account does not have access to this content.');
    } else if (errors.isEmpty() && pastTime) {
      let deletion;
      const url = 'https://www.google.com/recaptcha/api/siteverify';
      const requestData = 'secret=' + encodeURIComponent(process.env.RECAPTCHA_SECRET_KEY) + '&' + 
                          'response=' + encodeURIComponent(data['g-recaptcha-response']);
      utils.postJSON(url, {}, requestData, (parsedJSON) => {
        if (parsedJSON.success === true && 
            parsedJSON.score >= 0.7 && 
            parsedJSON.action === 'approve' &&
            parsedJSON.hostname === req.hostname) {
          return simcity4.building.findOneAndDelete({ id: data.id }).exec();
        } else {
          return Promise.reject('Failed reCAPTCHA test.');
        }
      })
      .then(function(match) {
        if (!match) {
          return Promise.reject(null);
        }
        deletion = match;
        return simcity4.pendingDeletion.findOneAndDelete({ building: deletion._id }).exec();
      })
      .then(function(match) {
        if (!match) {
          return Promise.reject(null);
        }
        let sortParameters = {};
        sortParameters[data.sortBy] = data.sortDir;
        sortParameters['name'] = data.sortDir;
        return simcity4.pendingDeletion.find({})
          .collation({ locale: 'en' })
          .select('-image')
          .sort(sortParameters)
          .populate('building')
          .lean()
          .exec();
      })
      .then(function(deletions) {
        if (!deletions) {
          errors = [];
          errors.push({
            param: 'noPendingDeletionsFoundMessage',
            msg: 'An error occurred while getting the pending deletions.'
          });
          res.status(404).json(errors);
        } else {
          for (let d of deletions) {
            let formattedSubmittedDate = utils.getDateTime(req.signedCookies.TD, d.submittedDate);
            d.submittedDate = formattedSubmittedDate.dateString + ' ' + formattedSubmittedDate.timeString;
          }
          res.status(200).json(deletions);
        }
      })
      .catch(function(err) {
        if (err) {
          winston.logger.error(err);
        }
        errors = errors.array({ onlyFirstError: true });
        errors.push({
          param: 'approvePendingDeletionMessage',
          msg: 'An error occurred while approving the pending deletion.'
        });
        res.status(400).json(errors);
      });
    } else {
      errors = errors.array({ onlyFirstError: true });
      res.status(400).json(errors);
    }
  }
];

exports.remove_pending_deletion_post = [
  body('id', 'Invalid ID.')
    .trim()
    .isLength({ min: 36, max: 36 })
    .matches(/^[A-Fa-f0-9\-]{36}$/)
    .whitelist('A-Fa-f0-9\\-')
    .escape(),
  body('time', 'Invalid value.')
    .trim()
    .escape()
    .isNumeric({ no_symbols: true })
    .isInt()
    .toInt(10),
  body('g-recaptcha-response', 'Failed reCAPTCHA test.')
    .trim()
    .escape()
    .matches(/^[A-Za-z0-9_\-]+$/),
  param('sortBy', 'Invalid sort.')
    .isIn([ 'name', 'occupancy', 'type', 'submittedDate' ]),
  param('sortDir', 'Must be asc or desc.')
    .isIn([ 'asc', 'desc' ]),
  function(req, res, next) {
    let data = matchedData(req, { includeOptionals: true, onlyValidData: true, locations: ['body', 'params'] });
    let errors = validationResult(req);
    let pastTime = utils.pastTimeFrame(data.time, 2);
    if (!req.session.loggedInAs || !req.session.loggedInAsId) {
      res.status(401).json('Not logged in.');
    } else if (!req.session.admin) {
      res.status(401).json('Your account does not have access to this content.');
    } else if (errors.isEmpty() && pastTime) {
      const url = 'https://www.google.com/recaptcha/api/siteverify';
      const requestData = 'secret=' + encodeURIComponent(process.env.RECAPTCHA_SECRET_KEY) + '&' + 
                          'response=' + encodeURIComponent(data['g-recaptcha-response']);
      utils.postJSON(url, {}, requestData, (parsedJSON) => {
        if (parsedJSON.success === true && 
            parsedJSON.score >= 0.7 && 
            parsedJSON.action === 'remove' &&
            parsedJSON.hostname === req.hostname) {
          return simcity4.building.findOne({ id: data.id }).exec();
        } else {
          return Promise.reject('Failed reCAPTCHA test.');
        }
      })
      .then(function(match) {
        if (!match) {
          return Promise.reject(null);
        }
        return simcity4.pendingDeletion.findOneAndDelete({ building: match._id }).exec();
      })
      .then(function(match) {
        if (!match) {
          return Promise.reject(null);
        }
        let sortParameters = {};
        sortParameters[data.sortBy] = data.sortDir;
        sortParameters['name'] = data.sortDir;
        return simcity4.pendingDeletion.find({})
          .collation({ locale: 'en' })
          .select('-image')
          .sort(sortParameters)
          .populate('building')
          .lean()
          .exec();
      })
      .then(function(deletions) {
        if (!deletions) {
          errors = [];
          errors.push({
            param: 'noPendingDeletionsFoundMessage',
            msg: 'An error occurred while getting the pending deletions.'
          });
          res.status(404).json(errors);
        } else {
          for (let d of deletions) {
            let formattedSubmittedDate = utils.getDateTime(req.signedCookies.TD, d.submittedDate);
            d.submittedDate = formattedSubmittedDate.dateString + ' ' + formattedSubmittedDate.timeString;
          }
          res.status(200).json(deletions);
        }
      })
      .catch(function(err) {
        if (err) {
          winston.logger.error(err);
        }
        errors = errors.array({ onlyFirstError: true });
        errors.push({
          param: 'removePendingDeletionMessage',
          msg: 'An error occurred while removing the pending deletion.'
        });
        res.status(400).json(errors);
      });
    } else {
      errors = errors.array({ onlyFirstError: true });
      res.status(400).json(errors);
    }
  }
];

exports.building_get = [
  param('buildingId', 'Invalid ID.')
    .trim()
    .isLength({ min: 36, max: 36 })
    .matches(/^[A-Fa-f0-9\-]{36}$/)
    .whitelist('A-Fa-f0-9\\-')
    .escape(),
  function(req, res, next) {
    let data = matchedData(req, { includeOptionals: true, onlyValidData: true, locations: ['params'] });
    let errors = validationResult(req);
    if (errors.isEmpty()) {
      simcity4.building.findOne({ id: data.buildingId })
        .lean()
        .exec()
        .then(function(building) {
          let formattedLastUpdated = utils.getDateTime(req.signedCookies.TD, building.lastUpdated);
          building.lastUpdated = formattedLastUpdated.dateString + ' ' + formattedLastUpdated.timeString;
          res.status(200).json(building);
        })
        .catch(function(error) {
          if (error) {
            winston.logger.error(error);
          }
          errors = [];
          errors.push({
            param: 'displayPendingAdditionMessage',
            msg: 'An error occurred while getting the building.'
          });
          res.status(400).json(errors);
        });
    } else {
      errors = errors.array({ onlyFirstError: true });
      res.status(400).json(errors);
    }
  }
];
