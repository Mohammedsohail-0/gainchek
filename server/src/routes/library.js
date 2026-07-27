const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const MUSCLE_GROUPS = require('../constants/muscleGroups');
const EXERCISES_BY_MUSCLE_GROUP = require('../constants/exercises');

const router = express.Router();

router.use(authenticateToken);

/** GET /library/muscle-groups */
router.get('/muscle-groups', (req, res) => {
  res.json(MUSCLE_GROUPS);
});

/**
 * GET /library/exercises
 * Query params: ?muscleGroup=Chest&q=press
 */
router.get('/exercises', (req, res) => {
  const { muscleGroup, q } = req.query;

  let pool = muscleGroup
    ? (EXERCISES_BY_MUSCLE_GROUP[muscleGroup] || [])
    : Object.values(EXERCISES_BY_MUSCLE_GROUP).flat();

  if (q) {
    const needle = q.toLowerCase();
    pool = pool.filter(name => name.toLowerCase().includes(needle));
  }

  res.json(pool);
});

module.exports = router;
