import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useLoginMutation } from '../REDUX_FEATURES/REDUX_SLICES/Auth_api/authApi';
import {
  selectIsAuthenticated,
  selectSessionStatus,
} from '../REDUX_FEATURES/REDUX_SLICES/Auth_api/authSlice';
import { syncCurrentUserFromAuth } from '../Components/roles';
import { getErrorMessage } from '../utils/getErrorMessage';
import mapBg from '../assets/map.png';
import rImg from '../assets/r.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const sessionStatus = useSelector(selectSessionStatus);
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (sessionStatus === 'ready' && isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ email, password }).unwrap();
      syncCurrentUserFromAuth(res.data.user);
      toast.success('Welcome back');
      navigate('/app');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Login failed'));
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans antialiased">
      <style>{`
        /* Continuous infinity dash loop for network connections */
        @keyframes crmInfiniteDash {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }

        /* Continuous floating flight / pulse motion along paths */
        @keyframes crmPulseTravel {
          0% { offset-distance: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }

        @keyframes crmFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .crm-continuous-line {
          stroke-dasharray: 12 8;
          animation: crmInfiniteDash 25s linear infinite;
        }

        .crm-fade-1 { opacity: 0; animation: crmFadeUp 0.6s ease-out 0.1s forwards; }
        .crm-fade-2 { opacity: 0; animation: crmFadeUp 0.6s ease-out 0.25s forwards; }
        .crm-fade-3 { opacity: 0; animation: crmFadeUp 0.6s ease-out 0.4s forwards; }

        .crm-floating-input:-webkit-autofill,
        .crm-floating-input:-webkit-autofill:hover,
        .crm-floating-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px white inset !important;
          -webkit-text-fill-color: #0f172a !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .crm-floating-label {
          left: 44px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1;
          line-height: 1;
          transition: all 0.18s ease;
        }

        .crm-floating-input:focus ~ .crm-floating-label,
        .crm-floating-input:not(:placeholder-shown) ~ .crm-floating-label,
        .crm-floating-input:-webkit-autofill ~ .crm-floating-label {
          top: 0;
          left: 12px;
          transform: translateY(-50%);
          font-size: 0.72rem;
          font-weight: 600;
          color: #2563eb;
          background: rgba(255, 255, 255, 0.96);
          padding: 0 6px;
        }
      `}</style>

      {/* Hero panel — brand side with wide clip path */}
      <div
        className="relative hidden w-[58%] flex-col justify-between overflow-hidden bg-[#070D18] px-16 py-12 lg:flex"
        style={{ clipPath: 'polygon(0 0, 100% 0, 91% 100%, 0 100%)' }}
      >
        {/* World Map Overlay */}
        <img
          src={mapBg}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.14]"
        />

        {/* SPACED OUT & LARGER DIGITAL DOT PATTERN */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #38BDF8 2.5px, transparent 2.5px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Full-panel airline network */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <svg
            className="h-full w-full"
            viewBox="0 0 1200 800"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#818CF8" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="lineGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Major airline routes - more tilted sweeping curves */}
            <path className="crm-continuous-line" d="M 20 700 C 150 200, 400 450, 600 280 S 900 50, 1150 100" stroke="url(#lineGrad1)" strokeWidth="2.5" fill="none" />
            <path className="crm-continuous-line" d="M 60 80 C 200 550, 500 150, 750 400 S 1050 700, 1180 620" stroke="url(#lineGrad2)" strokeWidth="2" fill="none" />
            <path className="crm-continuous-line" d="M 600 280 C 700 550, 850 600, 1050 480" stroke="#2DD4BF" strokeOpacity="0.4" strokeWidth="1.8" fill="none" />
            <path className="crm-continuous-line" d="M 60 80 C 300 200, 500 350, 1050 480" stroke="#38BDF8" strokeOpacity="0.35" strokeWidth="1.5" fill="none" />
            <path className="crm-continuous-line" d="M 280 50 C 450 180, 600 100, 750 400 S 1000 200, 1130 250" stroke="url(#lineGrad3)" strokeWidth="1.5" fill="none" />
            <path className="crm-continuous-line" d="M 20 700 C 200 750, 450 680, 700 620 S 900 550, 1050 480" stroke="#818CF8" strokeOpacity="0.25" strokeWidth="1.2" fill="none" />
            <path className="crm-continuous-line" d="M 130 480 C 300 150, 500 280, 750 400" stroke="#2DD4BF" strokeOpacity="0.3" strokeWidth="1.2" fill="none" />
            <path className="crm-continuous-line" d="M 1150 100 C 1170 300, 1100 400, 1050 480" stroke="#38BDF8" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
            <path className="crm-continuous-line" d="M 280 50 C 200 300, 100 500, 20 700" stroke="#2DD4BF" strokeOpacity="0.2" strokeWidth="1" fill="none" />

            {/* Node: JFK / NYC */}
            <g transform="translate(20, 700)">
              <circle r="8" fill="#070D18" stroke="#2DD4BF" strokeWidth="3" />
              <circle r="3.5" fill="#2DD4BF" />
              <text x="16" y="5" fill="#94A3B8" fontSize="13" fontFamily="monospace">JFK / NYC</text>
            </g>

            {/* Node: LHR / LON - Main Hub */}
            <g transform="translate(600, 280)">
              <circle r="11" fill="#070D18" stroke="#38BDF8" strokeWidth="3" />
              <circle r="5" fill="#38BDF8" />
            </g>

            {/* Node: DXB / UAE */}
            <g transform="translate(1150, 100)">
              <circle r="9" fill="#070D18" stroke="#2DD4BF" strokeWidth="3" />
              <circle r="4" fill="#2DD4BF" />
              <text x="-80" y="-16" fill="#94A3B8" fontSize="13" fontFamily="monospace">DXB / UAE</text>
            </g>

            {/* Node: CDG / PAR */}
            <g transform="translate(280, 50)">
              <circle r="7" fill="#070D18" stroke="#818CF8" strokeWidth="2.5" />
              <circle r="3" fill="#818CF8" />
              <text x="14" y="5" fill="#94A3B8" fontSize="12" fontFamily="monospace">CDG / PAR</text>
            </g>

            {/* Node: FRA / DEU */}
            <g transform="translate(750, 400)">
              <circle r="7" fill="#070D18" stroke="#818CF8" strokeWidth="2.5" />
              <circle r="3" fill="#818CF8" />
              <text x="14" y="5" fill="#94A3B8" fontSize="12" fontFamily="monospace">FRA / DEU</text>
            </g>

            {/* Node: SIN / SGP */}
            <g transform="translate(1050, 480)">
              <circle r="8" fill="#070D18" stroke="#38BDF8" strokeWidth="2.5" />
              <circle r="3.5" fill="#38BDF8" />
              <text x="-80" y="20" fill="#94A3B8" fontSize="13" fontFamily="monospace">SIN / SGP</text>
            </g>

            {/* Node: LAX / USA */}
            <g transform="translate(60, 80)">
              <circle r="7" fill="#070D18" stroke="#2DD4BF" strokeWidth="2.5" />
              <circle r="3" fill="#2DD4BF" />
              <text x="14" y="5" fill="#94A3B8" fontSize="12" fontFamily="monospace">LAX / USA</text>
            </g>

            {/* Node: BOM / IND */}
            <g transform="translate(1130, 250)">
              <circle r="6" fill="#070D18" stroke="#2DD4BF" strokeWidth="2" />
              <circle r="2.5" fill="#2DD4BF" />
              <text x="-80" y="-10" fill="#94A3B8" fontSize="12" fontFamily="monospace">BOM / IND</text>
            </g>

            {/* Node: GRU / BRA */}
            <g transform="translate(130, 480)">
              <circle r="6" fill="#070D18" stroke="#818CF8" strokeWidth="2" />
              <circle r="2.5" fill="#818CF8" />
              <text x="14" y="5" fill="#94A3B8" fontSize="11" fontFamily="monospace">GRU / BRA</text>
            </g>

            {/* Node: NRT / JPN */}
            <g transform="translate(1180, 620)">
              <circle r="7" fill="#070D18" stroke="#38BDF8" strokeWidth="2.5" />
              <circle r="3" fill="#38BDF8" />
              <text x="-80" y="-10" fill="#94A3B8" fontSize="12" fontFamily="monospace">NRT / JPN</text>
            </g>

            {/* Small relay nodes */}
            <g transform="translate(700, 620)">
              <circle r="4" fill="#070D18" stroke="#2DD4BF" strokeWidth="1.5" />
              <circle r="1.5" fill="#2DD4BF" />
            </g>
            <g transform="translate(900, 350)">
              <circle r="4" fill="#070D18" stroke="#38BDF8" strokeWidth="1.5" />
              <circle r="1.5" fill="#38BDF8" />
            </g>
            <g transform="translate(400, 550)">
              <circle r="3.5" fill="#070D18" stroke="#818CF8" strokeWidth="1.5" />
              <circle r="1.5" fill="#818CF8" />
            </g>
          </svg>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-1 items-center justify-center px-8 py-12 lg:w-[42%]">
        <div className="w-full max-w-md">
          <div className="mb-4 flex flex-col items-center">
            <img src={rImg} alt="" className="h-20 w-auto object-contain" />
            <span className="mt-2 text-lg font-bold tracking-tight text-slate-900">
              Smart Travel Business
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Welcome back! Enter your authenticated credentials below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* FLOATING INPUT: EMAIL */}
            <div className="relative">
              <input
                id="login-email"
                type="email"
                required
                className="crm-floating-input peer w-full rounded-xl border border-slate-300 bg-transparent py-4 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder-transparent transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="Email Address"
              />
              <span className="pointer-events-none absolute left-4 top-4 text-slate-400 transition-colors peer-focus:text-blue-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 6.5A2.5 2.5 0 015.5 4h13A2.5 2.5 0 0121 6.5v11a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5v-11z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M4 6.5l8 6.2 8-6.2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <label
                htmlFor="login-email"
                className="crm-floating-label pointer-events-none absolute bg-white px-2 text-xs font-semibold text-slate-500 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-400"
              >
                Email Address
              </label>
            </div>

            {/* FLOATING INPUT: PASSWORD */}
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                className="crm-floating-input peer w-full rounded-xl border border-slate-300 bg-transparent py-4 pl-12 pr-12 text-sm font-medium text-slate-900 placeholder-transparent transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Password"
              />
              <span className="pointer-events-none absolute left-4 top-4 text-slate-400 transition-colors peer-focus:text-blue-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="5"
                    y="10.5"
                    width="14"
                    height="9"
                    rx="1.8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M8 10.5V7.8a4 4 0 118 0v2.7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
              <label
                htmlFor="login-password"
                className="crm-floating-label pointer-events-none absolute bg-white px-2 text-xs font-semibold text-slate-500 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-400"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 3l18 18M10.6 10.7a2.4 2.4 0 003.4 3.3M6.6 6.7C4.5 8.1 3 10 2.5 12c1.3 4 5.3 7 9.5 7 1.6 0 3.1-.4 4.4-1.2M9.9 4.3A10.8 10.8 0 0112 4c4.2 0 8.2 3 9.5 7-.4 1.3-1.1 2.6-2 3.6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M2.5 12C3.8 8 7.8 5 12 5s8.2 3 9.5 7c-1.3 4-5.3 7-9.5 7s-8.2-3-9.5-7z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="2.6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && (
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="3"
                    opacity="0.25"
                  />
                  <path
                    d="M21 12a9 9 0 00-9-9"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {isLoading ? 'Authenticating…' : 'Login'}
            </button>
          </form>

          <p className="mt-10 text-center text-xs font-mono text-slate-400">
          © {new Date().getFullYear()} TravelCRM LLP.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
// down code is working but upper code have some inhance ui 


// import React, { useState } from 'react';
// import { Navigate, useNavigate } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import toast from 'react-hot-toast';
// import { useLoginMutation } from '../REDUX_FEATURES/REDUX_SLICES/Auth_api/authApi';
// import {
//   selectIsAuthenticated,
//   selectSessionStatus,
// } from '../REDUX_FEATURES/REDUX_SLICES/Auth_api/authSlice';
// import { syncCurrentUserFromAuth } from '../Components/roles';
// import { getErrorMessage } from '../utils/getErrorMessage';

// const LoginPage = () => {
//   const navigate = useNavigate();
//   const isAuthenticated = useSelector(selectIsAuthenticated);
//   const sessionStatus = useSelector(selectSessionStatus);
//   const [login, { isLoading }] = useLoginMutation();
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');

//   if (sessionStatus === 'ready' && isAuthenticated) {
//     return <Navigate to="/app" replace />;
//   }

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const res = await login({ email, password }).unwrap();
//       syncCurrentUserFromAuth(res.data.user);
//       toast.success('Welcome back');
//       navigate('/app');
//     } catch (err) {
//       toast.error(getErrorMessage(err, 'Login failed'));
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
//       <form
//         onSubmit={handleSubmit}
//         className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg"
//       >
//         <h1 className="text-2xl font-semibold text-slate-900">Travel CRM</h1>
//         <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>

//         <label className="mt-6 block text-sm">
//           <span className="mb-1 block text-slate-600">Email</span>
//           <input
//             type="email"
//             required
//             className="w-full rounded-md border border-slate-300 px-3 py-2"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             autoComplete="username"
//           />
//         </label>

//         <label className="mt-4 block text-sm">
//           <span className="mb-1 block text-slate-600">Password</span>
//           <input
//             type="password"
//             required
//             className="w-full rounded-md border border-slate-300 px-3 py-2"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             autoComplete="current-password"
//           />
//         </label>

//         <button
//           type="submit"
//           disabled={isLoading}
//           className="mt-6 w-full rounded-md bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
//         >
//           {isLoading ? 'Signing in…' : 'Sign in'}
//         </button>
//       </form>
//     </div>
//   );
// };

// export default LoginPage;
