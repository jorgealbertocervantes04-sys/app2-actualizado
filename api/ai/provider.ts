import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Creación perezosa: las variables de entorno se cargan con dotenv
// después de que se importan los módulos; leerlas al importar las
// dejaría vacías.
let _gw: ReturnType<typeof createOpenAICompatible> | null = null;

export function kimiGw(modelId: string) {
  if (!_gw) {
    _gw = createOpenAICompatible({
      name: "kimi-gw",
      baseURL: process.env.KIMI_AGENTGW_BASE_URL!,
      apiKey: process.env.KIMI_AGENTGW_API_KEY!,
      includeUsage: true,
      supportsStructuredOutputs: true,
    });
  }
  return _gw(modelId);
}
