include .env

install:; forge install @openzeppelin/openzeppelin-contracts && forge install @openzeppelin/openzeppelin-contracts-upgradeable && forge install foundry-rs/forge-std

test:
	forge test


deployAll-fuji:; forge script script/DeployAll.s.sol:DeployAll --broadcast --rpc-url $(AVALANCHE_FUJI_RPC_URL) --account devKey --sender 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218 --verify --verifier-url https://api.routescan.io/v2/network/testnet/evm/43113/etherscan --etherscan-api-key verifyContract -vvvv


deployGR-sepolia:; forge script script/Deploy.s.sol:Deploy --rpc-url $(SEPOLIA_RPC_URL) --account devKey --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv

deployGR-fuji:; forge script script/DeployGameRegestry.s.sol:DeployGameRegestry --broadcast --rpc-url $(AVALANCHE_FUJI_RPC_URL) --account devKey --verify --verifier-url https://api.routescan.io/v2/network/testnet/evm/43113/etherscan --etherscan-api-key verifyContract -vvvv

deployGM-fuji:; forge script script/DeployGameMarket.s.sol:DeployGameMarket --broadcast --rpc-url $(AVALANCHE_FUJI_RPC_URL) --account devKey --verify --verifier-url https://api.routescan.io/v2/network/testnet/evm/43113/etherscan --etherscan-api-key verifyContract -vvvv

deployAll-anvil:;forge script script/DeployAll.s.sol:DeployAll --broadcast --rpc-url 127.0.0.1:8545 --account defaultKey --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --verify --verifier-url https://api.routescan.io/v2/network/testnet/evm/43113/etherscan --etherscan-api-key verifyContract -vvvv

upgradeMarket-fuji:; forge script script/UpgradeMarket.s.sol --rpc-url ${AVALANCHE_FUJI_RPC_URL} --broadcast --account devKey --verify --verifier-url https://api.routescan.io/v2/network/testnet/evm/43113/etherscan --etherscan-api-key verifyContract -vvvv

test-fuji:

# GameMarket has GameRegistry set
	cast call 0xdf767a5d5D14c60e5C31fDBD839106AA6dAe34F8 "getGameRegistry()" --rpc-url $(AVALANCHE_FUJI_RPC_URL)

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

test-fuji-createOrder:; forge script script/TestOrder.s.sol:CreateOrder --rpc-url ${AVALANCHE_FUJI_RPC_URL} --broadcast --account devDev --sender 0xa36613f165d04ebb0e2ee821b3b2585137c148db -vvvv
test-fuji-fillOrder:; forge script script/TestOrder.s.sol:FillOrder --rpc-url ${AVALANCHE_FUJI_RPC_URL} --broadcast --account devKey --sender 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218 -vvvv

# FuJi
# GameRegestry implementation:  0xF6ea80fA07C4FE3A45399A4b1d81ceF6Cc81D9B8
# GameRegestry proxy:           0x4e590B45fB999d93e981af65eB6A4eC06652A04D

# WBCharacter implementation: 	0x0a9054161D69de45d2016720cE663417e7627598
# WBCharacter proxy:         	0x55e1cCD651A3e3e0EfC6b61e8c94878cbe87F64B

# WBResources implementation: 	0xfBA871cFfc473fbcAC883663a38d5FdAa4586D5E
# WBResources proxy:         	0xee52Ce7D2c46F8B728D74a030efCB78885F90E25

# WBCoin implementation: 		0x02f2Ce71317AF30A1B6a98481ab0feb59fcdB0bf
# WBCoin proxy:             	0x5D7Ea21B4FBfF8e607fedb76ed0681ae5CfA814f

# WBItems implementation:		0x4B4b53E9FB8B2928D3aE423d91F6c8fd7aa322A6
# WBItems proxy:   				0x6fC43f3cf1B27199F52F160f05645b1541292484

# GameMarket implementation:	0xD6Acb26f17F3C8c87C32cD781C97c86071562672
# GameMarket proxy:   			0x8865d8738E37671138D5270A7B4befeE83DeE904

postDeployGM-fuji:
	cast send 0x8865d8738E37671138D5270A7B4befeE83DeE904 "setGameRegistry(address)" 0x4e590B45fB999d93e981af65eB6A4eC06652A04D --rpc-url $(AVALANCHE_FUJI_RPC_URL) --account devKey -vvvv
	cast send 0x8865d8738E37671138D5270A7B4befeE83DeE904 "allowToken(address)" 0xee52Ce7D2c46F8B728D74a030efCB78885F90E25 --rpc-url $(AVALANCHE_FUJI_RPC_URL) --account devKey -vvvv
	cast send 0x8865d8738E37671138D5270A7B4befeE83DeE904 "allowToken(address)" 0x5425890298aed601595a70AB815c96711a31Bc65 --rpc-url $(AVALANCHE_FUJI_RPC_URL) --account devKey -vvvv

add-fuji-elements:
	cast send 0x85fBD99b6cc4Dfc9c147E0Db57116E78c79F72A6 "addGameElement(uint8,string,address,uint256,bool)" 1 'Gold' 0x0681F916879746acCD6d176940466cD3fa4EfeAE 1 true --rpc-url $(AVALANCHE_FUJI_RPC_URL) --account gameSigner -vvvv

add-anvil-elements:
	cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "addGameElement(uint8,string,address,uint256,bool)" 1 'Gold' 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 1 true --rpc-url $(ANVIL_RPC_URL) --account defaultKey -vvvv
#	cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "addGameElement(uint8,string,address,uint256,bool)" 3 'LegendarySword' 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318 1 true --rpc-url $(ANVIL_RPC_URL) --account defaultKey -vvvv
	cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "addGameElement(uint8,string,address,uint256,bool)" 2 'Wizard' 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 1 true --rpc-url $(ANVIL_RPC_URL) --account defaultKey -vvvv
	cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "addGameElement(uint8,string,address,uint256,bool)" 2 'Archer' 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 2 true --rpc-url $(ANVIL_RPC_URL) --account defaultKey -vvvv
	cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "addGameElement(uint8,string,address,uint256,bool)" 2 'Duelist' 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 3 true --rpc-url $(ANVIL_RPC_URL) --account defaultKey -vvvv


test-anvil:
# GameMarket has GameRegistry set
	cast call 0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e "getGameRegistry()" --rpc-url $(ANVIL_RPC_URL)
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

	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "getGameElementHash(bytes32)" 0x6f0d47b12e2c2f7083eb5622541f9c3930e56fc3e46e89e132673f05a079baff --rpc-url $(ANVIL_RPC_URL)
#	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "getGameElementHash(bytes32)" 0x5c2a483917f813cae9aa0b117bb5174c08e555dc395b5279997860c781885560 --rpc-url $(ANVIL_RPC_URL)
	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "getGameElementHash(bytes32)" 0x757e6d9d3125f5eeded46c70842b9da6b025feca97f4e2f325e9bb90662815a5 --rpc-url $(ANVIL_RPC_URL)
	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "getGameElementHash(bytes32)" 0x7298456b584cdea77ec4a7b227e5942619968aebef05e137d56f0c9ae28074bd --rpc-url $(ANVIL_RPC_URL)
	cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "getGameElementHash(bytes32)" 0xa0077870448ce39d817bf61c413e6668cffbdbea297c57dfbb2c21d5be4d46c7 --rpc-url $(ANVIL_RPC_URL)
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

# GameMarket implementation:		0x610178dA211FEF7D417bC0e6FeD39F05609AD788
# GameMarket proxy:   				0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e