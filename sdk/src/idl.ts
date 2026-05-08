const IDL = {
  address: "11111111111111111111111111111111",
  metadata: {
    name: "x402_warden",
    version: "0.1.0",
    spec: "0.1.0",
  },
  instructions: [
    {
      name: "add_merchant_to_allowlist",
      discriminator: [249, 235, 158, 184, 193, 165, 76, 239],
      accounts: [
        { name: "owner", writable: true, signer: true, relations: ["agent_account"] },
        {
          name: "agent_account",
          pda: {
            seeds: [
              { kind: "const", value: [97, 103, 101, 110, 116] },
              { kind: "account", path: "owner" },
              { kind: "account", path: "agent_account.agent_id", account: "AgentAccount" },
            ],
          },
        },
        {
          name: "allowlist_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [97, 108, 108, 111, 119, 108, 105, 115, 116] },
              { kind: "account", path: "agent_account" },
              { kind: "account", path: "allowlist_account.page_index", account: "MerchantAllowlistAccount" },
            ],
          },
        },
        {
          name: "policy_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [112, 111, 108, 105, 99, 121] },
              { kind: "account", path: "agent_account" },
            ],
          },
        },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "merchant", type: "pubkey" },
        { name: "category", type: "u8" },
        { name: "max_per_call_override", type: "u64" },
      ],
    },
    {
      name: "auto_refund_dispute",
      discriminator: [47, 227, 162, 3, 87, 148, 222, 15],
      accounts: [
        { name: "caller", signer: true },
        { name: "payment_escrow", writable: true },
        {
          name: "dispute_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [100, 105, 115, 112, 117, 116, 101] },
              { kind: "account", path: "payment_escrow" },
            ],
          },
        },
        {
          name: "escrow_token_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [101, 115, 99, 114, 111, 119, 95, 116, 111, 107, 101, 110] },
              { kind: "account", path: "payment_escrow" },
            ],
          },
        },
        { name: "owner_token_account", writable: true },
        { name: "agent_account", writable: true },
        { name: "token_program", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      ],
      args: [],
    },
    {
      name: "initialize_agent_account",
      discriminator: [129, 81, 19, 253, 119, 74, 252, 254],
      accounts: [
        { name: "owner", writable: true, signer: true },
        {
          name: "agent_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [97, 103, 101, 110, 116] },
              { kind: "account", path: "owner" },
              { kind: "arg", path: "agent_id" },
            ],
          },
        },
        {
          name: "policy_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [112, 111, 108, 105, 99, 121] },
              { kind: "account", path: "agent_account" },
            ],
          },
        },
        { name: "usdc_token_account" },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [{ name: "agent_id", type: "u64" }],
    },
    {
      name: "merchant_accept_dispute",
      discriminator: [52, 2, 88, 205, 102, 132, 158, 82],
      accounts: [
        { name: "merchant", signer: true },
        { name: "payment_escrow", writable: true },
        {
          name: "dispute_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [100, 105, 115, 112, 117, 116, 101] },
              { kind: "account", path: "payment_escrow" },
            ],
          },
        },
        {
          name: "escrow_token_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [101, 115, 99, 114, 111, 119, 95, 116, 111, 107, 101, 110] },
              { kind: "account", path: "payment_escrow" },
            ],
          },
        },
        { name: "owner_token_account", writable: true },
        { name: "agent_account", writable: true },
        { name: "token_program", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      ],
      args: [],
    },
    {
      name: "merchant_contest_dispute",
      discriminator: [129, 245, 204, 85, 182, 255, 7, 3],
      accounts: [
        { name: "merchant", signer: true },
        { name: "payment_escrow" },
        {
          name: "dispute_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [100, 105, 115, 112, 117, 116, 101] },
              { kind: "account", path: "payment_escrow" },
            ],
          },
        },
      ],
      args: [],
    },
    {
      name: "open_dispute",
      discriminator: [137, 25, 99, 119, 23, 223, 161, 42],
      accounts: [
        { name: "opener", writable: true, signer: true },
        { name: "agent_account" },
        { name: "payment_escrow", writable: true },
        {
          name: "dispute_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [100, 105, 115, 112, 117, 116, 101] },
              { kind: "account", path: "payment_escrow" },
            ],
          },
        },
        { name: "owner", relations: ["agent_account"] },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "reason_code", type: "u8" },
        { name: "reason_uri", type: { array: ["u8", 64] } },
      ],
    },
    {
      name: "pause_agent",
      discriminator: [148, 32, 1, 26, 147, 122, 178, 140],
      accounts: [
        { name: "owner", signer: true, relations: ["agent_account"] },
        {
          name: "agent_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [97, 103, 101, 110, 116] },
              { kind: "account", path: "owner" },
              { kind: "account", path: "agent_account.agent_id", account: "AgentAccount" },
            ],
          },
        },
      ],
      args: [],
    },
    {
      name: "process_x402_payment",
      discriminator: [238, 115, 46, 68, 55, 166, 248, 16],
      accounts: [
        { name: "owner", writable: true, signer: true, relations: ["agent_account"] },
        {
          name: "agent_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [97, 103, 101, 110, 116] },
              { kind: "account", path: "owner" },
              { kind: "account", path: "agent_account.agent_id", account: "AgentAccount" },
            ],
          },
        },
        {
          name: "policy_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [112, 111, 108, 105, 99, 121] },
              { kind: "account", path: "agent_account" },
            ],
          },
        },
        {
          name: "payment_escrow",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [112, 97, 121, 109, 101, 110, 116] },
              { kind: "account", path: "agent_account" },
              { kind: "account", path: "agent_account.payment_count", account: "AgentAccount" },
            ],
          },
        },
        { name: "user_token_account", writable: true },
        {
          name: "escrow_token_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [101, 115, 99, 114, 111, 119, 95, 116, 111, 107, 101, 110] },
              { kind: "account", path: "payment_escrow" },
            ],
          },
        },
        { name: "usdc_mint" },
        { name: "token_program", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { name: "system_program", address: "11111111111111111111111111111111" },
        { name: "rent", address: "SysvarRent111111111111111111111111111111111" },
      ],
      args: [
        { name: "amount", type: "u64" },
        { name: "merchant", type: "pubkey" },
        { name: "x402_request_hash", type: { array: ["u8", 32] } },
      ],
    },
    {
      name: "remove_merchant_from_allowlist",
      discriminator: [182, 40, 125, 22, 104, 8, 124, 49],
      accounts: [
        { name: "owner", signer: true, relations: ["agent_account"] },
        {
          name: "agent_account",
          pda: {
            seeds: [
              { kind: "const", value: [97, 103, 101, 110, 116] },
              { kind: "account", path: "owner" },
              { kind: "account", path: "agent_account.agent_id", account: "AgentAccount" },
            ],
          },
        },
        {
          name: "allowlist_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [97, 108, 108, 111, 119, 108, 105, 115, 116] },
              { kind: "account", path: "agent_account" },
              { kind: "account", path: "allowlist_account.page_index", account: "MerchantAllowlistAccount" },
            ],
          },
        },
        {
          name: "policy_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [112, 111, 108, 105, 99, 121] },
              { kind: "account", path: "agent_account" },
            ],
          },
        },
      ],
      args: [{ name: "merchant", type: "pubkey" }],
    },
    {
      name: "set_policy",
      discriminator: [40, 133, 12, 157, 235, 202, 2, 132],
      accounts: [
        { name: "owner", signer: true, relations: ["agent_account"] },
        {
          name: "agent_account",
          pda: {
            seeds: [
              { kind: "const", value: [97, 103, 101, 110, 116] },
              { kind: "account", path: "owner" },
              { kind: "account", path: "agent_account.agent_id", account: "AgentAccount" },
            ],
          },
        },
        {
          name: "policy_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [112, 111, 108, 105, 99, 121] },
              { kind: "account", path: "agent_account" },
            ],
          },
        },
      ],
      args: [{ name: "params", type: { defined: { name: "SetPolicyParams" } } }],
    },
    {
      name: "settle_payment",
      discriminator: [129, 7, 163, 250, 122, 226, 158, 249],
      accounts: [
        { name: "settler", writable: true, signer: true },
        { name: "payment_escrow", writable: true },
        {
          name: "escrow_token_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [101, 115, 99, 114, 111, 119, 95, 116, 111, 107, 101, 110] },
              { kind: "account", path: "payment_escrow" },
            ],
          },
        },
        { name: "merchant_token_account", writable: true },
        { name: "token_program", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      ],
      args: [],
    },
    {
      name: "unpause_agent",
      discriminator: [46, 125, 165, 212, 241, 143, 190, 95],
      accounts: [
        { name: "owner", signer: true, relations: ["agent_account"] },
        {
          name: "agent_account",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [97, 103, 101, 110, 116] },
              { kind: "account", path: "owner" },
              { kind: "account", path: "agent_account.agent_id", account: "AgentAccount" },
            ],
          },
        },
      ],
      args: [],
    },
  ],
  accounts: [
    { name: "AgentAccount", discriminator: [241, 119, 69, 140, 233, 9, 112, 50] },
    { name: "DisputeAccount", discriminator: [237, 70, 91, 63, 81, 74, 45, 43] },
    { name: "MerchantAllowlistAccount", discriminator: [102, 154, 205, 117, 193, 9, 124, 22] },
    { name: "PaymentEscrow", discriminator: [4, 248, 157, 210, 63, 156, 163, 90] },
    { name: "PolicyAccount", discriminator: [218, 201, 183, 164, 156, 127, 81, 175] },
  ],
  events: [
    { name: "AgentCreated", discriminator: [237, 44, 61, 111, 90, 251, 241, 34] },
    { name: "AgentPausedEvent", discriminator: [39, 74, 148, 94, 198, 166, 121, 23] },
    { name: "AgentUnpausedEvent", discriminator: [218, 187, 253, 124, 79, 192, 42, 181] },
    { name: "DisputeOpened", discriminator: [239, 222, 102, 235, 193, 85, 1, 214] },
    { name: "DisputeResolved", discriminator: [121, 64, 249, 153, 139, 128, 236, 187] },
    { name: "MerchantAdded", discriminator: [16, 98, 130, 52, 170, 222, 81, 51] },
    { name: "MerchantRemoved", discriminator: [72, 118, 195, 23, 129, 76, 18, 216] },
    { name: "PaymentInitiated", discriminator: [195, 111, 101, 250, 70, 223, 39, 62] },
    { name: "PaymentSettled", discriminator: [158, 182, 152, 76, 105, 23, 232, 135] },
    { name: "PolicyUpdated", discriminator: [225, 112, 112, 67, 95, 236, 245, 161] },
  ],
  errors: [
    { code: 6000, name: "AgentPaused", msg: "Agent is paused" },
    { code: 6001, name: "ExceedsPerCallLimit", msg: "Amount exceeds per-call limit" },
    { code: 6002, name: "ExceedsPeriodLimit", msg: "Amount exceeds period limit" },
    { code: 6003, name: "ExceedsMerchantLimit", msg: "Amount exceeds merchant-specific limit" },
    { code: 6004, name: "MerchantNotInAllowlist", msg: "Merchant not in allowlist" },
    { code: 6005, name: "InvalidPaymentState", msg: "Invalid payment state for this action" },
    { code: 6006, name: "DisputeWindowOpen", msg: "Dispute window still open" },
    { code: 6007, name: "DisputeWindowExpired", msg: "Dispute window has expired" },
    { code: 6008, name: "Unauthorized", msg: "Unauthorized action" },
    { code: 6009, name: "Overflow", msg: "Arithmetic overflow" },
    { code: 6010, name: "AllowlistPageFull", msg: "Allowlist page is full" },
    { code: 6011, name: "MerchantNotFound", msg: "Merchant not found in allowlist" },
    { code: 6012, name: "DeadlineNotReached", msg: "Merchant response deadline not reached" },
    { code: 6013, name: "DeadlineExpired", msg: "Merchant response deadline expired" },
    { code: 6014, name: "AgentNotPaused", msg: "Agent is not paused" },
    { code: 6015, name: "InvalidDisputeWindow", msg: "Invalid dispute window duration" },
  ],
  types: [
    {
      name: "AgentAccount",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "owner", type: "pubkey" },
          { name: "agent_id", type: "u64" },
          { name: "usdc_token_account", type: "pubkey" },
          { name: "policy_account", type: "pubkey" },
          { name: "total_spent_lifetime", type: "u64" },
          { name: "total_disputed_lifetime", type: "u64" },
          { name: "payment_count", type: "u64" },
          { name: "created_at", type: "i64" },
          { name: "paused", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "AgentCreated",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "owner", type: "pubkey" },
          { name: "agent", type: "pubkey" },
          { name: "agent_id", type: "u64" },
        ],
      },
    },
    {
      name: "AgentPausedEvent",
      type: {
        kind: "struct" as const,
        fields: [{ name: "agent", type: "pubkey" }],
      },
    },
    {
      name: "AgentUnpausedEvent",
      type: {
        kind: "struct" as const,
        fields: [{ name: "agent", type: "pubkey" }],
      },
    },
    {
      name: "DisputeAccount",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "payment", type: "pubkey" },
          { name: "opener", type: "pubkey" },
          { name: "reason_code", type: "u8" },
          { name: "reason_uri", type: { array: ["u8", 64] } },
          { name: "opened_at", type: "i64" },
          { name: "merchant_response_deadline", type: "i64" },
          { name: "state", type: { defined: { name: "DisputeState" } } },
          { name: "resolution", type: "u8" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "DisputeOpened",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "payment", type: "pubkey" },
          { name: "dispute", type: "pubkey" },
          { name: "reason_code", type: "u8" },
        ],
      },
    },
    {
      name: "DisputeResolved",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "dispute", type: "pubkey" },
          { name: "payment", type: "pubkey" },
          { name: "resolution", type: "u8" },
        ],
      },
    },
    {
      name: "DisputeState",
      type: {
        kind: "enum" as const,
        variants: [
          { name: "Open" },
          { name: "MerchantAccepted" },
          { name: "MerchantContested" },
          { name: "AutoRefunded" },
          { name: "Resolved" },
        ],
      },
    },
    {
      name: "MerchantAdded",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "agent", type: "pubkey" },
          { name: "merchant", type: "pubkey" },
          { name: "category", type: "u8" },
        ],
      },
    },
    {
      name: "MerchantAllowlistAccount",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "agent", type: "pubkey" },
          { name: "page_index", type: "u16" },
          { name: "merchants", type: { vec: { defined: { name: "MerchantEntry" } } } },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "MerchantEntry",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "merchant_pubkey", type: "pubkey" },
          { name: "category", type: "u8" },
          { name: "max_per_call_override", type: "u64" },
        ],
      },
    },
    {
      name: "MerchantRemoved",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "agent", type: "pubkey" },
          { name: "merchant", type: "pubkey" },
        ],
      },
    },
    {
      name: "PaymentEscrow",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "agent", type: "pubkey" },
          { name: "payment_id", type: "u64" },
          { name: "merchant", type: "pubkey" },
          { name: "amount", type: "u64" },
          { name: "escrow_token_account", type: "pubkey" },
          { name: "created_at", type: "i64" },
          { name: "settle_after", type: "i64" },
          { name: "state", type: { defined: { name: "PaymentState" } } },
          { name: "x402_request_hash", type: { array: ["u8", 32] } },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "PaymentInitiated",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "agent", type: "pubkey" },
          { name: "payment", type: "pubkey" },
          { name: "merchant", type: "pubkey" },
          { name: "amount", type: "u64" },
          { name: "settle_after", type: "i64" },
        ],
      },
    },
    {
      name: "PaymentSettled",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "payment", type: "pubkey" },
          { name: "merchant", type: "pubkey" },
          { name: "amount", type: "u64" },
        ],
      },
    },
    {
      name: "PaymentState",
      type: {
        kind: "enum" as const,
        variants: [
          { name: "Pending" },
          { name: "Disputed" },
          { name: "Settled" },
          { name: "Refunded" },
        ],
      },
    },
    {
      name: "PolicyAccount",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "agent", type: "pubkey" },
          { name: "max_per_call", type: "u64" },
          { name: "max_per_day", type: "u64" },
          { name: "max_per_period", type: "u64" },
          { name: "period_seconds", type: "u64" },
          { name: "period_start", type: "i64" },
          { name: "spent_in_period", type: "u64" },
          { name: "allowlist_enabled", type: "bool" },
          { name: "allowlist_count", type: "u8" },
          { name: "dispute_window_seconds", type: "u32" },
          { name: "auto_settle_enabled", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "PolicyUpdated",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "agent", type: "pubkey" },
          { name: "max_per_call", type: "u64" },
          { name: "max_per_period", type: "u64" },
          { name: "period_seconds", type: "u64" },
          { name: "dispute_window_seconds", type: "u32" },
        ],
      },
    },
    {
      name: "SetPolicyParams",
      type: {
        kind: "struct" as const,
        fields: [
          { name: "max_per_call", type: "u64" },
          { name: "max_per_period", type: "u64" },
          { name: "period_seconds", type: "u64" },
          { name: "dispute_window_seconds", type: "u32" },
          { name: "allowlist_enabled", type: "bool" },
          { name: "auto_settle_enabled", type: "bool" },
        ],
      },
    },
  ],
} as const;

export default IDL;
