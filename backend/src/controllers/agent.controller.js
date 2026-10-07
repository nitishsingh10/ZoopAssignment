const agentModel = require('../models/agent');

// ─── GET ALL AGENTS ──────────────────────────────────────────────────────────
async function getAgents(req, res) {
  try {
    const { status, service_area, page, limit } = req.query;
    const result = await agentModel.getAllAgents({ status, service_area, page, limit });

    return res.status(200).json({
      success: true,
      fromCache: result.fromCache || false,
      ...result,
    });
  } catch (err) {
    console.error('getAgents error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── GET AGENT BY ID ─────────────────────────────────────────────────────────
async function getAgentById(req, res) {
  try {
    const { id } = req.params;
    const result = await agentModel.getAgentById(id);

    if (!result) {
      return res.status(404).json({ success: false, message: `Agent with ID ${id} not found` });
    }

    return res.status(200).json({
      success: true,
      fromCache: result.fromCache,
      agent: result.agent,
    });
  } catch (err) {
    console.error('getAgentById error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── CREATE AGENT ─────────────────────────────────────────────────────────────
async function createAgent(req, res) {
  try {
    const agent = await agentModel.createAgent(req.body);
    return res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      agent,
    });
  } catch (err) {
    if (err.code === '23505') {
      // Unique constraint violation
      const field = err.constraint?.includes('email') ? 'email' : 'phone';
      return res.status(409).json({
        success: false,
        message: `An agent with this ${field} already exists`,
      });
    }
    console.error('createAgent error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── UPDATE AGENT ─────────────────────────────────────────────────────────────
async function updateAgent(req, res) {
  try {
    const { id } = req.params;
    const agent = await agentModel.updateAgent(id, req.body);

    if (!agent) {
      return res.status(404).json({ success: false, message: `Agent with ID ${id} not found` });
    }

    return res.status(200).json({
      success: true,
      message: 'Agent updated successfully',
      agent,
    });
  } catch (err) {
    if (err.code === '23505') {
      const field = err.constraint?.includes('email') ? 'email' : 'phone';
      return res.status(409).json({
        success: false,
        message: `An agent with this ${field} already exists`,
      });
    }
    console.error('updateAgent error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── DELETE AGENT ─────────────────────────────────────────────────────────────
async function deleteAgent(req, res) {
  try {
    const { id } = req.params;
    const agent = await agentModel.deleteAgent(id);

    if (!agent) {
      return res.status(404).json({ success: false, message: `Agent with ID ${id} not found` });
    }

    return res.status(200).json({
      success: true,
      message: 'Agent deleted successfully',
      agent,
    });
  } catch (err) {
    console.error('deleteAgent error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── GET STATS ────────────────────────────────────────────────────────────────
async function getStats(req, res) {
  try {
    const stats = await agentModel.getStats();
    return res.status(200).json({
      success: true,
      fromCache: stats.fromCache || false,
      stats,
    });
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

module.exports = {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getStats,
};
