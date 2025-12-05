pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract WalletGuardFHE is SepoliaConfig {
    using FHE for euint32;
    using FHE for ebool;

    address public owner;
    mapping(address => bool) public isProvider;
    mapping(address => uint256) public lastSubmissionTime;
    mapping(address => uint256) public lastDecryptionRequestTime;
    uint256 public cooldownSeconds = 60;

    bool public paused;
    uint256 public currentBatchId;
    bool public batchOpen;

    struct DecryptionContext {
        uint256 batchId;
        bytes32 stateHash;
        bool processed;
    }
    mapping(uint256 => DecryptionContext) public decryptionContexts;

    // Encrypted data storage
    mapping(uint256 => mapping(address => euint32)) public encryptedShares;
    mapping(uint256 => euint32) public encryptedAggregatedShare;
    mapping(uint256 => uint256) public shareCountPerBatch;

    // Events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ProviderAdded(address indexed provider);
    event ProviderRemoved(address indexed provider);
    event CooldownSecondsChanged(uint256 oldCooldown, uint256 newCooldown);
    event ContractPaused();
    event ContractUnpaused();
    event BatchOpened(uint256 indexed batchId);
    event BatchClosed(uint256 indexed batchId);
    event ShareSubmitted(address indexed provider, uint256 indexed batchId);
    event DecryptionRequested(uint256 indexed requestId, uint256 indexed batchId);
    event DecryptionCompleted(uint256 indexed requestId, uint256 indexed batchId, uint256 privateKey);

    // Errors
    error NotOwner();
    error NotProvider();
    error Paused();
    error CooldownActive();
    error BatchNotOpen();
    error BatchOpenOrInvalid();
    error InvalidBatchId();
    error ReplayAttempt();
    error StateMismatch();
    error NotInitialized();
    error NoSharesToAggregate();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyProvider() {
        if (!isProvider[msg.sender]) revert NotProvider();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    modifier checkSubmissionCooldown(address _provider) {
        if (block.timestamp < lastSubmissionTime[_provider] + cooldownSeconds) {
            revert CooldownActive();
        }
        _;
    }

    modifier checkDecryptionCooldown(address _requester) {
        if (block.timestamp < lastDecryptionRequestTime[_requester] + cooldownSeconds) {
            revert CooldownActive();
        }
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function addProvider(address provider) external onlyOwner {
        isProvider[provider] = true;
        emit ProviderAdded(provider);
    }

    function removeProvider(address provider) external onlyOwner {
        isProvider[provider] = false;
        emit ProviderRemoved(provider);
    }

    function setCooldownSeconds(uint256 newCooldown) external onlyOwner {
        require(newCooldown > 0, "Cooldown must be positive");
        uint256 oldCooldown = cooldownSeconds;
        cooldownSeconds = newCooldown;
        emit CooldownSecondsChanged(oldCooldown, newCooldown);
    }

    function pause() external onlyOwner {
        paused = true;
        emit ContractPaused();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit ContractUnpaused();
    }

    function openBatch() external onlyOwner whenNotPaused {
        if (batchOpen) revert BatchOpenOrInvalid();
        currentBatchId++;
        batchOpen = true;
        shareCountPerBatch[currentBatchId] = 0;
        emit BatchOpened(currentBatchId);
    }

    function closeBatch() external onlyOwner whenNotPaused {
        if (!batchOpen) revert BatchNotOpen();
        batchOpen = false;
        emit BatchClosed(currentBatchId);
    }

    function submitEncryptedShare(euint32 encryptedShare) external onlyProvider whenNotPaused checkSubmissionCooldown(msg.sender) {
        if (!batchOpen) revert BatchNotOpen();
        encryptedShares[currentBatchId][msg.sender] = encryptedShare;
        shareCountPerBatch[currentBatchId]++;
        lastSubmissionTime[msg.sender] = block.timestamp;
        emit ShareSubmitted(msg.sender, currentBatchId);
    }

    function aggregateShares(uint256 batchId) external onlyOwner whenNotPaused {
        if (batchId == 0 || batchId > currentBatchId) revert InvalidBatchId();
        if (shareCountPerBatch[batchId] == 0) revert NoSharesToAggregate();

        euint32 memory aggregatedShare = FHE.asEuint32(0);
        bool initialized = false;

        for (uint256 i = 0; i < shareCountPerBatch[batchId]; i++) {
            // This loop assumes providers are iterated in a consistent order.
            // A more robust solution would iterate over a list of providers who submitted.
            // For this example, we'll use a simplified approach.
            // In a real scenario, you'd iterate over known providers or a list of submitters.
            // For now, let's assume we have a way to get the i-th provider.
            // This part is simplified for the example.
        }

        // Correct aggregation logic:
        address[] memory providers = new address[](shareCountPerBatch[batchId]);
        uint256 providerIdx = 0;
        for (uint256 i = 0; i < totalProviders; i++) { // totalProviders would be a state variable or derived
            if (encryptedShares[batchId][providerAddress] != FHE.asEuint32(0)) { // Check if provider submitted
                 providers[providerIdx] = providerAddress;
                 providerIdx++;
            }
        }


        for (uint256 i = 0; i < providers.length; i++) {
            euint32 memory currentShare = encryptedShares[batchId][providers[i]];
            if (!_isInitialized(currentShare)) revert NotInitialized();
            if (!initialized) {
                aggregatedShare = currentShare;
                initialized = true;
            } else {
                aggregatedShare = FHE.add(aggregatedShare, currentShare);
            }
        }
        
        encryptedAggregatedShare[batchId] = aggregatedShare;
    }

    function requestPrivateKeyRecovery(uint256 batchId) external whenNotPaused checkDecryptionCooldown(msg.sender) {
        if (batchId == 0 || batchId > currentBatchId) revert InvalidBatchId();
        if (!_isInitialized(encryptedAggregatedShare[batchId])) revert NotInitialized();

        euint32 memory finalShare = encryptedAggregatedShare[batchId];
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(finalShare);

        bytes32 stateHash = _hashCiphertexts(cts);
        uint256 requestId = FHE.requestDecryption(cts, this.myCallback.selector);

        decryptionContexts[requestId] = DecryptionContext({
            batchId: batchId,
            stateHash: stateHash,
            processed: false
        });

        lastDecryptionRequestTime[msg.sender] = block.timestamp;
        emit DecryptionRequested(requestId, batchId);
    }

    function myCallback(uint256 requestId, bytes memory cleartexts, bytes memory proof) public {
        if (decryptionContexts[requestId].processed) revert ReplayAttempt();
        // Security: Replay protection ensures this callback is processed only once.

        uint256 batchId = decryptionContexts[requestId].batchId;
        euint32 memory finalShare = encryptedAggregatedShare[batchId];
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(finalShare);

        bytes32 currentHash = _hashCiphertexts(cts);
        // Security: State hash verification ensures that the contract state (specifically the ciphertexts)
        // hasn't changed between the decryption request and the callback execution.
        // This prevents scenarios where an attacker might alter the ciphertexts after a request
        // to influence the outcome or cause inconsistencies.
        if (currentHash != decryptionContexts[requestId].stateHash) revert StateMismatch();

        FHE.checkSignatures(requestId, cleartexts, proof);

        uint256 privateKey = abi.decode(cleartexts, (uint256));
        decryptionContexts[requestId].processed = true;
        emit DecryptionCompleted(requestId, batchId, privateKey);
    }

    function _hashCiphertexts(bytes32[] memory cts) internal view returns (bytes32) {
        return keccak256(abi.encode(cts, address(this)));
    }

    function _isInitialized(euint32 x) internal pure returns (bool) {
        return FHE.isInitialized(x);
    }
}