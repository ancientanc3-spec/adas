import { useState, useEffect } from 'react';
import { Upload, CheckCircle, Loader2, TrendingUp, Award, Users, Tabs, Lock, CreditCard } from 'lucide-react';
import { IssuanceFormData } from '../types/credential';
import { uploadToIPFS } from '../utils/ipfs';
import { issueCredential, connectWallet, switchToSepolia } from '../utils/blockchain';
import { saveCredential, getInstitutionStats } from '../utils/supabase';
import { checkUserSubscription } from '../utils/subscriptions';
import InstitutionRegistration from './InstitutionRegistration';
import InstitutionStudents from './InstitutionStudents';
import PricingModal from './PricingModal';

export default function InstitutionDashboard() {
  const [activeTab, setActiveTab] = useState<'issue' | 'register' | 'students'>('issue');
  const [formData, setFormData] = useState<IssuanceFormData>({
    studentName: '',
    studentAddress: '',
    degree: '',
    institution: '',
    graduationYear: '',
    document: null,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ tokenId: string; txHash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalIssued: 0, totalRevoked: 0, recentIssued: 0 });
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => {
    initWallet();
  }, []);

  useEffect(() => {
    if (walletAddress) {
      loadStats();
      checkAccess();
    }
  }, [walletAddress]);

  const initWallet = async () => {
    const address = await connectWallet();
    if (address) {
      setWalletAddress(address);
      await switchToSepolia();
    }
  };

  const checkAccess = async () => {
    if (!walletAddress) return;
    setCheckingAccess(true);
    const { hasAccess: access } = await checkUserSubscription(walletAddress, 'institution');
    setHasAccess(access);
    setCheckingAccess(false);
  };

  const loadStats = async () => {
    if (walletAddress) {
      const institutionStats = await getInstitutionStats(walletAddress);
      setStats(institutionStats);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, document: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      if (!formData.document) throw new Error('Please upload a document');
      if (!formData.studentAddress.match(/^0x[a-fA-F0-9]{40}$/)) throw new Error('Invalid Ethereum address');

      const ipfsHash = await uploadToIPFS(formData.document);
      const result = await issueCredential(
        formData.studentAddress,
        ipfsHash,
        `${formData.degree} (${formData.graduationYear})`,
        formData.institution
      );

      if (walletAddress) {
        await saveCredential(
          result.tokenId,
          formData.studentAddress,
          formData.institution,
          walletAddress,
          `${formData.degree} (${formData.graduationYear})`,
          ipfsHash,
          new Date()
        );
        await loadStats();
      }

      setSuccess(result);
      setFormData({
        studentName: '',
        studentAddress: '',
        degree: '',
        institution: '',
        graduationYear: '',
        document: null,
      });

      const fileInput = document.getElementById('document-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to issue credential');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="max-w-6xl mx-auto bg-black">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!hasAccess && walletAddress) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-[#111] to-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400/10 rounded-full mb-4">
            <Lock className="w-8 h-8 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Subscription Required</h2>
          <p className="text-gray-400 mb-6">
            To issue credentials, you need an active subscription plan.
          </p>
          <button
            onClick={() => setShowPricing(true)}
            className="px-6 py-3 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-300 transition"
          >
            <CreditCard className="w-5 h-5 mr-2 inline" />
            View Pricing Plans
          </button>
        </div>
        {showPricing && walletAddress && (
          <PricingModal
            userType="institution"
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

  return (
    <div className="max-w-6xl mx-auto text-white">
      {walletAddress && activeTab === 'issue' && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Issued', value: stats.totalIssued, icon: Award },
            { label: 'Recent (30 days)', value: stats.recentIssued, icon: TrendingUp },
            { label: 'Active', value: stats.totalIssued - stats.totalRevoked, icon: Users },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-br from-[#111] to-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-6">
              <p className="text-sm text-gray-400 mb-1">{item.label}</p>
              <p className="text-3xl font-bold text-white">{item.value}</p>
              <item.icon className="w-6 h-6 text-yellow-400 mt-4" />
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 flex gap-2 border-b border-[#1f1f1f]">
        {['issue', 'students', 'register'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 font-semibold ${
              activeTab === tab
                ? 'border-b-2 border-yellow-400 text-yellow-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'issue' ? 'Issue Credential' : tab === 'students' ? 'Registered Students' : 'Authorization Request'}
          </button>
        ))}
      </div>

      {activeTab === 'issue' && (
        <div className="bg-gradient-to-br from-[#111] to-[#0b0b0b] border border-[#1f1f1f] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Issue Academic Credential</h2>

          {success && (
            <div className="mb-6 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
              <p className="text-yellow-300">Credential Issued. Token ID: {success.tokenId}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {['studentName', 'studentAddress', 'institution', 'degree', 'graduationYear'].map(field => (
              <input
                key={field}
                type="text"
                required
                value={(formData as any)[field]}
                onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                placeholder={field}
                className="w-full px-4 py-2 bg-black border border-[#1f1f1f] rounded-lg text-white focus:border-yellow-400 focus:ring-0"
              />
            ))}

            <input type="file" onChange={handleFileChange} className="text-gray-400" />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-300"
            >
              {loading ? 'Issuing...' : 'Issue Credential'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'students' && walletAddress && <InstitutionStudents institutionAddress={walletAddress} />}
      {activeTab === 'register' && <InstitutionRegistration />}
    </div>
  );
}
