const express = require('express');
const router = express.Router();
const {
    getStudentMetadata,
    lookupLegacyStudentById,
    registerStudent,
    getAllStudents,
    getStudentById,
    getPublicStudentVerification,
    updateStudent,
    deleteStudent,
    promoteStudentsBulk
} = require('../controllers/student.controller');
const {
    createStudentValidator,
    updateStudentValidator
} = require('../validators/student.validator');
const validateRequest = require('../middlewares/validate.middleware');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/system.constants');

router.get('/public/verify/:studentCode', getPublicStudentVerification);

router.use(protect);

router.get('/metadata', getStudentMetadata);
router.get('/legacy-lookup/:studentCode', lookupLegacyStudentById);

router.post(
    '/promote',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    promoteStudentsBulk
);

router
    .route('/')
    .get(restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), getAllStudents)
    .post(
        restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
        createStudentValidator,
        validateRequest,
        registerStudent
    );

router
    .route('/:id')
    .get(restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), getStudentById)
    .patch(
        restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
        updateStudentValidator,
        validateRequest,
        updateStudent
    )
    .delete(
        restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
        deleteStudent
    );

module.exports = router;
