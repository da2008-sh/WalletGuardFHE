# WalletGuardFHE: A Zama-Powered Social Recovery Wallet

WalletGuardFHE is a cutting-edge social recovery wallet that utilizes **Zama's Fully Homomorphic Encryption technology** to securely manage and recover private keys. In an era where digital assets are paramount, WalletGuardFHE offers an innovative solution that ensures your cryptocurrency can be recovered without ever exposing private key fragments to any guardians involved in the process.

## The Problem at Hand

As the reliance on digital wallets grows, so does the risk associated with losing access to them. Traditional recovery methods for wallets can be fraught with vulnerabilities, often leading to potential loss of funds. If a user loses their private key, recovering access can be nearly impossible, resulting in irreversible loss of assets. The challenge of maintaining both security and accessibility has never been more crucial.

## Harnessing the Power of FHE

WalletGuardFHE addresses these issues head-on by leveraging Fully Homomorphic Encryption (FHE). With the help of Zama's open-source libraries such as **Concrete** and the **zama-fhe SDK**, the wallet enables a unique mechanism for private key recovery. Instead of exposing private key fragments during recovery, various guardians can collaborate to reconstruct the key through secure multi-party computation (MPC), all while ensuring that no guardian can glean any sensitive information from others. This innovative method not only secures your funds but enhances overall wallet security.

## Key Features

WalletGuardFHE comes packed with essential functionalities designed with user security and ease-of-use in mind:

- **FHE Encryption**: Each user's private key is encrypted and split into secure fragments held by multiple guardians.
- **Multi-Party Computation**: Allows collaborative recovery without exposing individual fragments.
- **Guardian Confidentiality**: Guardians operate without knowledge of each other's fragments, ensuring complete privacy.
- **User-Friendly Interface**: An intuitive setup and recovery process that makes managing your wallet easy even for non-technical users.
- **Robust Security**: Combines advanced cryptography with usability to provide maximum protection against unauthorized access.

## Technology Stack

WalletGuardFHE is built using the following technologies:

- **Zama FHE SDK**: Core component enabling homomorphic encryption and secure computation.
- **Node.js**: For backend development and server-side logic.
- **Hardhat/Foundry**: Development environments for Ethereum smart contracts.
- **Solidity**: Language for writing smart contracts.

## Directory Structure

Here’s the project structure for WalletGuardFHE:

```
WalletGuardFHE/
│
├── contracts/
│   └── WalletGuardFHE.sol
│
├── src/
│   ├── index.js
│   └── guardian.js
│
├── tests/
│   ├── WalletGuardFHE.test.js
│   └── guardian.test.js
│
├── package.json
└── README.md
```

## Installation Guide

To set up WalletGuardFHE on your local machine, follow these instructions:

1. Ensure you have **Node.js** and **npm** installed.
2. Navigate to the project folder where you have extracted the files.
3. Run the command below to install necessary dependencies, including Zama FHE libraries:

   ```bash
   npm install
   ```

Please **do not** use `git clone` or any URLs to obtain this project.

## Build & Run Guide

Once your installation is complete, you can compile and run WalletGuardFHE using the following commands:

1. **Compile the Smart Contracts**:
   ```bash
   npx hardhat compile
   ```

2. **Run Tests**:
   ```bash
   npx hardhat test
   ```

3. **Start the Development Server**:
   ```bash
   npx hardhat run src/index.js --network localhost
   ```

### Example Code Snippet

Here’s a simple example demonstrating how to initiate the recovery process in WalletGuardFHE:

```javascript
const { recoverKey } = require('./guardian');

async function initiateRecovery(userFragments) {
    try {
        const reconstructedKey = await recoverKey(userFragments);
        console.log(`Private Key Successfully Recovered: ${reconstructedKey}`);
    } catch (error) {
        console.error('Error during recovery:', error);
    }
}

// Sample invocation with hypothetical user fragments
initiateRecovery(['fragment1', 'fragment2', 'fragment3']);
```

This code highlights the core functionality of reconstructing a user's private key using securely handled fragments.

## Acknowledgements

### Powered by Zama

We would like to extend our gratitude to the Zama team for their pioneering efforts in developing the open-source tools that make confidential blockchain applications feasible. Thank you for empowering projects like WalletGuardFHE with your commitment to secure cryptographic solutions.
