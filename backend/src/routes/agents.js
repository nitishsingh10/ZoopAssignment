const { Router } = require('express');
const agentController = require('../controllers/agent.controller');
const {
  createAgentRules,
  updateAgentRules,
  agentIdRule,
  listQueryRules,
} = require('../middleware/validate');

const router = Router();

/**
 * @route   GET /api/agents/stats
 * @desc    Get aggregate stats for dashboard
 * @access  Public
 */
router.get('/stats', agentController.getStats);

/**
 * @route   GET /api/agents
 * @desc    Get all agents (with optional filtering & pagination)
 * @query   status, service_area, page, limit
 * @access  Public
 */
router.get('/', listQueryRules, agentController.getAgents);

/**
 * @route   GET /api/agents/:id
 * @desc    Get a single agent by ID
 * @access  Public
 */
router.get('/:id', agentIdRule, agentController.getAgentById);

/**
 * @route   POST /api/agents
 * @desc    Create a new delivery agent
 * @access  Public
 */
router.post('/', createAgentRules, agentController.createAgent);

/**
 * @route   PATCH /api/agents/:id
 * @desc    Update an existing agent
 * @access  Public
 */
router.patch('/:id', updateAgentRules, agentController.updateAgent);

/**
 * @route   DELETE /api/agents/:id
 * @desc    Delete an agent
 * @access  Public
 */
router.delete('/:id', agentIdRule, agentController.deleteAgent);

module.exports = router;
