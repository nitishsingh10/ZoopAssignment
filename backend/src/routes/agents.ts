import { Router } from 'express';
import * as agentController from '../controllers/agent.controller';
import {
  createAgentRules,
  updateAgentRules,
  agentIdRule,
  listQueryRules,
} from '../middleware/validate';

const router = Router();

/**
 * @route   GET /api/agents/stats
 * @desc    Aggregate stats for the dashboard
 */
router.get('/stats', agentController.getStats);

/**
 * @route   GET /api/agents
 * @desc    List agents — supports ?status, ?service_area, ?page, ?limit
 */
router.get('/', listQueryRules, agentController.getAgents);

/**
 * @route   GET /api/agents/:id
 * @desc    Get a single agent by UUID
 */
router.get('/:id', agentIdRule, agentController.getAgentById);

/**
 * @route   POST /api/agents
 * @desc    Create a new delivery agent
 */
router.post('/', createAgentRules, agentController.createAgent);

/**
 * @route   PATCH /api/agents/:id
 * @desc    Partially update an existing agent
 */
router.patch('/:id', updateAgentRules, agentController.updateAgent);

/**
 * @route   DELETE /api/agents/:id
 * @desc    Permanently delete an agent
 */
router.delete('/:id', agentIdRule, agentController.deleteAgent);

export default router;
