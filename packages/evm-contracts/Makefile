include .env

install:; forge install @openzeppelin/openzeppelin-contracts && forge install @openzeppelin/openzeppelin-contracts-upgradeable && forge install foundry-rs/forge-std

test:
	forge test


deploy-fuji:; forge script script/DeployAll.s.sol:DeployAll --broadcast --rpc-url $(AVALANCHE_FUJI_RPC_URL) --account devKey --sender 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218 --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv


deployGM-sepolia:; forge script script/Deploy.s.sol:Deploy --rpc-url $(SEPOLIA_RPC_URL) --account devKey --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv

deployGM-fuji:; forge script script/DeployGameRegestry.s.sol:DeployGameRegestry --broadcast --rpc-url $(AVALANCHE_FUJI_RPC_URL) --account devKey --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv

deployAll-anvil:;forge script script/DeployAll.s.sol:DeployAll --broadcast --rpc-url 127.0.0.1:8545 --account defaultKey --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 -vvvv

test-fuji:
# Admin Role
	cast call 0x7007FadE9debEFB3EFF751cCBaDD3f61F8c6613b "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218 --rpc-url $(AVALANCHE_FUJI_RPC_URL)
	cast call 0x43E40c9594515a24486FCb385DDC83d58CDD80a4 "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218 --rpc-url $(AVALANCHE_FUJI_RPC_URL)
	cast call 0x4706Cf881ecab203d3139D55A95D885589145Df0 "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218 --rpc-url $(AVALANCHE_FUJI_RPC_URL)
	cast call 0x4ee6690840acb8CfD44e073d4CE87e0AD2eC6ABa "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218 --rpc-url $(AVALANCHE_FUJI_RPC_URL)
# GameRegestry has Miner Role
	cast call 0x43E40c9594515a24486FCb385DDC83d58CDD80a4 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0x7007FadE9debEFB3EFF751cCBaDD3f61F8c6613b --rpc-url $(AVALANCHE_FUJI_RPC_URL)
	cast call 0x4706Cf881ecab203d3139D55A95D885589145Df0 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0x7007FadE9debEFB3EFF751cCBaDD3f61F8c6613b --rpc-url $(AVALANCHE_FUJI_RPC_URL)
	cast call 0x4ee6690840acb8CfD44e073d4CE87e0AD2eC6ABa "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0x7007FadE9debEFB3EFF751cCBaDD3f61F8c6613b --rpc-url $(AVALANCHE_FUJI_RPC_URL)
# GameSigner has Miner Role
	cast call 0x43E40c9594515a24486FCb385DDC83d58CDD80a4 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xB4Ee8D79974f85AA9D298628A37754d1313dAA99 --rpc-url $(AVALANCHE_FUJI_RPC_URL)
	cast call 0x4706Cf881ecab203d3139D55A95D885589145Df0 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xB4Ee8D79974f85AA9D298628A37754d1313dAA99 --rpc-url $(AVALANCHE_FUJI_RPC_URL)
	cast call 0x4ee6690840acb8CfD44e073d4CE87e0AD2eC6ABa "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xB4Ee8D79974f85AA9D298628A37754d1313dAA99 --rpc-url $(AVALANCHE_FUJI_RPC_URL)

# FuJi
# GameRegestry implementation:  0x5a88c9F3Ac5cD2153b597394e4b1D9E2debfe01E
# GameRegestry proxy:           0x7007FadE9debEFB3EFF751cCBaDD3f61F8c6613b

# WBCharacter implementation: 	0xFdF7ef9d63B41D14CbB64015e8C473aFb8752F41
# WBCharacter proxy:         	0x43E40c9594515a24486FCb385DDC83d58CDD80a4

# WBResources implementation: 	0x7aC614D860B8bF6e03A7221E5153Ee373084129f
# WBResources proxy:         	0x4706Cf881ecab203d3139D55A95D885589145Df0

# WBCoin implementation: 		0xd628d0733BE841b410E88C1AdBaae51D48a01b90
# WBCoin proxy:             	0x4ee6690840acb8CfD44e073d4CE87e0AD2eC6ABa


test-anvil:

# Admin Role
	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
	cast call 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
	cast call 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
	cast call 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
# GameRegestry has Miner Role
	cast call 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 --rpc-url $(ANVIL_RPC_URL)
	cast call 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 --rpc-url $(ANVIL_RPC_URL)
	cast call 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 --rpc-url $(ANVIL_RPC_URL)
# GameSigner has Miner Role
	cast call 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
	cast call 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
	cast call 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
# GameSigner has GameSigner Role
	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "hasRole(bytes32,address)" 0xf7a14a339431c5b75d52ee00990f12734fece07deb6cc21a89286e2664bf2fcb 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)

# AddGameEllements
	cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "addGameElement(uint8,string,address,uint256,bool)" 1 'Wood' 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 1 true --rpc-url $(ANVIL_RPC_URL) --account defaultKey -vvvv

#Anvil
# GameRegestry implementation: 	0x5FbDB2315678afecb367f032d93F642f64180aa3
# GameRegestry proxy:          	0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# WBCharacter implementation: 	0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
# WBCharacter proxy:         	0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

# WBResources implementation: 	0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
# WBResources proxy:         	0x5FC8d32690cc91D4c39d9d3abcBD16989F875707

# WBCoin implementation: 		0x0165878A594ca255338adfa4d48449f69242Eb8F
# WBCoin proxy:   				0xa513E6E4b8f2a923D98304ec87F64353C4D5C853