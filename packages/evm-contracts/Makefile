include .env

install:; forge install @openzeppelin/openzeppelin-contracts && forge install @openzeppelin/openzeppelin-contracts-upgradeable && forge install foundry-rs/forge-std

test:
	forge test


deployAll-fuji:; forge script script/DeployAll.s.sol:DeployAll --broadcast --rpc-url $(AVALANCHE_FUJI_RPC_URL) --account devKey --sender 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218 --verify --verifier-url https://api.routescan.io/v2/network/testnet/evm/43113/etherscan --etherscan-api-key verifyContract -vvvv


deployGM-sepolia:; forge script script/Deploy.s.sol:Deploy --rpc-url $(SEPOLIA_RPC_URL) --account devKey --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv

deployGM-fuji:; forge script script/DeployGameRegestry.s.sol:DeployGameRegestry --broadcast --rpc-url $(AVALANCHE_FUJI_RPC_URL) --account devKey --verify --verifier-url https://api.routescan.io/v2/network/testnet/evm/43113/etherscan --etherscan-api-key verifyContract -vvvv

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
# GameRegestry implementation:  0xb9f8B37B9B09af73e42F6a135e2eb82A472a3a24
# GameRegestry proxy:           0xA9996B681FC4B0527dE2269Ca5520DB1d7400F2e

# WBCharacter implementation: 	0x8C96CDC9E76430D7866e7b419eF9BfE185D3f5A1
# WBCharacter proxy:         	0xD7C79a0ED699B906B667E9ABe4f30324736f7C4D

# WBResources implementation: 	0xC06E2dA6490308b5B11b9648a7bc61869Ef34d7F
# WBResources proxy:         	0x7cB9DDfA3D36A3783d77d73BF3479e7384F24964

# WBCoin implementation: 		0xDB9428f203fC7C980069839b55b5d1BF4AAE69Af
# WBCoin proxy:             	0x5bDD1eee4454BF699A8b1F47F8Ec63afFD7850d9

# WBItems implementation:		0x1Fbf7586684C7C78647A3e553DBc02DbE657E7F4
# WBItems proxy:   				0xa123af0528c11e2D7b344939b6212C5A27c14Db5

add-fuji-elements:
	cast send 0x85fBD99b6cc4Dfc9c147E0Db57116E78c79F72A6 "addGameElement(uint8,string,address,uint256,bool)" 1 'Gold' 0x0681F916879746acCD6d176940466cD3fa4EfeAE 1 true --rpc-url $(AVALANCHE_FUJI_RPC_URL) --account gameSigner -vvvv

add-anvil-elements:
	cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "addGameElement(uint8,string,address,uint256,bool)" 1 'Gold' 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 1 true --rpc-url $(ANVIL_RPC_URL) --account defaultKey -vvvv
#	cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "addGameElement(uint8,string,address,uint256,bool)" 3 'LegendarySword' 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318 1 true --rpc-url $(ANVIL_RPC_URL) --account defaultKey -vvvv
	cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "addGameElement(uint8,string,address,uint256,bool)" 2 'Wizard' 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 1 true --rpc-url $(ANVIL_RPC_URL) --account defaultKey -vvvv
	cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "addGameElement(uint8,string,address,uint256,bool)" 2 'Archer' 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 2 true --rpc-url $(ANVIL_RPC_URL) --account defaultKey -vvvv
	cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "addGameElement(uint8,string,address,uint256,bool)" 2 'Duelist' 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 3 true --rpc-url $(ANVIL_RPC_URL) --account defaultKey -vvvv


test-anvil:

# Admin Role
	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
	cast call 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
	cast call 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
	cast call 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
	cast call 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318 "hasRole(bytes32,address)" 0x0000000000000000000000000000000000000000000000000000000000000000 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)

# GameRegestry has Miner Role
	cast call 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 --rpc-url $(ANVIL_RPC_URL)
	cast call 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 --rpc-url $(ANVIL_RPC_URL)
	cast call 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 --rpc-url $(ANVIL_RPC_URL)
	cast call 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 --rpc-url $(ANVIL_RPC_URL)
# GameSigner has Miner Role
	cast call 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
	cast call 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
	cast call 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
	cast call 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318 "hasRole(bytes32,address)" 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)
# GameSigner has GameSigner Role
	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "hasRole(bytes32,address)" 0xf7a14a339431c5b75d52ee00990f12734fece07deb6cc21a89286e2664bf2fcb 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $(ANVIL_RPC_URL)

# Check added elements

	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "getGameElement(bytes32)" 0x6f0d47b12e2c2f7083eb5622541f9c3930e56fc3e46e89e132673f05a079baff --rpc-url $(ANVIL_RPC_URL)
#	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "getGameElement(bytes32)" 0x5c2a483917f813cae9aa0b117bb5174c08e555dc395b5279997860c781885560 --rpc-url $(ANVIL_RPC_URL)
	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "getGameElement(bytes32)" 0x757e6d9d3125f5eeded46c70842b9da6b025feca97f4e2f325e9bb90662815a5 --rpc-url $(ANVIL_RPC_URL)
	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "getGameElement(bytes32)" 0x7298456b584cdea77ec4a7b227e5942619968aebef05e137d56f0c9ae28074bd --rpc-url $(ANVIL_RPC_URL)
	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "getGameElement(bytes32)" 0xa0077870448ce39d817bf61c413e6668cffbdbea297c57dfbb2c21d5be4d46c7 --rpc-url $(ANVIL_RPC_URL)
#	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "hasRole(bytes32,address)" 0xf7a14a339431c5b75d52ee00990f12734fece07deb6cc21a89286e2664bf2fcb 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --rpc-url $(ANVIL_RPC_URL)
#   cast keccak "$(cast --from-utf8 'Wizard')"  
# AddGameEllements

#Anvil
# GameRegestry implementation: 	0x5FbDB2315678afecb367f032d93F642f64180aa3
# GameRegestry proxy:          	0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# WBCharacter implementation: 	0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
# WBCharacter proxy:         	0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

# WBResources implementation: 	0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
# WBResources proxy:         	0x5FC8d32690cc91D4c39d9d3abcBD16989F875707

# WBCoin implementation: 		0x0165878A594ca255338adfa4d48449f69242Eb8F
# WBCoin proxy:   				0xa513E6E4b8f2a923D98304ec87F64353C4D5C853

# WBItems implementation:		0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
# WBItems proxy:   				0x8A791620dd6260079BF849Dc5567aDC3F2FdC318