const express = require('express');
const { getOpenJobs, getActivePlacements } = require('../lib/bullhorn');

const router = express.Router();

// GET /api/stats — Summary counts for the stats strip
router.get('/', async (req, res, next) => {
  try {
    const [jobsResult, placementsResult] = await Promise.all([
      getOpenJobs(),
      getActivePlacements(),
    ]);

    const jobs = jobsResult?.data || [];
    const placements = placementsResult?.data || [];

    const statusCount = (status) =>
      jobs.filter(j => {
        const s = Array.isArray(j.status) ? j.status[0] : j.status;
        return s === status;
      }).length;

    res.json({
      openReqs: jobs.length,
      activeContractors: placements.length,
      offersOut: statusCount('Offer Out'),
      covered: statusCount('Covered'),
      acceptingCandidates: statusCount('Accepting Candidates'),
      placed: statusCount('Placed'),
      filled: statusCount('Filled'),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
