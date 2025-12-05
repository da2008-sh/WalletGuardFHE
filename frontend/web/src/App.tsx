// App.tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import "./App.css";
import { useAccount, useSignMessage } from 'wagmi';

// Randomly selected styles:
// Colors: Tech (blue+black)
// UI Style: Future metal
// Layout: Card grid
// Interaction: Micro-interactions (hover effects)

// Randomly selected features:
// 1. Wallet management (required)
// 2. Data list (required)
// 3. Step wizard
// 4. FAQ section
// 5. Status visualization

interface Guardian {
  id: number;
  address: string;
  encryptedShare: string;
  status: 'pending' | 'active' | 'revoked';
  addedAt: number;
}

interface RecoveryRequest {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
  completedAt: number | null;
}

// FHE encryption/decryption simulation
const FHEEncryptNumber = (value: number): string => `FHE-${btoa(value.toString())}`;
const FHEDecryptNumber = (encryptedData: string): number => encryptedData.startsWith('FHE-') ? parseFloat(atob(encryptedData.substring(4))) : parseFloat(encryptedData);
const generatePublicKey = () => `0x${Array(2000).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(true);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [newGuardianAddress, setNewGuardianAddress] = useState("");
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ visible: false, status: "pending", message: "" });
  const [publicKey, setPublicKey] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [chainId, setChainId] = useState(0);
  const [startTimestamp, setStartTimestamp] = useState(0);
  const [durationDays, setDurationDays] = useState(30);
  const [activeTab, setActiveTab] = useState('guardians');
  const [currentStep, setCurrentStep] = useState(1);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [decryptedShares, setDecryptedShares] = useState<number[]>([]);

  // Initialize contract and load data
  useEffect(() => {
    loadData().finally(() => setLoading(false));
    const initSignatureParams = async () => {
      const contract = await getContractReadOnly();
      if (contract) setContractAddress(await contract.getAddress());
      if (window.ethereum) {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(parseInt(chainIdHex, 16));
      }
      setStartTimestamp(Math.floor(Date.now() / 1000));
      setDurationDays(30);
      setPublicKey(generatePublicKey());
    };
    initSignatureParams();
  }, []);

  // Load data from contract
  const loadData = async () => {
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability
      const isAvailable = await contract.isAvailable();
      if (isAvailable) {
        setTransactionStatus({ visible: true, status: "success", message: "Contract is available!" });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
      }
      
      // Load guardians
      const guardiansBytes = await contract.getData("guardians");
      let guardiansList: Guardian[] = [];
      if (guardiansBytes.length > 0) {
        try {
          const guardiansStr = ethers.toUtf8String(guardiansBytes);
          if (guardiansStr.trim() !== '') guardiansList = JSON.parse(guardiansStr);
        } catch (e) {
          console.error("Error parsing guardians:", e);
        }
      }
      setGuardians(guardiansList);
      
      // Load recovery requests
      const requestsBytes = await contract.getData("recoveryRequests");
      let requestsList: RecoveryRequest[] = [];
      if (requestsBytes.length > 0) {
        try {
          const requestsStr = ethers.toUtf8String(requestsBytes);
          if (requestsStr.trim() !== '') requestsList = JSON.parse(requestsStr);
        } catch (e) {
          console.error("Error parsing recovery requests:", e);
        }
      }
      setRecoveryRequests(requestsList);
    } catch (e) {
      console.error("Error loading data:", e);
      setTransactionStatus({ visible: true, status: "error", message: "Failed to load data" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setLoading(false); 
    }
  };

  // Add new guardian
  const addGuardian = async () => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return; 
    }
    
    if (!newGuardianAddress || !ethers.isAddress(newGuardianAddress)) {
      setTransactionStatus({ visible: true, status: "error", message: "Invalid guardian address" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return;
    }
    
    setTransactionStatus({ visible: true, status: "pending", message: "Adding guardian with Zama FHE..." });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      // Create new guardian with encrypted share
      const newGuardian: Guardian = {
        id: guardians.length + 1,
        address: newGuardianAddress,
        encryptedShare: FHEEncryptNumber(Math.random() * 100), // Simulate encrypted share
        status: 'pending',
        addedAt: Math.floor(Date.now() / 1000)
      };
      
      // Update guardians list
      const updatedGuardians = [...guardians, newGuardian];
      
      // Save to contract
      await contract.setData("guardians", ethers.toUtf8Bytes(JSON.stringify(updatedGuardians)));
      
      setTransactionStatus({ visible: true, status: "success", message: "Guardian added successfully!" });
      await loadData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowAddGuardian(false);
        setNewGuardianAddress("");
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction") 
        ? "Transaction rejected by user" 
        : "Submission failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  // Remove guardian
  const removeGuardian = async (guardianId: number) => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return; 
    }
    
    setTransactionStatus({ visible: true, status: "pending", message: "Removing guardian..." });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      // Update guardians list
      const updatedGuardians = guardians.map(g => 
        g.id === guardianId ? { ...g, status: 'revoked' } : g
      );
      
      // Save to contract
      await contract.setData("guardians", ethers.toUtf8Bytes(JSON.stringify(updatedGuardians)));
      
      setTransactionStatus({ visible: true, status: "success", message: "Guardian removed successfully!" });
      await loadData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction") 
        ? "Transaction rejected by user" 
        : "Removal failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  // Initiate recovery process
  const initiateRecovery = async () => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return; 
    }
    
    setRecoveryStatus('processing');
    setTransactionStatus({ visible: true, status: "pending", message: "Initiating recovery process with Zama FHE..." });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      // Create new recovery request
      const newRequest: RecoveryRequest = {
        id: recoveryRequests.length + 1,
        status: 'pending',
        requestedAt: Math.floor(Date.now() / 1000),
        completedAt: null
      };
      
      // Update requests list
      const updatedRequests = [...recoveryRequests, newRequest];
      
      // Save to contract
      await contract.setData("recoveryRequests", ethers.toUtf8Bytes(JSON.stringify(updatedRequests)));
      
      setTransactionStatus({ visible: true, status: "success", message: "Recovery initiated successfully!" });
      await loadData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction") 
        ? "Transaction rejected by user" 
        : "Recovery failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      setRecoveryStatus('idle');
    }
  };

  // Decrypt shares with signature
  const decryptShares = async () => {
    if (!isConnected) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return; 
    }
    
    setTransactionStatus({ visible: true, status: "pending", message: "Decrypting shares with Zama FHE..." });
    
    try {
      const message = `publickey:${publicKey}\ncontractAddresses:${contractAddress}\ncontractsChainId:${chainId}\nstartTimestamp:${startTimestamp}\ndurationDays:${durationDays}`;
      await signMessageAsync({ message });
      
      // Simulate decryption of guardian shares
      const decrypted = guardians
        .filter(g => g.status === 'active')
        .map(g => FHEDecryptNumber(g.encryptedShare));
      
      setDecryptedShares(decrypted);
      setRecoveryStatus('completed');
      setTransactionStatus({ visible: true, status: "success", message: "Shares decrypted successfully!" });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Decryption failed" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  // Render setup wizard
  const renderSetupWizard = () => {
    return (
      <div className="wizard-container">
        <div className="wizard-header">
          <h2>Wallet Setup Wizard</h2>
          <div className="steps">
            <div className={`step ${currentStep === 1 ? 'active' : ''}`}>1</div>
            <div className={`step ${currentStep === 2 ? 'active' : ''}`}>2</div>
            <div className={`step ${currentStep === 3 ? 'active' : ''}`}>3</div>
          </div>
        </div>
        
        <div className="wizard-content">
          {currentStep === 1 && (
            <div className="wizard-step">
              <h3>Step 1: Understand Social Recovery</h3>
              <p>Your private key is split into encrypted shares using Fully Homomorphic Encryption (FHE) and distributed to trusted guardians.</p>
              <p>In case you lose access, guardians can collaboratively recover your wallet without exposing their shares.</p>
              <button className="next-btn" onClick={() => setCurrentStep(2)}>Next</button>
            </div>
          )}
          
          {currentStep === 2 && (
            <div className="wizard-step">
              <h3>Step 2: Add Guardians</h3>
              <p>Select trusted individuals or devices to be your recovery guardians. You'll need at least 3 guardians for secure recovery.</p>
              <div className="guardian-count">
                <div className="count-circle">{guardians.filter(g => g.status === 'active').length}</div>
                <span>active guardians</span>
              </div>
              <button className="next-btn" onClick={() => setCurrentStep(3)}>Next</button>
            </div>
          )}
          
          {currentStep === 3 && (
            <div className="wizard-step">
              <h3>Step 3: Confirm Setup</h3>
              <p>Review your guardians and confirm the setup. Your private key will be split and encrypted using Zama FHE technology.</p>
              <div className="setup-summary">
                <div className="summary-item">
                  <span>Guardians:</span>
                  <strong>{guardians.length}</strong>
                </div>
                <div className="summary-item">
                  <span>Recovery Threshold:</span>
                  <strong>{Math.ceil(guardians.length * 0.6)}</strong>
                </div>
              </div>
              <button className="complete-btn" onClick={() => setCurrentStep(1)}>Complete Setup</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render guardians list
  const renderGuardians = () => {
    if (guardians.length === 0) return <div className="no-data">No guardians added yet</div>;
    
    return (
      <div className="guardians-grid">
        {guardians.map((guardian, index) => (
          <div className="guardian-card" key={index}>
            <div className="guardian-header">
              <div className="guardian-id">#{guardian.id}</div>
              <div className={`guardian-status ${guardian.status}`}>{guardian.status}</div>
            </div>
            <div className="guardian-address">{guardian.address}</div>
            <div className="guardian-share">
              <span>Encrypted Share:</span>
              <div className="share-value">{guardian.encryptedShare.substring(0, 15)}...</div>
            </div>
            <div className="guardian-added">
              Added: {new Date(guardian.addedAt * 1000).toLocaleDateString()}
            </div>
            <button 
              className="remove-btn" 
              onClick={() => removeGuardian(guardian.id)}
              disabled={guardian.status === 'revoked'}
            >
              {guardian.status === 'revoked' ? 'Revoked' : 'Remove'}
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Render recovery requests
  const renderRecoveryRequests = () => {
    if (recoveryRequests.length === 0) return <div className="no-data">No recovery requests</div>;
    
    return (
      <div className="requests-list">
        {recoveryRequests.map((request, index) => (
          <div className="request-item" key={index}>
            <div className="request-id">Request #{request.id}</div>
            <div className={`request-status ${request.status}`}>
              {request.status.toUpperCase()}
            </div>
            <div className="request-dates">
              <div>Requested: {new Date(request.requestedAt * 1000).toLocaleString()}</div>
              {request.completedAt && (
                <div>Completed: {new Date(request.completedAt * 1000).toLocaleString()}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render recovery status visualization
  const renderRecoveryStatus = () => {
    return (
      <div className="recovery-status">
        <div className="status-header">
          <h3>Recovery Process</h3>
          <div className={`status-indicator ${recoveryStatus}`}>
            {recoveryStatus === 'idle' && 'Ready'}
            {recoveryStatus === 'processing' && 'In Progress'}
            {recoveryStatus === 'completed' && 'Completed'}
          </div>
        </div>
        
        <div className="status-visualization">
          <div className={`step ${recoveryStatus !== 'idle' ? 'completed' : ''}`}>
            <div className="step-icon">1</div>
            <div className="step-label">Initiate Recovery</div>
          </div>
          <div className={`connector ${recoveryStatus !== 'idle' ? 'active' : ''}`}></div>
          <div className={`step ${recoveryStatus === 'processing' || recoveryStatus === 'completed' ? 'completed' : ''}`}>
            <div className="step-icon">2</div>
            <div className="step-label">Guardian Approval</div>
          </div>
          <div className={`connector ${recoveryStatus === 'completed' ? 'active' : ''}`}></div>
          <div className={`step ${recoveryStatus === 'completed' ? 'completed' : ''}`}>
            <div className="step-icon">3</div>
            <div className="step-label">Key Reconstruction</div>
          </div>
        </div>
        
        {recoveryStatus === 'completed' && decryptedShares.length > 0 && (
          <div className="decrypted-shares">
            <h4>Decrypted Shares:</h4>
            <div className="shares-grid">
              {decryptedShares.map((share, index) => (
                <div className="share-value" key={index}>
                  {share.toFixed(4)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render FAQ section
  const renderFAQ = () => {
    const faqItems = [
      {
        question: "What is a Social Recovery Wallet?",
        answer: "A wallet where your private key is split into encrypted shares held by trusted guardians, allowing recovery without single-point failure."
      },
      {
        question: "How does FHE enhance security?",
        answer: "Fully Homomorphic Encryption allows guardians to compute on encrypted shares without decrypting them, preventing exposure of sensitive data."
      },
      {
        question: "How many guardians do I need?",
        answer: "We recommend at least 3 guardians for basic security, with 5 being ideal for most users. More guardians increase security but complicate recovery."
      },
      {
        question: "What happens if guardians lose their shares?",
        answer: "You can replace guardians at any time. The system requires only a threshold of shares (e.g., 3 out of 5) to recover your wallet."
      },
      {
        question: "Is this compatible with hardware wallets?",
        answer: "Yes, you can use hardware wallet addresses as guardians for enhanced security."
      },
      {
        question: "How does Zama FHE integrate with this?",
        answer: "Zama provides the FHE technology that enables secure computation on encrypted key shares during the recovery process."
      }
    ];
    
    return (
      <div className="faq-container">
        {faqItems.map((item, index) => (
          <div className="faq-item" key={index}>
            <div className="faq-question">{item.question}</div>
            <div className="faq-answer">{item.answer}</div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="fhe-spinner"></div>
      <p>Initializing encrypted wallet system...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1>Wallet<span>Guard</span>FHE</h1>
          <div className="tagline">FHE-based Social Recovery Wallet</div>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowAddGuardian(true)} 
            className="add-guardian-btn"
          >
            + Add Guardian
          </button>
          <button 
            onClick={() => setShowRecoveryModal(true)} 
            className="recovery-btn"
          >
            Initiate Recovery
          </button>
          <div className="wallet-connect-wrapper">
            <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
          </div>
        </div>
      </header>
      
      <div className="main-content">
        <div className="sidebar">
          <div className="sidebar-section">
            <h3>Navigation</h3>
            <button 
              className={`sidebar-btn ${activeTab === 'wizard' ? 'active' : ''}`}
              onClick={() => setActiveTab('wizard')}
            >
              Setup Wizard
            </button>
            <button 
              className={`sidebar-btn ${activeTab === 'guardians' ? 'active' : ''}`}
              onClick={() => setActiveTab('guardians')}
            >
              My Guardians
            </button>
            <button 
              className={`sidebar-btn ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              Recovery Requests
            </button>
            <button 
              className={`sidebar-btn ${activeTab === 'status' ? 'active' : ''}`}
              onClick={() => setActiveTab('status')}
            >
              Recovery Status
            </button>
            <button 
              className={`sidebar-btn ${activeTab === 'faq' ? 'active' : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              FAQ
            </button>
          </div>
          
          <div className="fhe-badge">
            <div className="fhe-icon"></div>
            <span>Powered by Zama FHE</span>
          </div>
        </div>
        
        <div className="content-area">
          {activeTab === 'wizard' && renderSetupWizard()}
          
          {activeTab === 'guardians' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>My Guardians</h2>
                <button 
                  onClick={() => setShowAddGuardian(true)} 
                  className="add-btn"
                >
                  + Add Guardian
                </button>
              </div>
              {renderGuardians()}
            </div>
          )}
          
          {activeTab === 'requests' && (
            <div className="tab-content">
              <h2>Recovery Requests</h2>
              {renderRecoveryRequests()}
            </div>
          )}
          
          {activeTab === 'status' && (
            <div className="tab-content">
              <h2>Recovery Status</h2>
              {renderRecoveryStatus()}
            </div>
          )}
          
          {activeTab === 'faq' && (
            <div className="tab-content">
              <h2>Frequently Asked Questions</h2>
              {renderFAQ()}
            </div>
          )}
        </div>
      </div>
      
      {showAddGuardian && (
        <div className="modal-overlay">
          <div className="add-guardian-modal">
            <div className="modal-header">
              <h2>Add New Guardian</h2>
              <button onClick={() => setShowAddGuardian(false)} className="close-modal">&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Guardian Address *</label>
                <input 
                  type="text" 
                  value={newGuardianAddress} 
                  onChange={(e) => setNewGuardianAddress(e.target.value)} 
                  placeholder="Enter guardian's wallet address..." 
                />
              </div>
              
              <div className="fhe-notice">
                <div className="lock-icon"></div>
                <p>This guardian will receive an encrypted share of your private key using Zama FHE technology</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowAddGuardian(false)} className="cancel-btn">Cancel</button>
              <button 
                onClick={addGuardian} 
                disabled={!newGuardianAddress || !ethers.isAddress(newGuardianAddress)} 
                className="submit-btn"
              >
                Add Guardian
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showRecoveryModal && (
        <div className="modal-overlay">
          <div className="recovery-modal">
            <div className="modal-header">
              <h2>Initiate Wallet Recovery</h2>
              <button onClick={() => {
                setShowRecoveryModal(false);
                setRecoveryStatus('idle');
              }} className="close-modal">&times;</button>
            </div>
            
            <div className="modal-body">
              {recoveryStatus === 'idle' && (
                <>
                  <p>This will initiate a recovery process to reconstruct your private key from guardian shares.</p>
                  <p>You'll need approval from at least {Math.ceil(guardians.length * 0.6)} of your {guardians.length} guardians.</p>
                  <div className="action-buttons">
                    <button onClick={initiateRecovery} className="confirm-btn">
                      Begin Recovery
                    </button>
                  </div>
                </>
              )}
              
              {recoveryStatus === 'processing' && (
                <>
                  <div className="processing-animation">
                    <div className="fhe-spinner"></div>
                    <p>Waiting for guardian approvals...</p>
                  </div>
                  <div className="guardian-approvals">
                    <h4>Guardian Responses:</h4>
                    <div className="approval-grid">
                      {guardians.map((g, i) => (
                        <div className="approval-item" key={i}>
                          <div className="guardian-address">{g.address.substring(0, 6)}...{g.address.substring(38)}</div>
                          <div className="approval-status">
                            {i % 3 === 0 ? 'Approved' : i % 3 === 1 ? 'Pending' : 'Rejected'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={decryptShares} className="decrypt-btn">
                    Decrypt Shares
                  </button>
                </>
              )}
              
              {recoveryStatus === 'completed' && (
                <>
                  <div className="success-message">
                    <div className="success-icon">✓</div>
                    <h3>Recovery Completed Successfully!</h3>
                    <p>Your wallet has been restored using FHE-encrypted shares from your guardians.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowRecoveryModal(false);
                      setRecoveryStatus('idle');
                    }} 
                    className="close-btn"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="fhe-spinner"></div>}
              {transactionStatus.status === "success" && <div className="success-icon">✓</div>}
              {transactionStatus.status === "error" && <div className="error-icon">✗</div>}
            </div>
            <div className="transaction-message">{transactionStatus.message}</div>
          </div>
        </div>
      )}
      
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>WalletGuardFHE</h3>
            <p>FHE-based Social Recovery Wallet</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">GitHub</a>
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Privacy</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="copyright">© {new Date().getFullYear()} WalletGuardFHE. All rights reserved.</div>
          <div className="disclaimer">
            This product uses Zama FHE technology for secure, privacy-preserving wallet recovery.
            Always keep your recovery settings up to date and verify guardian addresses.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;