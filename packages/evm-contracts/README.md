## Overview

---

## Deployed Addresses

### Avalanche Fuji (chain ID 43113)

| Contract     | Proxy                                                                                                                                               | Implementation                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| GameRegistry | [`0x4e590B45fB999d93e981af65eB6A4eC06652A04D`](https://testnet.snowtrace.io/address/0x4e590B45fB999d93e981af65eB6A4eC06652A04D/contract/43113/code) | [`0xF6ea80fA07C4FE3A45399A4b1d81ceF6Cc81D9B8`](https://testnet.snowtrace.io/address/0xF6ea80fA07C4FE3A45399A4b1d81ceF6Cc81D9B8/contract/43113/code) |
| GameMarket   | [`0x8865d8738E37671138D5270A7B4befeE83DeE904`](https://testnet.snowtrace.io/address/0x8865d8738E37671138D5270A7B4befeE83DeE904/contract/43113/code) | [`0xD6Acb26f17F3C8c87C32cD781C97c86071562672`](https://testnet.snowtrace.io/address/0xD6Acb26f17F3C8c87C32cD781C97c86071562672/contract/43113/code) |
| WBCoin       | [`0x5D7Ea21B4FBfF8e607fedb76ed0681ae5CfA814f`](https://testnet.snowtrace.io/address/0x5D7Ea21B4FBfF8e607fedb76ed0681ae5CfA814f/contract/43113/code) | [`0x02f2Ce71317AF30A1B6a98481ab0feb59fcdB0bf`](https://testnet.snowtrace.io/address/0x02f2Ce71317AF30A1B6a98481ab0feb59fcdB0bf/contract/43113/code) |
| WBResources  | [`0xee52Ce7D2c46F8B728D74a030efCB78885F90E25`](https://testnet.snowtrace.io/address/0xee52Ce7D2c46F8B728D74a030efCB78885F90E25/contract/43113/code) | [`0xfBA871cFfc473fbcAC883663a38d5FdAa4586D5E`](https://testnet.snowtrace.io/address/0xfBA871cFfc473fbcAC883663a38d5FdAa4586D5E/contract/43113/code) |
| WBCharacters | [`0x55e1cCD651A3e3e0EfC6b61e8c94878cbe87F64B`](https://testnet.snowtrace.io/address/0x55e1cCD651A3e3e0EfC6b61e8c94878cbe87F64B/contract/43113/code) | [`0x0a9054161D69de45d2016720cE663417e7627598`](https://testnet.snowtrace.io/address/0x0a9054161D69de45d2016720cE663417e7627598/contract/43113/code) |
| WBItems      | [`0x6fC43f3cf1B27199F52F160f05645b1541292484`](https://testnet.snowtrace.io/address/0x6fC43f3cf1B27199F52F160f05645b1541292484/contract/43113/code) | [`0x4B4b53E9FB8B2928D3aE423d91F6c8fd7aa322A6`](https://testnet.snowtrace.io/address/0x4B4b53E9FB8B2928D3aE423d91F6c8fd7aa322A6/contract/43113/code) |

Explorer: https://testnet.snowtrace.io (routescan)

### Anvil (local, chain ID 31337)

Default addresses when deploying with `make deployAll-anvil` (deterministic, sender `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`):

| Contract     | Proxy                                        | Implementation                               |
| ------------ | -------------------------------------------- | -------------------------------------------- |
| GameRegistry | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| GameMarket   | `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e` | `0x610178dA211FEF7D417bC0e6FeD39F05609AD788` |
| WBCoin       | `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853` | `0x0165878A594ca255338adfa4d48449f69242Eb8F` |
| WBResources  | `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |
| WBCharacters | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| WBItems      | `0x8A791620dd6260079BF849Dc5567aDC3F2FdC318` | `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6` |

---

## Development

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, `anvil`)
- `.env` file with required variables (see `.env.example`)

Required `.env` variables:

```
AVALANCHE_FUJI_RPC_URL=
SEPOLIA_RPC_URL=
ETHERSCAN_API_KEY=
ANVIL_RPC_URL=http://127.0.0.1:8545
```

### Install dependencies

```bash
make install
# or
forge install @openzeppelin/openzeppelin-contracts && \
forge install @openzeppelin/openzeppelin-contracts-upgradeable && \
forge install foundry-rs/forge-std
```

### Testing

Run the full test suite (unit + integration):

```bash
make test
# or
forge test
```

Run with verbosity and gas report:

```bash
forge test -vvvv --gas-report
```

Run a specific test file:

```bash
forge test --match-path test/unit/GameRegistry.t.sol -vvvv
forge test --match-path test/integration/GameRegistryInt.t.sol -vvvv
forge test --match-path test/unit/GameMarket.t.sol -vvvv
forge test --match-path test/integration/GameMarketInt.t.sol -vvvv
```

Run a specific test by name:

```bash
forge test --match-test testFunctionName -vvvv
```

Generate coverage report:

```bash
forge coverage --report lcov
```

**Test layout:**

| File                                     | Type        | Coverage                |
| ---------------------------------------- | ----------- | ----------------------- |
| `test/unit/GameRegistry.t.sol`           | Unit        | GameRegistry            |
| `test/unit/GameMarket.t.sol`             | Unit        | GameMarket              |
| `test/unit/WBCharacter.t.sol`            | Unit        | WBCharacters            |
| `test/unit/WBItems.sol`                  | Unit        | WBItems                 |
| `test/unit/WBRresources.t.sol`           | Unit        | WBResources             |
| `test/unit/WebCoin.t.sol`                | Unit        | WBCoin                  |
| `test/unit/DeployAll.t.sol`              | Unit        | Deployment script       |
| `test/integration/GameRegistryInt.t.sol` | Integration | GameRegistry end-to-end |
| `test/integration/GameMarketInt.t.sol`   | Integration | GameMarket end-to-end   |

### Deployment

**Deploy all contracts to Fuji:**

```bash
make deployAll-fuji
```

Uses `--account devKey` keystore. Deploys and verifies all contracts via routescan.

**Deploy all contracts to local Anvil:**

```bash
anvil  # start local node in a separate terminal
make deployAll-anvil
```

**Add game elements (Fuji):**

```bash
make add-fuji-elements
```

**Add game elements (Anvil):**

```bash
make add-anvil-elements
```

### Verification (Fuji)

Check deployed state with `make test-fuji`:

```bash
make test-fuji
```

This runs a series of `cast call` checks:

- GameMarket has GameRegistry set
- Admin role is granted to the deployer on all contracts
- GameRegistry holds `MINTER_ROLE` on all token contracts
- GameSigner holds `MINTER_ROLE` and `GAME_SIGNER_ROLE`

Check deployed state on Anvil:

```bash
make test-anvil
```

### Order flow testing (Fuji)

```bash
make test-fuji-createOrder   # creates a test order (account: devDev)
make test-fuji-fillOrder     # fills the test order (account: devKey)
```

---

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          OFF-CHAIN                                  │
│                                                                     │
│   ┌──────────────┐      EIP-712 sign       ┌──────────────────┐     │
│   │    Player    │ ──── CommitStruct ────► │   Game Server    │     │
│   └──────┬───────┘                         │ (GAME_SIGNER_ROLE)│    │
│          │  signed commit                  └──────────────────┘     │
└──────────│──────────────────────────────────────────────────────────┘
           │
           ▼  ON-CHAIN
┌──────────────────────────────────────────────────────────────────────┐
│                        GameRegistry (UUPS)                           │
│                                                                      │
│  commitSingle / commitBatch                                          │
│    1. validate inputs (resourceHash, commit, signature)              │
│    2. check nonce not used (replay protection)                       │
│    3. verify EIP-712 signature → signer has GAME_SIGNER_ROLE         │
│    4. verify target == registered token address                      │
│    5. mark nonce used                                                │
│    6. _commitDispatcher → target.call(callData)                      │
│                                                                      │
│  Registry (GAME_SIGNER_ROLE managed):                                │
│    addGameElement / removeGameElement                                │
│    s_gameElementsByType[type]  →  string[] names                     │
│    s_resourceHashToGameElement →  GameElementStruct                  │
│      { tokenAddress, tokenId, requiresTokenId }                      │
└───────────┬──────────────────────────────────────────────────────────┘
            │ .call(callData)   (mint / burn / transfer)
            ▼
┌───────────────────────────────────────────────────────┐
│               Token Contracts (UUPS)                  │
│                                                       │
│  WBCoin        ERC20      MINTER_ROLE: mint / burn    │
│  WBResources   ERC1155    MINTER_ROLE: mint / burn    │
│  WBCharacters  ERC721     MINTER_ROLE: mint / burn    │
│  WBItems       ERC721     MINTER_ROLE: mint / burn    │
│                                                       │
│  GameRegistry must hold MINTER_ROLE on each token     │
└───────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        GameMarket (UUPS)                            │
│                                                                     │
│  createOrder ──► Order { maker, token, tokenId, price, status }     │
│  fillOrder   ──► pay ETH or ERC20 → transfer ERC721 / ERC1155       │
│  cancelOrder / pauseOrder / unpauseOrder  (maker only)              │
│                                                                     │
│  references GameRegistry for asset lookups                          │
│  (getGameElementName / getGameElementHash / getGameElementsList)    │
└─────────────────────────────────────────────────────────────────────┘
```

### Roles summary

| Role                 | Contract                                   | Permissions                                             |
| -------------------- | ------------------------------------------ | ------------------------------------------------------- |
| `DEFAULT_ADMIN_ROLE` | GameRegistry, GameMarket                   | Upgrade contract, manage roles (1-day delay)            |
| `GAME_SIGNER_ROLE`   | GameRegistry                               | Sign commits, add/remove game elements                  |
| `MARKET_ROLE`        | GameRegistry                               | Reserved; accounts with this role cannot submit commits |
| `MINTER_ROLE`        | WBCoin, WBResources, WBCharacters, WBItems | Mint and burn tokens                                    |
| `PAUSER_ROLE`        | WBCoin, WBResources, WBCharacters, WBItems | Pause/unpause transfers                                 |
| `UPGRADER_ROLE`      | WBCoin, WBResources, WBCharacters, WBItems | Authorize UUPS upgrades                                 |

### Commit flow (detailed)

```
Player                  GameRegistry                Token Contract
  │                          │                            │
  │── commitSingle(          │                            │
  │     resourceHash,        │                            │
  │     commit,              │                            │
  │     signature) ─────────►│                            │
  │                          │ _verifyInputs()            │
  │                          │  · decode commit           │
  │                          │    (nonce,target,callData) │
  │                          │  · check nonce unused      │
  │                          │  · check account==sender   │
  │                          │  · check target==registry  │
  │                          │  · verify EIP-712 sig      │
  │                          │  · signer has SIGNER_ROLE  │
  │                          │                            │
  │                          │ mark nonce used            │
  │                          │                            │
  │                          │── target.call(callData) ─► │
  │                          │                            │ mint/burn/transfer
  │                          │◄───────────────────────────│
  │                          │ _verifyAfter() [hook]      │
  │◄─────────────────────────│                            │
```

---

## GameRegistry.sol

### External functions

- **`initialize(string[] _coins, string[] _resources, string[] _characters, string[] _uiniqueItems, address _gameSigner)`**: Initializes the contract; sets up EIP-712 domain, access control, and registers initial game elements. Can only be called once.
- **`commitSingle(bytes32 resourceHash, bytes commit, bytes memory signature)`**: Commits a single signed game action; validates inputs and signature, marks nonce used, dispatches the call to the target token contract, and runs post-commit checks.
- **`commitBatch(bytes[] calldata batch)`**: Commits a batch of signed game actions (max 100); each item is decoded as `(resourceHash, commit, signature)` and processed individually.
- **`addGameElement(GameElementType elementType, string name, address elementTokenAddress, uint256 elementTokenId, bool elementHasTokenId)`**: Registers a new game element in the registry — adds its name to the type array and stores the on-chain token mapping; restricted to `GAME_SIGNER_ROLE`.
- **`removeGameElement(GameElementType elementType, uint256 index)`**: Removes a game element by index from a given type array and deletes its hash mapping; restricted to `GAME_SIGNER_ROLE`.

### Public functions (overrides)

- **`renounceRole(bytes32 role, address callerConfirmation)`**: Standard AccessControl `renounceRole` with a restriction that `DEFAULT_ADMIN_ROLE` cannot be renounced.
- **`grantRole(bytes32 role, address account)`**: Standard AccessControl `grantRole` override that forbids granting `DEFAULT_ADMIN_ROLE` via this function.
- **`revokeRole(bytes32 role, address account)`**: Standard AccessControl `revokeRole` override that forbids revoking `DEFAULT_ADMIN_ROLE` via this function.

### Private functions

- **`_commitSingle(bytes32 resourceHash, bytes commit, bytes signature)`**: Internal commit handler — checks inputs, verifies nonce unused, emits event, marks nonce used, dispatches call, and runs post-commit checks.
- **`_commitDispatcher(address target, bytes callData)`**: Low-level dispatcher that sends the commit call to `target` using `call`, reverting on failure.
- **`_verifyAfter()`**: Placeholder hook for protocol-level post-commit invariant checks (token supplies, etc.).
- **`_verifyInputs(bytes32 resourceHash, bytes commit, bytes signature)`**: Validates commit payload and signer, checks nonce, roles, and addresses; decodes commit into `(nonce, target, callData)`.

### Private view functions

- **`_verifySignature(address target, address account, address signer, uint256 nonce, bytes callData, bytes signature)`**: Builds a typed EIP-712 hash and verifies that the recovered signer has `GAME_SIGNER_ROLE`.
- **`_getMessageHash(address target, address account, address signer, uint256 nonce, bytes callData)`**: Constructs the EIP-712 typed data hash for a `CommitStruct` used in signature validation.

### External view functions

- **`getGameCoinsList()`**: Returns the list of registered coin names.
- **`getResourcesList()`**: Returns the list of registered resource names.
- **`getCharactersList()`**: Returns the list of registered character types.
- **`getUniqueItemsList()`**: Returns the list of registered unique item names.
- **`getGameElementHash(bytes32 resourceHash)`**: Returns the `GameElementStruct` for a given resource hash.
- **`getGameElementName(string name)`**: Returns the `GameElementStruct` for a given element name.
- **`getIsNonceUsed(uint256 nonce)`**: Returns whether a nonce has already been used by the caller.
- **`getBatchMaxLength()`**: Returns the maximum allowed batch size (100).

---

## GameMarket.sol

An upgradeable marketplace contract for trading game assets (ERC721 / ERC1155). Uses UUPS proxy pattern and integrates with `GameRegistry` to validate traded assets.

### External functions

- **`initialize(uint256 _fee, address _gameRegistry)`**: Initializes the contract; sets the protocol fee (in basis points) and the `GameRegistry` address. Can only be called once.
- **`setProtocolFee(uint256 newFee)`**: Updates the protocol fee in basis points; restricted to `DEFAULT_ADMIN_ROLE`.
- **`allowToken(address token)`**: Whitelists a payment token for use in orders; restricted to `DEFAULT_ADMIN_ROLE`.
- **`disallowToken(address token)`**: Removes a payment token from the whitelist; restricted to `DEFAULT_ADMIN_ROLE`.
- **`setGameRegistry(address _gameRegistry)`**: Updates the `GameRegistry` contract reference; restricted to `DEFAULT_ADMIN_ROLE`.
- **`createOrder(address token, uint256 tokenId, uint256 price, uint256 amount, address paymentToken, bytes32 nameHash)`**: Creates a new `OPEN` marketplace order and returns the generated `orderId`.
- **`cancelOrder(uint256 orderId)`**: Cancels an order; restricted to the order maker.
- **`fillOrder(uint256 orderId, address paymentToken)`**: Fills an open order; handles ETH or ERC20 payment (including fee), then transfers the NFT (ERC721 or ERC1155) from maker to taker.
- **`pauseOrder(uint256 orderId)`**: Pauses an open order; restricted to the order maker.
- **`unpauseOrder(uint256 orderId)`**: Resumes a paused order; restricted to the order maker.

### External view functions

- **`getOrder(uint256 orderId)`**: Returns the full `Order` struct for a given order ID.
- **`getGameElementsList(uint8 elementType)`**: Proxies to `GameRegistry` and returns the list of element names for the given `GameElementType`.
- **`getGameElementName(string name)`**: Proxies to `GameRegistry`; returns `GameElementStruct` by element name.
- **`getGameElementHash(bytes32 resourceHash)`**: Proxies to `GameRegistry`; returns `GameElementStruct` by resource hash.
- **`getProtocolFee()`**: Returns the current protocol fee in basis points.
- **`checkTokenIsAllowed(address token)`**: Returns whether a token is whitelisted as a payment method.
- **`getGameRegistry()`**: Returns the address of the connected `GameRegistry` contract.
- **`previewTotalPrice(uint256 price)`**: Returns the total price a buyer must pay (item price + fee).

---

## Token Contracts

All token contracts are UUPS upgradeable and use role-based access control.

### WBCoin — `ERC20`

Game currency. `MINTER_ROLE` can mint and burn. `PAUSER_ROLE` can pause all transfers.

### WBResources — `ERC1155`

Multi-token game resources (potions, materials, etc.). `MINTER_ROLE` can mint/burn single or batch. Token ID `0` is reserved on initialization.

### WBCharacters — `ERC721`

Character NFTs. Auto-incrementing token IDs. `MINTER_ROLE` can mint. Enumerable and pausable.

### WBItems — `ERC721`

Unique item NFTs. Auto-incrementing token IDs. `MINTER_ROLE` can mint. Enumerable and pausable.
