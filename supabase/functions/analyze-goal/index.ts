import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pydantic-style type definitions for strict validation
interface GoalInput {
  goal: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeAvailable?: string;
}

interface ActionStep {
  stepNumber: number;
  title: string;
  description: string;
  estimatedTime: string;
  dependencies: string[];
}

interface Risk {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

interface AgentResponse {
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

// Input validation (Pydantic-style)
function validateInput(body: unknown): GoalInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const input = body as Record<string, unknown>;
  
  if (typeof input.goal !== 'string' || input.goal.trim().length === 0) {
    throw new Error('Goal is required and must be a non-empty string');
  }

  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (!validPriorities.includes(input.priority as string)) {
    throw new Error(`Priority must be one of: ${validPriorities.join(', ')}`);
  }

  if (input.timeAvailable !== undefined && typeof input.timeAvailable !== 'string') {
    throw new Error('Time available must be a string');
  }

  return {
    goal: input.goal as string,
    priority: input.priority as GoalInput['priority'],
    timeAvailable: input.timeAvailable as string | undefined,
  };
}

// Output validation (Pydantic-style)
function validateOutput(data: unknown): AgentResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid agent response');
  }

  const response = data as Record<string, unknown>;

  // Validate goalAnalysis
  if (!response.goalAnalysis || typeof response.goalAnalysis !== 'object') {
    throw new Error('Missing goalAnalysis in response');
  }

  // Validate actionSteps
  if (!Array.isArray(response.actionSteps)) {
    throw new Error('actionSteps must be an array');
  }

  // Validate risks
  if (!Array.isArray(response.risks)) {
    throw new Error('risks must be an array');
  }

  // Validate nextImmediateAction
  if (!response.nextImmediateAction || typeof response.nextImmediateAction !== 'object') {
    throw new Error('Missing nextImmediateAction in response');
  }

  return response as unknown as AgentResponse;
}

// Retry logic with exponential backoff
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Agent] Attempt ${attempt + 1}/${maxRetries}`);
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // Handle rate limits with longer backoff
      if (response.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt) * 2;
        console.log(`[Agent] Rate limited, waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Don't retry client errors (except rate limits)
      if (response.status >= 400 && response.status < 500) {
        const text = await response.text();
        throw new Error(`API error ${response.status}: ${text}`);
      }
      
      // Retry server errors
      if (response.status >= 500) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[Agent] Server error ${response.status}, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[Agent] Error: ${lastError.message}, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Agent] Starting goal analysis');
  
  try {
    // Parse and validate input
    const body = await req.json();
    const input = validateInput(body);
    console.log(`[Agent] Input validated - Goal: "${input.goal.substring(0, 50)}...", Priority: ${input.priority}`);

    // Get API key
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      console.error('[Agent] OPENROUTER_API_KEY not configured');
      throw new Error('OpenRouter API key is not configured');
    }

    // Build the prompt
    const systemPrompt = `You are MindForge, an expert AI planning agent specialized in breaking down personal and academic goals into actionable plans.

Your task is to analyze the user's goal and provide a structured response. You must respond with a valid JSON object that matches this exact schema:

{
  "goalAnalysis": {
    "summary": "A 2-3 sentence analysis of the goal",
    "category": "Category like 'Learning', 'Career', 'Health', 'Personal Development', 'Academic', etc.",
    "complexity": "simple" | "moderate" | "complex"
  },
  "actionSteps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "description": "Detailed description of what to do",
      "estimatedTime": "Time estimate like '2 hours' or '1 week'",
      "dependencies": ["Step titles this depends on, or empty array"]
    }
  ],
  "totalEstimatedTime": "Total time like '3 months' or '40 hours'",
  "risks": [
    {
      "id": "risk_1",
      "title": "Risk title",
      "severity": "low" | "medium" | "high",
      "mitigation": "How to mitigate this risk"
    }
  ],
  "nextImmediateAction": {
    "action": "The very first thing to do right now",
    "reasoning": "Why this should be done first",
    "timeframe": "When to do it, like 'Today' or 'This week'"
  }
}

Guidelines:
- Provide 4-7 actionable steps
- Be specific and practical
- Consider the user's stated priority level
- If time availability is provided, factor it into estimates
- Identify 2-4 realistic risks
- The immediate action should be achievable within 24-48 hours

IMPORTANT: Respond ONLY with the JSON object, no additional text or markdown.`;

    const userPrompt = `Analyze this goal and create an action plan:

Goal: ${input.goal}
Priority Level: ${input.priority}
${input.timeAvailable ? `Time Available: ${input.timeAvailable}` : 'Time Available: Not specified'}

Provide a comprehensive, structured plan as JSON.`;

    console.log('[Agent] Calling OpenRouter API');
    
    // Call OpenRouter with retry logic
    const response = await fetchWithRetry(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://mindforge.lovable.app',
          'X-Title': 'MindForge Planning Agent',
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      },
      3, // maxRetries
      1000 // baseDelay
    );

    const data = await response.json();
    console.log('[Agent] Response received from OpenRouter');

    // Extract content from response
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[Agent] No content in response:', JSON.stringify(data));
      throw new Error('No content in AI response');
    }

    // Parse the JSON response
    let parsedResponse: unknown;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      parsedResponse = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('[Agent] Failed to parse JSON response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate output against schema
    const validatedOutput = validateOutput(parsedResponse);
    console.log('[Agent] Output validated successfully');

    return new Response(JSON.stringify(validatedOutput), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Agent] Error:', errorMessage);

    return new Response(
      JSON.stringify({
        code: 'AGENT_ERROR',
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
