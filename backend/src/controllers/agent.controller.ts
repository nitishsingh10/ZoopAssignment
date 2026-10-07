import type { Request, Response } from 'express';
import * as agentModel from '../models/agent';
import type { AgentCreateInput, AgentUpdateInput } from '../types/agent';

// ─── GET ALL AGENTS ──────────────────────────────────────────────────────────
export async function getAgents(req: Request, res: Response): Promise<void> {
  try {
    const { status, service_area, page, limit } = req.query as Record<string, string | undefined>;
    const result = await agentModel.getAllAgents({ status, service_area, page, limit });

    res.status(200).json({
      success: true,
      fromCache: result.fromCache ?? false,
      agents: result.agents,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error('getAgents error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── GET AGENT BY ID ─────────────────────────────────────────────────────────
export async function getAgentById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const result = await agentModel.getAgentById(id);

    if (!result) {
      res.status(404).json({ success: false, message: `Agent with ID ${id} not found` });
      return;
    }

    res.status(200).json({
      success: true,
      fromCache: result.fromCache,
      agent: result.agent,
    });
  } catch (err) {
    console.error('getAgentById error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── CREATE AGENT ─────────────────────────────────────────────────────────────
export async function createAgent(req: Request, res: Response): Promise<void> {
  try {
    const agent = await agentModel.createAgent(req.body as AgentCreateInput);
    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      agent,
    });
  } catch (err) {
    const pgErr = err as NodeJS.ErrnoException & { code?: string; constraint?: string };
    if (pgErr.code === '23505') {
      const field = pgErr.constraint?.includes('email') ? 'email' : 'phone';
      res.status(409).json({
        success: false,
        message: `An agent with this ${field} already exists`,
      });
      return;
    }
    console.error('createAgent error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── UPDATE AGENT ─────────────────────────────────────────────────────────────
export async function updateAgent(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const agent = await agentModel.updateAgent(id, req.body as AgentUpdateInput);

    if (!agent) {
      res.status(404).json({ success: false, message: `Agent with ID ${id} not found` });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Agent updated successfully',
      agent,
    });
  } catch (err) {
    const pgErr = err as NodeJS.ErrnoException & { code?: string; constraint?: string };
    if (pgErr.code === '23505') {
      const field = pgErr.constraint?.includes('email') ? 'email' : 'phone';
      res.status(409).json({
        success: false,
        message: `An agent with this ${field} already exists`,
      });
      return;
    }
    console.error('updateAgent error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── DELETE AGENT ─────────────────────────────────────────────────────────────
export async function deleteAgent(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const agent = await agentModel.deleteAgent(id);

    if (!agent) {
      res.status(404).json({ success: false, message: `Agent with ID ${id} not found` });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Agent deleted successfully',
      agent,
    });
  } catch (err) {
    console.error('deleteAgent error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── GET STATS ────────────────────────────────────────────────────────────────
export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await agentModel.getStats();
    res.status(200).json({
      success: true,
      fromCache: stats.fromCache ?? false,
      stats,
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
