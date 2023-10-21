const express = require('express');
const router = express.Router();

const Buildings_Controller = require('./controllers/buildings.js');

router.get('/get/:buildingId', Buildings_Controller.building_get);
router.get('/all/:sortBy/:sortDir', Buildings_Controller.all_buildings_get);
router.post('/add', Buildings_Controller.buildings_add_post);
router.post('/delete/add', Buildings_Controller.buildings_delete_post);
router.get('/pending/get/:buildingId', Buildings_Controller.pending_get);
router.get('/pending-additions/:sortBy/:sortDir', Buildings_Controller.pending_additions_get);
router.post('/pending-additions/approve/:sortBy/:sortDir', Buildings_Controller.approve_pending_addition_post);
router.post('/pending-additions/remove/:sortBy/:sortDir', Buildings_Controller.remove_pending_addition_post);
router.get('/pending-deletions/:sortBy/:sortDir', Buildings_Controller.pending_deletions_get);
router.post('/pending-deletions/approve/:sortBy/:sortDir', Buildings_Controller.approve_pending_deletion_post);
router.post('/pending-deletions/remove/:sortBy/:sortDir', Buildings_Controller.remove_pending_deletion_post);

router.get(/^(\/[A-Za-z0-9-]*)*$/, Buildings_Controller.home_get);

module.exports = router;
