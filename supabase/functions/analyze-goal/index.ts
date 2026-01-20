import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// PYDANTIC-STYLE SCHEMA DEFINITIONS
// ============================================

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

// ============================================
// AGENT TOOL DEFINITIONS (Pydantic AI Style)
// ============================================

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface ToolResult {
  name: string;
  result: unknown;
}

// Define agent tools
const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'analyze_goal_complexity',
    description: 'Analyzes the goal to determine its category and complexity level',
    parameters: {
      goal: { type: 'string', description: 'The goal to analyze', required: true },
      priority: { type: 'string', description: 'Priority level', required: true },
    },
  },
  {
    name: 'generate_action_steps',
    description: 'Generates structured action steps for achieving the goal',
    parameters: {
      goal: { type: 'string', description: 'The goal to plan for', required: true },
      complexity: { type: 'string', description: 'Goal complexity level', required: true },
      timeAvailable: { type: 'string', description: 'Available time', required: false },
    },
  },
  {
    name: 'identify_risks',
    description: 'Identifies potential risks and mitigation strategies',
    parameters: {
      goal: { type: 'string', description: 'The goal', required: true },
      actionSteps: { type: 'array', description: 'The planned steps', required: true },
    },
  },
  {
    name: 'determine_next_action',
    description: 'Determines the immediate next action to take',
    parameters: {
      actionSteps: { type: 'array', description: 'The planned steps', required: true },
      priority: { type: 'string', description: 'Priority level', required: true },
    },
  },
];

// ============================================
// AGENT STATE MANAGEMENT
// ============================================

interface AgentState {
  input: GoalInput;
  currentStep: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  partialResponse: Partial<AgentResponse>;
  retryCount: number;
  maxRetries: number;
}

function createAgentState(input: GoalInput): AgentState {
  return {
    input,
    currentStep: 'initialize',
    toolCalls: [],
    toolResults: [],
    partialResponse: {},
    retryCount: 0,
    maxRetries: 3,
  };
}

// ============================================
// PYDANTIC-STYLE VALIDATORS
// ============================================

class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(`Validation error on '${field}': ${message}`);
    this.name = 'ValidationError';
  }
}

function validateInput(body: unknown): GoalInput {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('body', 'Invalid request body');
  }

  const input = body as Record<string, unknown>;
  
  if (typeof input.goal !== 'string' || input.goal.trim().length === 0) {
    throw new ValidationError('goal', 'Goal is required and must be a non-empty string');
  }

  if (input.goal.length > 1000) {
    throw new ValidationError('goal', 'Goal must be less than 1000 characters');
  }

  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (!validPriorities.includes(input.priority as string)) {
    throw new ValidationError('priority', `Must be one of: ${validPriorities.join(', ')}`);
  }

  if (input.timeAvailable !== undefined && typeof input.timeAvailable !== 'string') {
    throw new ValidationError('timeAvailable', 'Must be a string');
  }

  return {
    goal: input.goal.trim(),
    priority: input.priority as GoalInput['priority'],
    timeAvailable: input.timeAvailable as string | undefined,
  };
}

function validateGoalAnalysis(data: unknown): AgentResponse['goalAnalysis'] {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('goalAnalysis', 'Must be an object');
  }
  
  const analysis = data as Record<string, unknown>;
  
  if (typeof analysis.summary !== 'string' || analysis.summary.length < 10) {
    throw new ValidationError('goalAnalysis.summary', 'Must be a meaningful summary');
  }
  
  if (typeof analysis.category !== 'string' || analysis.category.length === 0) {
    throw new ValidationError('goalAnalysis.category', 'Category is required');
  }
  
  const validComplexities = ['simple', 'moderate', 'complex'];
  if (!validComplexities.includes(analysis.complexity as string)) {
    throw new ValidationError('goalAnalysis.complexity', `Must be one of: ${validComplexities.join(', ')}`);
  }
  
  return {
    summary: analysis.summary,
    category: analysis.category,
    complexity: analysis.complexity as 'simple' | 'moderate' | 'complex',
  };
}

function validateActionStep(step: unknown, index: number): ActionStep {
  if (!step || typeof step !== 'object') {
    throw new ValidationError(`actionSteps[${index}]`, 'Must be an object');
  }
  
  const s = step as Record<string, unknown>;
  
  if (typeof s.stepNumber !== 'number' || s.stepNumber < 1) {
    throw new ValidationError(`actionSteps[${index}].stepNumber`, 'Must be a positive number');
  }
  
  if (typeof s.title !== 'string' || s.title.length === 0) {
    throw new ValidationError(`actionSteps[${index}].title`, 'Title is required');
  }
  
  if (typeof s.description !== 'string' || s.description.length === 0) {
    throw new ValidationError(`actionSteps[${index}].description`, 'Description is required');
  }
  
  if (typeof s.estimatedTime !== 'string') {
    throw new ValidationError(`actionSteps[${index}].estimatedTime`, 'Estimated time is required');
  }
  
  if (!Array.isArray(s.dependencies)) {
    throw new ValidationError(`actionSteps[${index}].dependencies`, 'Dependencies must be an array');
  }
  
  return {
    stepNumber: s.stepNumber,
    title: s.title,
    description: s.description,
    estimatedTime: s.estimatedTime,
    dependencies: s.dependencies as string[],
  };
}

function validateRisk(risk: unknown, index: number): Risk {
  if (!risk || typeof risk !== 'object') {
    throw new ValidationError(`risks[${index}]`, 'Must be an object');
  }
  
  const r = risk as Record<string, unknown>;
  
  if (typeof r.id !== 'string') {
    throw new ValidationError(`risks[${index}].id`, 'ID is required');
  }
  
  if (typeof r.title !== 'string' || r.title.length === 0) {
    throw new ValidationError(`risks[${index}].title`, 'Title is required');
  }
  
  const validSeverities = ['low', 'medium', 'high'];
  if (!validSeverities.includes(r.severity as string)) {
    throw new ValidationError(`risks[${index}].severity`, `Must be one of: ${validSeverities.join(', ')}`);
  }
  
  if (typeof r.mitigation !== 'string' || r.mitigation.length === 0) {
    throw new ValidationError(`risks[${index}].mitigation`, 'Mitigation strategy is required');
  }
  
  return {
    id: r.id,
    title: r.title,
    severity: r.severity as 'low' | 'medium' | 'high',
    mitigation: r.mitigation,
  };
}

function validateNextAction(data: unknown): AgentResponse['nextImmediateAction'] {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('nextImmediateAction', 'Must be an object');
  }
  
  const action = data as Record<string, unknown>;
  
  if (typeof action.action !== 'string' || action.action.length === 0) {
    throw new ValidationError('nextImmediateAction.action', 'Action is required');
  }
  
  if (typeof action.reasoning !== 'string' || action.reasoning.length === 0) {
    throw new ValidationError('nextImmediateAction.reasoning', 'Reasoning is required');
  }
  
  if (typeof action.timeframe !== 'string' || action.timeframe.length === 0) {
    throw new ValidationError('nextImmediateAction.timeframe', 'Timeframe is required');
  }
  
  return {
    action: action.action,
    reasoning: action.reasoning,
    timeframe: action.timeframe,
  };
}

function validateFullResponse(data: unknown): AgentResponse {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('response', 'Invalid response structure');
  }
  
  const response = data as Record<string, unknown>;
  
  const goalAnalysis = validateGoalAnalysis(response.goalAnalysis);
  
  if (!Array.isArray(response.actionSteps) || response.actionSteps.length === 0) {
    throw new ValidationError('actionSteps', 'Must be a non-empty array');
  }
  const actionSteps = response.actionSteps.map((step, i) => validateActionStep(step, i));
  
  if (typeof response.totalEstimatedTime !== 'string') {
    throw new ValidationError('totalEstimatedTime', 'Total estimated time is required');
  }
  
  if (!Array.isArray(response.risks)) {
    throw new ValidationError('risks', 'Must be an array');
  }
  const risks = response.risks.map((risk, i) => validateRisk(risk, i));
  
  const nextImmediateAction = validateNextAction(response.nextImmediateAction);
  
  return {
    goalAnalysis,
    actionSteps,
    totalEstimatedTime: response.totalEstimatedTime,
    risks,
    nextImmediateAction,
  };
}

// ============================================
// AGENT LLM INTERFACE
// ============================================

interface LLMConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

async function callLLM(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string,
  tools?: ToolDefinition[]
): Promise<{ content: string; toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }> }> {
  const requestBody: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  };
  
  // Add tool definitions if provided (OpenAI function calling format)
  if (tools && tools.length > 0) {
    requestBody.tools = tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            Object.entries(tool.parameters).map(([key, value]) => [
              key,
              { type: value.type, description: value.description }
            ])
          ),
          required: Object.entries(tool.parameters)
            .filter(([_, v]) => v.required)
            .map(([k]) => k),
        },
      },
    }));
    requestBody.tool_choice = 'auto';
  }
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error ${response.status}: ${errorText}`);
  }
  
  const data = await response.json();
  const message = data.choices?.[0]?.message;
  
  if (!message) {
    throw new Error('No message in LLM response');
  }
  
  // Check for tool calls
  if (message.tool_calls && message.tool_calls.length > 0) {
    return {
      content: message.content || '',
      toolCalls: message.tool_calls.map((tc: { function: { name: string; arguments: string } }) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      })),
    };
  }
  
  return { content: message.content || '' };
}

// ============================================
// AGENT TOOL EXECUTORS
// ============================================

async function executeAnalyzeComplexity(
  config: LLMConfig,
  goal: string,
  priority: string
): Promise<AgentResponse['goalAnalysis']> {
  console.log('[Agent:Tool] Executing analyze_goal_complexity');
  
  const systemPrompt = `You are an expert goal analyst. Analyze the given goal and provide a structured analysis.
You MUST respond with a valid JSON object matching this exact schema:
{
  "summary": "2-3 sentence analysis of the goal's scope and nature",
  "category": "One of: Learning, Career, Health, Personal Development, Academic, Financial, Creative, Relationship, Fitness, Technical",
  "complexity": "simple" | "moderate" | "complex"
}

Complexity guidelines:
- simple: Can be done in <1 week with minimal dependencies
- moderate: Requires 1-4 weeks with some planning
- complex: Requires >1 month with multiple dependencies

RESPOND ONLY WITH JSON.`;
  
  const userPrompt = `Analyze this goal:
Goal: ${goal}
Priority: ${priority}`;
  
  const response = await callLLM(config, systemPrompt, userPrompt);
  const parsed = parseJSONResponse(response.content);
  return validateGoalAnalysis(parsed);
}

async function executeGenerateSteps(
  config: LLMConfig,
  goal: string,
  complexity: string,
  timeAvailable?: string
): Promise<{ steps: ActionStep[]; totalTime: string }> {
  console.log('[Agent:Tool] Executing generate_action_steps');
  
  const stepCount = complexity === 'simple' ? '3-4' : complexity === 'moderate' ? '4-6' : '5-7';
  
  const systemPrompt = `You are an expert project planner. Break down the goal into actionable steps.
You MUST respond with a valid JSON object matching this exact schema:
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title (max 50 chars)",
      "description": "Detailed description of what to do (50-150 chars)",
      "estimatedTime": "Time estimate like '2 hours', '3 days', '1 week'",
      "dependencies": [] // Array of step titles this depends on
    }
  ],
  "totalTime": "Total estimated time like '2 weeks' or '40 hours'"
}

Generate ${stepCount} steps. Make them specific, actionable, and properly sequenced.
${timeAvailable ? `Consider the user has ${timeAvailable} available.` : ''}

RESPOND ONLY WITH JSON.`;
  
  const userPrompt = `Create action steps for this goal:
Goal: ${goal}
Complexity: ${complexity}`;
  
  const response = await callLLM(config, systemPrompt, userPrompt);
  const parsed = parseJSONResponse(response.content) as Record<string, unknown>;
  
  if (!parsed || !Array.isArray(parsed.steps)) {
    throw new ValidationError('steps', 'Invalid steps structure');
  }
  
  const validatedSteps = (parsed.steps as unknown[]).map((step: unknown, i: number) => validateActionStep(step, i));
  
  return {
    steps: validatedSteps,
    totalTime: typeof parsed.totalTime === 'string' ? parsed.totalTime : 'Varies',
  };
}

async function executeIdentifyRisks(
  config: LLMConfig,
  goal: string,
  actionSteps: ActionStep[]
): Promise<Risk[]> {
  console.log('[Agent:Tool] Executing identify_risks');
  
  const systemPrompt = `You are a risk analyst. Identify potential risks for achieving the goal.
You MUST respond with a valid JSON object matching this exact schema:
{
  "risks": [
    {
      "id": "risk_1",
      "title": "Risk title (max 50 chars)",
      "severity": "low" | "medium" | "high",
      "mitigation": "How to mitigate this risk (50-150 chars)"
    }
  ]
}

Identify 2-4 realistic risks. Consider:
- Time constraints
- Resource limitations
- External dependencies
- Motivation challenges
- Knowledge gaps

RESPOND ONLY WITH JSON.`;
  
  const stepsSummary = actionSteps.map(s => `${s.stepNumber}. ${s.title}`).join('\n');
  const userPrompt = `Identify risks for:
Goal: ${goal}
Planned Steps:
${stepsSummary}`;
  
  const response = await callLLM(config, systemPrompt, userPrompt);
  const parsed = parseJSONResponse(response.content) as Record<string, unknown>;
  
  if (!parsed || !Array.isArray(parsed.risks)) {
    throw new ValidationError('risks', 'Invalid risks structure');
  }
  
  return (parsed.risks as unknown[]).map((risk: unknown, i: number) => validateRisk(risk, i));
}

async function executeDetermineNextAction(
  config: LLMConfig,
  actionSteps: ActionStep[],
  priority: string
): Promise<AgentResponse['nextImmediateAction']> {
  console.log('[Agent:Tool] Executing determine_next_action');
  
  const systemPrompt = `You are a productivity coach. Determine the immediate next action.
You MUST respond with a valid JSON object matching this exact schema:
{
  "action": "The very first thing to do right now (max 100 chars)",
  "reasoning": "Why this should be done first (50-150 chars)",
  "timeframe": "When to do it: 'Today', 'Tomorrow', 'This week', etc."
}

The action must be:
- Achievable within 24-48 hours
- Concrete and specific
- Low friction to start

RESPOND ONLY WITH JSON.`;
  
  const stepsSummary = actionSteps.slice(0, 3).map(s => `${s.stepNumber}. ${s.title}: ${s.description}`).join('\n');
  const userPrompt = `Determine next action for:
Priority: ${priority}
First Steps:
${stepsSummary}`;
  
  const response = await callLLM(config, systemPrompt, userPrompt);
  const parsed = parseJSONResponse(response.content);
  return validateNextAction(parsed);
}

// ============================================
// AGENT ORCHESTRATOR (Pydantic AI Pattern)
// ============================================

class PlanningAgent {
  private config: LLMConfig;
  private state: AgentState;
  
  constructor(config: LLMConfig, input: GoalInput) {
    this.config = config;
    this.state = createAgentState(input);
  }
  
  async run(): Promise<AgentResponse> {
    console.log('[Agent] Starting orchestrated planning flow');
    
    try {
      // Step 1: Analyze goal complexity
      this.state.currentStep = 'analyze_complexity';
      console.log(`[Agent] Step 1/4: ${this.state.currentStep}`);
      
      const goalAnalysis = await this.executeWithRetry(
        () => executeAnalyzeComplexity(
          this.config,
          this.state.input.goal,
          this.state.input.priority
        )
      );
      
      this.state.partialResponse.goalAnalysis = goalAnalysis;
      this.state.toolResults.push({ name: 'analyze_goal_complexity', result: goalAnalysis });
      console.log(`[Agent] Complexity determined: ${goalAnalysis.complexity}`);
      
      // Step 2: Generate action steps
      this.state.currentStep = 'generate_steps';
      console.log(`[Agent] Step 2/4: ${this.state.currentStep}`);
      
      const { steps, totalTime } = await this.executeWithRetry(
        () => executeGenerateSteps(
          this.config,
          this.state.input.goal,
          goalAnalysis.complexity,
          this.state.input.timeAvailable
        )
      );
      
      this.state.partialResponse.actionSteps = steps;
      this.state.partialResponse.totalEstimatedTime = totalTime;
      this.state.toolResults.push({ name: 'generate_action_steps', result: { steps, totalTime } });
      console.log(`[Agent] Generated ${steps.length} steps`);
      
      // Step 3: Identify risks
      this.state.currentStep = 'identify_risks';
      console.log(`[Agent] Step 3/4: ${this.state.currentStep}`);
      
      const risks = await this.executeWithRetry(
        () => executeIdentifyRisks(this.config, this.state.input.goal, steps)
      );
      
      this.state.partialResponse.risks = risks;
      this.state.toolResults.push({ name: 'identify_risks', result: risks });
      console.log(`[Agent] Identified ${risks.length} risks`);
      
      // Step 4: Determine next action
      this.state.currentStep = 'determine_next_action';
      console.log(`[Agent] Step 4/4: ${this.state.currentStep}`);
      
      const nextAction = await this.executeWithRetry(
        () => executeDetermineNextAction(this.config, steps, this.state.input.priority)
      );
      
      this.state.partialResponse.nextImmediateAction = nextAction;
      this.state.toolResults.push({ name: 'determine_next_action', result: nextAction });
      console.log('[Agent] Next action determined');
      
      // Final validation
      this.state.currentStep = 'validate_output';
      const finalResponse = validateFullResponse(this.state.partialResponse);
      
      console.log('[Agent] Planning complete - all validations passed');
      return finalResponse;
      
    } catch (error) {
      console.error(`[Agent] Error in step '${this.state.currentStep}':`, error);
      throw error;
    }
  }
  
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.state.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.log(`[Agent] Retry ${attempt + 1}/${this.state.maxRetries} for ${this.state.currentStep}: ${lastError.message}`);
        
        if (attempt < this.state.maxRetries - 1) {
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function parseJSONResponse(content: string): unknown {
  let cleanContent = content.trim();
  
  // Remove markdown code blocks
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.slice(7);
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.slice(3);
  }
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.slice(0, -3);
  }
  cleanContent = cleanContent.trim();
  
  try {
    return JSON.parse(cleanContent);
  } catch (e) {
    console.error('[Agent] JSON parse error:', cleanContent.substring(0, 200));
    throw new Error('Failed to parse LLM response as JSON');
  }
}

// ============================================
// HTTP HANDLER
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Agent] === New Request ===');
  const startTime = Date.now();
  
  try {
    // Parse and validate input
    const body = await req.json();
    const input = validateInput(body);
    console.log(`[Agent] Input validated - Goal: "${input.goal.substring(0, 50)}...", Priority: ${input.priority}`);

    // Get API key - Lovable AI Gateway (auto-configured)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[Agent] LOVABLE_API_KEY not configured');
      throw new Error('Lovable AI key is not configured');
    }

    // Configure LLM - Using Lovable AI Gateway with Gemini Flash
    const llmConfig: LLMConfig = {
      apiKey: LOVABLE_API_KEY,
      model: 'google/gemini-3-flash-preview',
      temperature: 0.7,
      maxTokens: 1500,
    };

    // Create and run agent
    const agent = new PlanningAgent(llmConfig, input);
    const result = await agent.run();
    
    const duration = Date.now() - startTime;
    console.log(`[Agent] Request completed in ${duration}ms`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorType = error instanceof ValidationError ? 'VALIDATION_ERROR' : 'AGENT_ERROR';
    
    console.error(`[Agent] ${errorType}:`, errorMessage);

    return new Response(
      JSON.stringify({
        code: errorType,
        message: errorMessage,
        field: error instanceof ValidationError ? error.field : undefined,
      }),
      {
        status: error instanceof ValidationError ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
