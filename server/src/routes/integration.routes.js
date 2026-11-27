const express = require('express');
const {
    getIntegrationTeachers,
    getIntegrationTeacher,
    getIntegrationStudents,
    getIntegrationStudent
} = require('../controllers/integration.controller');
const {
    integrationAuth,
    requireIntegrationScope
} = require('../middlewares/integrationAuth.middleware');

const router = express.Router();

router.use(integrationAuth);
router.get('/teachers', requireIntegrationScope('teachers:read'), getIntegrationTeachers);
router.get('/teachers/:id', requireIntegrationScope('teachers:read'), getIntegrationTeacher);
router.get('/students', requireIntegrationScope('students:read'), getIntegrationStudents);
router.get('/students/:id', requireIntegrationScope('students:read'), getIntegrationStudent);

module.exports = router;
