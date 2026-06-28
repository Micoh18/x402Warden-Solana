#!/usr/bin/env node
import { Command } from "commander";
import { payCommand } from "./commands/pay";
import { initCommand } from "./commands/init";
import { policyCommand } from "./commands/policy";
import { statusCommand } from "./commands/status";
import { balanceCommand } from "./commands/balance";
import { spendReportCommand } from "./commands/spend-report";
import { merchantScoreCommand } from "./commands/merchant-score";
import { policyTemplateCommand } from "./commands/policy-template";
import { receiptCommand } from "./commands/receipt";

const program = new Command();

program
  .name("x402warden")
  .description("CLI for AI agents to make x402 payments via x402warden smart accounts")
  .version("0.1.0");

program.addCommand(payCommand);
program.addCommand(receiptCommand);
program.addCommand(initCommand);
program.addCommand(policyCommand);
program.addCommand(policyTemplateCommand);
program.addCommand(statusCommand);
program.addCommand(balanceCommand);
program.addCommand(spendReportCommand);
program.addCommand(merchantScoreCommand);

program.parseAsync(process.argv).catch((err) => {
  console.error(JSON.stringify({ status: "error", error: err.message }));
  process.exit(2);
});
