import { z } from "zod"

const ConfigSchema = z.object({
  opencode: z.object({
    baseUrl: z.string().default("http://localhost:4096"),
    apiKey: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }),
  server: z.object({
    port: z.number().default(4097),
    hostname: z.string().default("0.0.0.0"),
  }),
  fileStorage: z.object({
    directory: z.string().default("./.flow-state"),
  }),
})

export type Config = z.infer<typeof ConfigSchema>

export async function loadConfig(): Promise<Config> {
  const config = {
    opencode: {
      baseUrl: process.env.OPENCODE_BASE_URL || "http://localhost:4096",
      apiKey: process.env.OPENCODE_API_KEY,
      username: process.env.OPENCODE_SERVER_USERNAME,
      password: process.env.OPENCODE_SERVER_PASSWORD,
    },
    server: {
      port: parseInt(process.env.PORT || "4097"),
      hostname: "0.0.0.0",
    },
    fileStorage: {
      directory: process.env.FLOW_STATE_DIR || "./.flow-state",
    },
  }

  const result = ConfigSchema.safeParse(config)
  if (!result.success) {
    console.warn("Config validation warning:", result.error.message)
  }

  return result.data || config
}
