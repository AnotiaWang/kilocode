import { Assistant, type AssistantConfig } from "@continuedev/sdk";
import chalk from "chalk";
import { CONTINUE_ASCII_ART } from "./asciiArt.js";
import { MCPService } from "./mcp.js";
import { getAllTools } from "./streamChatResponse.js";

export function loadSystemMessage(
  assistant: AssistantConfig
): string | undefined {
  return assistant.rules
    ?.filter((rule) => !!rule)
    .map((rule) => (typeof rule === "string" ? rule : rule?.rule))
    .join("\n");
}

export function introMessage(assistant: Assistant, mcpService: MCPService) {
  const assistantConfig = assistant.config;

  const mcpTools = mcpService.getTools() ?? [];
  const mcpPrompts = mcpService.getPrompts() ?? [];

  console.info(chalk.cyan(CONTINUE_ASCII_ART));

  console.info(`\n${chalk.bold.blue(`Agent: ${assistantConfig.name}\n`)}`);
  console.info(`${chalk.yellow("Model:")} ${assistant.getModel()}\n`);

  console.info(chalk.yellow("Tools:"));
  getAllTools().forEach((tool) => {
    console.info(
      `- ${chalk.green(tool.function.name)}: ${tool.function.description ?? ""}`
    );
  });
  mcpTools.forEach((tool) => {
    console.info(`- ${chalk.green(tool.name)}: ${tool.description}`);
  });
  console.info("");

  console.info(chalk.yellow("Slash commands:"));
  console.info(`- ${chalk.green("/exit")}: Exit the chat`);
  console.info(`- ${chalk.green("/clear")}: Clear the chat history`);
  console.info(`- ${chalk.green("/help")}: Show help message`);
  console.info(`- ${chalk.green("/login")}: Authenticate with your account`);
  console.info(`- ${chalk.green("/logout")}: Sign out of your current session`);
  console.info(
    `- ${chalk.green("/whoami")}: Check who you're currently logged in as`
  );
  for (const prompt of assistantConfig.prompts ?? []) {
    console.info(`- /${prompt?.name}: ${prompt?.description}`);
  }
  for (const prompt of mcpPrompts) {
    console.info(`- /${prompt.name}: ${prompt.description}`);
  }
  console.info("");

  if (assistantConfig.rules?.length) {
    console.info(
      chalk.yellow("\nAssistant rules: " + assistantConfig.rules.length)
    );
  }

  if (assistantConfig.mcpServers?.length) {
    console.info(chalk.yellow("\nMCP Servers:"));
    assistantConfig.mcpServers.forEach((server: any) => {
      console.info(`- ${chalk.cyan(server?.name)}`);
    });
  }
  console.info("");
}
