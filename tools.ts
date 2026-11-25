const tools = [
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
      required: ["city"],
      additionalProperties: false,
    },
    strict: true,
  },
];