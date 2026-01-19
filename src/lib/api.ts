import { supabase } from "@/integrations/supabase/client";
import type { GoalInput, AgentResponse, AgentError } from "@/types/agent";

export async function analyzeGoal(input: GoalInput): Promise<AgentResponse> {
  const { data, error } = await supabase.functions.invoke<AgentResponse>('analyze-goal', {
    body: input,
  });

  if (error) {
    const agentError: AgentError = {
      code: 'FUNCTION_ERROR',
      message: error.message || 'Failed to analyze goal',
      details: JSON.stringify(error),
    };
    throw agentError;
  }

  if (!data) {
    const agentError: AgentError = {
      code: 'NO_RESPONSE',
      message: 'No response received from the agent',
    };
    throw agentError;
  }

  return data;
}
