const express = require('express');
const router = express.Router();
const { setupInitialSuperAdmin, login, logout, getMe, changePassword } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const validateRequest = require('../middlewares/validate.middleware');
const { createTeacherValidator } = require('../validators/teacher.validator');
const { loginValidationRules, changePasswordValidationRules } = require('../validators/auth.validator');

router.post('/setup-super-admin', createTeacherValidator, validateRequest, setupInitialSuperAdmin);
router.post('/login', loginValidationRules, validateRequest, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePasswordValidationRules, validateRequest, changePassword);

module.exports = router;
