// ---------------------------------------------------------------------------
// Wspólne JSON schematy dla response_format w OpenAI API
// ---------------------------------------------------------------------------

// Confidence zawsze obecne — "high" zostaje z tanim modelem, "low, "medium" idzie do drogiego
export const TICKET_CLASSIFICATION_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "ticket_classification",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        tickets: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              ticket_id: { type: "string" },
              product_category: { type: "string" },
              priority: {
                type: "string",
                enum: ["low", "medium", "high", "critical"],
              },
              sentiment: {
                type: "string",
                enum: ["positive", "neutral", "negative"],
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"],
              },
            },
            required: [
              "ticket_id",
              "product_category",
              "priority",
              "sentiment",
              "confidence",
            ],
          },
        },
      },
      required: ["tickets"],
    },
  },
};
