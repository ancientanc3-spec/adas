import { useState, useEffect } from 'react';
import {
  Wallet,
  ExternalLink,
  FileText,
  Share2,
  Calendar,
  Building2,
  Loader2,
  History,
  Box,
  User
} from 'lucide-react';
import { Credential } from '../types/credential';
import { connectWallet, getStudentCredentials, switchToSepolia } from '../utils/blockchain';
import { getIPFSUrl } from '../utils/ipfs';
import { getCredentialsByStudent, CredentialRecord } from '../utils/supabase';
import QRCodeModal from './QRCodeModal';
import CredentialSharing from './CredentialSharing';
import AuditTrail from './AuditTrail';
import Credential3DShowcase from './Credential3DShowcase';
import StudentProfile from './StudentProfile';

export default function StudentWallet() {
  const [activeTab, setActiveTab] = useState<'credentials' | 'profile'>('credentials');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [shareCredential, setShareCredential] = useState<CredentialRecord | null>(null);
  const [viewAuditCredential, setViewAuditCredential] = useState<string | null>(null);
  const [dbCredentials, setDbCredentials] = useState<CredentialRecord[]>([]);
  const [view3D, setView3D] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          loadCredentials(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const handleConnectWallet = async () => {
    setLoading(true);
    try {
      const address = await connectWallet();
      if (address) {
        setWalletAddress(address);
        await switchToSepolia();
        loadCredentials(address);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCredentials = async (address: string) => {
    setLoading(true);
    try {
      const creds = await getStudentCredentials(address);
      setCredentials(creds);
      const dbCreds = await getCredentialsByStudent(address);
      setDbCredentials(dbCreds);
    } catch (error) {
      console.error('Error loading credentials:', error);
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

  if (!walletAddress) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-[#141414] rounded-lg shadow-lg p-8 text-center border border-[#2A2A2A]">
          <Wallet className="w-16 h-16 text-[#FFC700] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-[#BFBFBF] mb-6">
            Connect your MetaMask wallet to view your academic credentials
          </p>
          <button
            onClick={handleConnectWallet}
            disabled={loading}
            className="bg-[#FFC700] text-black py-3 px-6 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#FFC700] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center mx-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5 mr-2" />
                Connect Wallet
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-[#141414] rounded-lg shadow-lg p-6 mb-6 border border-[#2A2A2A]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Student Portal
            </h2>
            <p className="text-sm text-[#808080] font-mono">
              {walletAddress}
            </p>
          </div>
          {activeTab === 'credentials' && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setView3D(!view3D)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center ${
                  view3D
                    ? 'bg-[#FFC700] text-black shadow-lg'
                    : 'bg-[#1A1A1A] text-[#BFBFBF] hover:bg-[#2A2A2A]'
                }`}
              >
                <Box className="w-4 h-4 mr-2" />
                {view3D ? '3D View' : 'Switch to 3D'}
              </button>
              <button
                onClick={() => loadCredentials(walletAddress)}
                className="text-[#FFC700] hover:opacity-80 font-medium text-sm flex items-center"
              >
                Refresh
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-b border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'credentials'
                ? 'border-b-2 border-[#FFC700] text-[#FFC700]'
                : 'text-[#BFBFBF] hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            My Credentials
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'profile'
                ? 'border-b-2 border-[#FFC700] text-[#FFC700]'
                : 'text-[#BFBFBF] hover:text-white'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profile
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <StudentProfile walletAddress={walletAddress} />
      ) : loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 text-[#FFC700] animate-spin" />
        </div>
      ) : credentials.length === 0 ? (
        <div className="bg-[#141414] rounded-lg shadow-lg p-12 text-center border border-[#2A2A2A]">
          <FileText className="w-16 h-16 text-[#808080] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No Credentials Found
          </h3>
          <p className="text-[#BFBFBF]">
            You don't have any academic credentials yet
          </p>
        </div>
      ) : view3D ? (
        <Credential3DShowcase
          credentials={credentials}
          dbCredentials={dbCredentials}
          onShare={(cred) => setShareCredential(cred)}
          onViewHistory={(id) => setViewAuditCredential(id)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {credentials.map((credential) => (
            <div
              key={credential.tokenId}
              className={`bg-[#141414] rounded-lg shadow-lg overflow-hidden border-2 transition-all ${
                credential.revoked
                  ? 'border-red-500 opacity-75'
                  : 'border-[#2A2A2A] hover:shadow-xl'
              }`}
            >
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <FileText className="w-8 h-8" />
                  {credential.revoked && (
                    <span className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">
                      REVOKED
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {credential.degree}
                </h3>
                <div className="flex items-center text-[#BFBFBF] text-sm">
                  <Building2 className="w-4 h-4 mr-1" />
                  <span className="truncate">
                    {credential.institution}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-[#BFBFBF]">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      Issued: {formatDate(credential.issueDate)}
                    </span>
                  </div>
                  <div className="text-xs text-[#808080]">
                    Token ID: {credential.tokenId}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <a
                      href={getIPFSUrl(credential.ipfsHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-[#1A1A1A] text-[#BFBFBF] py-2 px-3 rounded-lg text-sm font-medium hover:bg-[#2A2A2A] transition-colors flex items-center justify-center"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </a>
                    <button
                      onClick={() => setSelectedCredential(credential)}
                      className="flex-1 bg-[#FFC700] text-black py-2 px-3 rounded-lg text-sm font-medium hover:opacity-90 transition-colors flex items-center justify-center"
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      QR
                    </button>
                    <button
                      onClick={() => {
                        const dbCred = dbCredentials.find(
                          c => c.token_id === credential.tokenId
                        );
                        if (dbCred) setViewAuditCredential(dbCred.id);
                      }}
                      className="flex-1 bg-[#1A1A1A] text-[#BFBFBF] py-2 px-3 rounded-lg text-sm font-medium hover:bg-[#2A2A2A] transition-colors flex items-center justify-center"
                    >
                      <History className="w-4 h-4 mr-1" />
                      History
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCredential && (
        <QRCodeModal
          credential={selectedCredential}
          onClose={() => setSelectedCredential(null)}
        />
      )}

      {shareCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#2A2A2A]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  Share Credential
                </h2>
                <button
                  onClick={() => setShareCredential(null)}
                  className="text-[#808080] hover:text-white"
                >
                  ✕
                </button>
              </div>
              <CredentialSharing
                credentialId={shareCredential.id}
                credentialTitle={shareCredential.degree}
              />
            </div>
          </div>
        </div>
      )}

      {viewAuditCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#2A2A2A]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  Credential History
                </h2>
                <button
                  onClick={() => setViewAuditCredential(null)}
                  className="text-[#808080] hover:text-white"
                >
                  ✕
                </button>
              </div>
              <AuditTrail credentialId={viewAuditCredential} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
