import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { CONFIG } from '../config/systemConfig';

const LoginView = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const id = identifier.trim();
    if (!id) return setError("ফোন নম্বর অথবা টিচার কোড দিন");
    if (!/^(\d{11}|\d{10})$/.test(id)) return setError("১১ ডিজিটের ফোন নম্বর অথবা ১০ ডিজিটের টিচার কোড দিন");
    if (!pass) return setError("পাসওয়ার্ড দিন");
    setLoading(true);
    setError('');
    const result = await onLogin(id, pass);
    if (result && result.ok === false) setError(result.message || "লগিন ব্যর্থ হয়েছে");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-black text-center mb-2 text-slate-800">
          স্বাগতম
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">{CONFIG.APP_NAME}</p>

        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Phone / Teacher Code</label>
        <input 
          type="text"
          inputMode="numeric"
          maxLength={11}
          placeholder="01XXXXXXXXX / Teacher Code"
          className="w-full p-4 mb-4 bg-gray-50 border border-transparent focus:bg-white focus:border-slate-900 rounded-xl outline-none font-bold transition-all"
          value={identifier}
          onChange={e => setIdentifier(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Password</label>
        <input 
          type="password"
          placeholder="******"
          className="w-full p-4 mb-4 bg-gray-50 border border-transparent focus:bg-white focus:border-slate-900 rounded-xl outline-none font-bold transition-all"
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        {error && (
          <div className="bg-red-50 text-red-500 text-sm font-bold p-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle size={16}/> {error}
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 flex justify-center"
        >
          {loading ? <Loader2 className="animate-spin"/> : "Login"}
        </button>
       <div className="mt-5 space-y-3 text-center">

  <div className="flex items-center gap-2">
    <div className="flex-1 h-px bg-gray-200"></div>
    <span className="text-xs text-gray-400 font-bold">Quick Access</span>
    <div className="flex-1 h-px bg-gray-200"></div>
  </div>

  <div className="flex gap-3">
    
    <button
      onClick={() => window.location.href="/result"}
      className="flex-1 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm transition active:scale-95"
    >
      Result দেখুন
    </button>

    <button
      onClick={() => window.location.href="/student"}
      className="flex-1 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm transition active:scale-95"
    >
      শিক্ষার্থীর তথ্য
    </button>

  </div>

</div>


      </div>
    </div>
  );
};

export default LoginView;
