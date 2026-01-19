// MindForge Agent Types - Strict Pydantic-style validation schemas

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface GoalInput {
  goal: string;
  priority: Priority;
  timeAvailable?: string;
}

export interface ActionStep {
  stepNumber: number;
  title: string;
  description: string;
  estimatedTime: string;
  dependencies: string[];
}

export interface Risk {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface AgentResponse {
  goalAnalysis: {
    summary: string;
    category: string;
    complexity: 'simple' | 'moderate' | 'complex';
  };
  actionSteps: ActionStep[];
  totalEstimatedTime: string;
  risks: Risk[];
  nextImmediateAction: {
    action: string;
    reasoning: string;
    timeframe: string;
  };
}

export interface AgentError {
  code: string;
  message: string;
  details?: string;
}
