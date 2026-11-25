
import OpenAI from "openai";

// Weather tool
async function get_weather(city: string) {
  return {
    city,
    temperature: 28,
    condition: "Sunny",
  };
}

// Bash tool
async function execute_bash(command: string) {
  const proc = Bun.spawn(["bash", "-c", command], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

// Tool definitions
const tools: OpenAI.Responses.Tool[] = [
  {
    type: "function",
    name: "get_weather",
    description: "Get the current weather for a given city",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city name, e.g. Gurgaon",
        },
      },
      required: ["location"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "execute_bash",
    description: "Executes a bash command on the system",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The bash command to execute",
        },
      },
      required: ["command"],
      additionalProperties: false,
    },
    strict: true,
  },
];

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Store conversation history
let inputs: OpenAI.Responses.ResponseInput = [
  {
    role: "user",
    content: "List all files in my current directory",
  },
];

while (true) {
  const response = await client.responses.create({
    model: "openai/gpt-oss-120b",
    input: inputs,
    tools,
  });

  if (response.status !== "completed") {
    throw new Error(`Response ended as ${response.status}`);
  }

  // Check if the LLM requested a tool
  const toolcalls = response.output.filter(
    (x) => x.type === "function_call"
  );

  // No tool calls means the LLM has finished
  if (toolcalls.length === 0) {
    console.log(response.output_text);
    break;
  }

  // Store the model's response in conversation history
  inputs = [
    ...inputs,
    ...(response.output as OpenAI.Responses.ResponseInput),
  ];

  // Execute requested tools
  for (const toolcall of toolcalls) {
    const args = JSON.parse(toolcall.arguments);

    let result;

    if (toolcall.name === "get_weather") {
      result = await get_weather(args.location);
    } 
    else if (toolcall.name === "execute_bash") {
      result = await execute_bash(args.command);
    } 
    else {
      throw new Error(`Unknown tool: ${toolcall.name}`);
    }

    // Send tool result back to the LLM
    inputs.push({
      type: "function_call_output",
      call_id: toolcall.call_id,
      output: JSON.stringify(result),
    });
  }
}
