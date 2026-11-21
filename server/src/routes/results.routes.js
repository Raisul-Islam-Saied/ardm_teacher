const express = require('express');
const {
    listPublicExams,
    listExams,
    searchPublicSheet,
    performSheetAction,
    logPublicSearch
} = require('../controllers/results.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../constants/system.constants');

const router = express.Router();
const resultUsers = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER];

router.get('/public/exams', asyncHandler(listPublicExams));
router.post('/public/sheets', asyncHandler(searchPublicSheet));
router.post('/public/logs', asyncHandler(logPublicSearch));

router.get('/exams', protect, restrictTo(...resultUsers), asyncHandler(listExams));
router.post('/sheets', protect, restrictTo(...resultUsers), asyncHandler(performSheetAction));

module.exports = router;
