import { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  ExternalLink,
  Calendar,
  Building2,
  User,
  Loader2,
  Lock,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { Credential } from '../types/credential';
import { verifyCredential, connectWallet } from '../utils/blockchain';
import { getIPFSUrl } from '../utils/ipfs';
import { checkUserSubscription } from '../utils/subscriptions';
import PricingModal from './PricingModal';

export default function VerificationPortal() {
  const [tokenId, setTokenId] = useState('');
  const [credential, setCredential] = useState<Credential | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [verificationCount, setVerificationCount] = useState(0);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verifyParam = urlParams.get('verify');
    if (verifyParam) {
      setTokenId(verifyParam);
      handleVerify(verifyParam);
    }
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (walletAddress) {
      checkAccess();
    }
  }, [walletAddress]);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  };

  const handleConnectWallet = async () => {
    const address = await connectWallet();
    if (address) {
      setWalletAddress(address);
    }
  };

  const checkAccess = async () => {
    if (!walletAddress) return;

    setCheckingAccess(true);
    const { hasAccess: access } = await checkUserSubscription(walletAddress, 'employer');
    setHasAccess(access);
    setCheckingAccess(false);
  };

  const handleVerify = async (id?: string) => {
    const idToVerify = id || tokenId;
    if (!idToVerify.trim()) {
      setError('Please enter a token ID');
      return;
    }

    if (walletAddress && !hasAccess && verificationCount >= 3) {
      setError('Verification limit reached. Please subscribe to continue.');
      setShowPricing(true);
      return;
    }

    setLoading(true);
    setError(null);
    setCredential(null);
    setSearched(true);

    try {
      const result = await verifyCredential(idToVerify);
      if (result) {
        setCredential(result);
        if (walletAddress && !hasAccess) {
          setVerificationCount((prev) => prev + 1);
        }
      } else {
        setError('Credential not found or invalid token ID');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify credential');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg shadow-lg p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Verify Academic Credential</h2>
          {!walletAddress ? (
            <button
              onClick={handleConnectWallet}
              className="px-4 py-2 bg-[#FFC700] text-black rounded-lg font-medium hover:opacity-90 transition-colors flex items-center text-sm"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </button>
          ) : !hasAccess && (
            <div className="text-right">
              <p className="text-sm text-[#BFBFBF]">
                Free verifications: {3 - verificationCount} / 3
              </p>
              <button
                onClick={() => setShowPricing(true)}
                className="text-sm text-[#FFC700] hover:opacity-90 font-medium"
              >
                Upgrade for unlimited
              </button>
            </div>
          )}
        </div>

        {walletAddress && !hasAccess && verificationCount >= 3 && (
          <div className="mb-4 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
            <div className="flex items-start">
              <Lock className="w-5 h-5 text-[#FFC700] mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">Free limit reached</p>
                <p className="text-sm text-[#BFBFBF] mt-1">
                  Subscribe to continue verifying credentials. Use code{' '}
                  <span className="font-mono font-semibold text-[#FFC700]">TRINETRA</span> for free access.
                </p>
                <button
                  onClick={() => setShowPricing(true)}
                  className="mt-2 text-sm text-[#FFC700] hover:opacity-90 font-medium underline"
                >
                  View pricing plans
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <input
            type="text"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="Enter Token ID or scan QR code"
            className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-[#FFC700] focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          />
          <button
            onClick={() => handleVerify()}
            disabled={loading}
            className="bg-[#FFC700] text-black px-6 py-3 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#FFC700] focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Verify
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-[#1A1A1A] border border-red-500/40 rounded-lg flex items-start">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {searched && credential && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg shadow-lg overflow-hidden">
          <div
            className={`p-6 ${
              credential.revoked
                ? 'bg-gradient-to-br from-red-600 to-red-800'
                : 'bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]'
            } text-white`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                {credential.revoked ? (
                  <XCircle className="w-8 h-8 mr-3" />
                ) : (
                  <CheckCircle className="w-8 h-8 mr-3 text-[#FFC700]" />
                )}
                <h3 className="text-2xl font-bold">
                  {credential.revoked ? 'Credential Revoked' : 'Verified Credential'}
                </h3>
              </div>
            </div>
            {credential.revoked && (
              <p className="text-white text-sm">
                This credential has been revoked and is no longer valid
              </p>
            )}
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center text-sm text-[#808080] mb-1">
                    <Building2 className="w-4 h-4 mr-2" />
                    Institution
                  </div>
                  <p className="text-lg font-semibold text-white">{credential.institution}</p>
                </div>

                <div>
                  <div className="flex items-center text-sm text-[#808080] mb-1">
                    Degree / Program
                  </div>
                  <p className="text-lg font-semibold text-white">{credential.degree}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center text-sm text-[#808080] mb-1">
                    <Calendar className="w-4 h-4 mr-2" />
                    Issue Date
                  </div>
                  <p className="text-lg font-semibold text-white">
                    {formatDate(credential.issueDate)}
                  </p>
                </div>

                <div>
                  <div className="flex items-center text-sm text-[#808080] mb-1">
                    <User className="w-4 h-4 mr-2" />
                    Student Address
                  </div>
                  <p className="text-lg font-semibold text-white font-mono">
                    {shortenAddress(credential.student)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#2A2A2A] pt-6">
              <h4 className="text-sm font-medium text-[#BFBFBF] mb-3">Blockchain Proof</h4>
              <div className="bg-[#0A0A0A] rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#808080]">Token ID:</span>
                  <span className="font-mono text-white">{credential.tokenId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#808080]">IPFS Hash:</span>
                  <a
                    href={getIPFSUrl(credential.ipfsHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[#FFC700] hover:opacity-90 flex items-center"
                  >
                    {credential.ipfsHash.slice(0, 10)}...
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <a
                href={getIPFSUrl(credential.ipfsHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#FFC700] text-black py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-colors flex items-center justify-center"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                View Document
              </a>
            </div>
          </div>
        </div>
      )}

      {!searched && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-12 text-center">
          <Search className="w-16 h-16 text-[#808080] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Enter Token ID to Verify</h3>
          <p className="text-[#BFBFBF]">
            Enter a credential token ID or scan a QR code to verify its authenticity
          </p>
        </div>
      )}

      {showPricing && walletAddress && (
        <PricingModal
          userType="employer"
          userAddress={walletAddress}
          onClose={() => setShowPricing(false)}
          onSuccess={() => {
            setShowPricing(false);
            checkAccess();
          }}
        />
      )}
    </div>
  );
}
