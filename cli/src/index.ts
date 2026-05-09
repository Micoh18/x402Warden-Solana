#!/usr/bin/env node
import { Command } from "commander";
import { payCommand } from "./commands/pay";
import { initCommand } from "./commands/init";
import { policyCommand } from "./commands/policy";
import { statusCommand } from "./commands/status";
import { balanceCommand } from "./commands/balance";

const program = new Command();

program
  .name("x402warden")
  .description("CLI for AI agents to make x402 payments via x402warden smart accounts")
  .version("0.1.0");

program.addCommand(payCommand);
program.addCommand(initCommand);
program.addCommand(policyCommand);
program.addCommand(statusCommand);
program.addCommand(balanceCommand);

program.parseAsync(process.argv).catch((err) => {
  console.error(JSON.stringify({ status: "error", error: err.message }));
  process.exit(2);
});
