/**
 * ARDM Enterprise ERP — Military-Grade Route Security Guards (Step 12)
 * Enforces:
 * 1. Authentication Check (Redirects to /login if unauthenticated)
 * 2. Registration Approval Check (Blocks Pending/Rejected accounts with clear Bengali notice)
 * 3. Active Account Status Check (Blocks deactivated staff accounts)
 * 4. Strict Role-Based Access Control (SuperAdmin / Admin vs Teacher)
 */

import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
    ShieldAlert,
    Clock,
    UserX,
    ArrowLeft,
    LogOut,
    LockKeyhole
} from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { INSTITUTION_INFO } from '@constants/app.constants';
import { Button, Badge } from '@components/ui';

/**
 * সেশন যাচাই চলাকালীন রাজকীয় ফুল-স্ক্রিন লোডার
 */
function SessionVerificationLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-paper">
            <div className="ledger-surface p-8 max-w-sm w-full text-center animate-pop-in">
                <div className="madrasah-crest mx-auto mb-4 animate-pulse">
                    {INSTITUTION_INFO.crestLetterBng}
                </div>
                <h2 className="font-bengali text-lg font-bold text-emerald-deep">
                    নিরাপত্তা সেশন যাচাই করা হচ্ছে...
                </h2>
                <p className="font-mono text-xs text-ink-muted mt-1">
                    Verifying Encrypted JWT Credentials
                </p>
            </div>
        </div>
    );
}

/**
 * ১. প্রোটেক্টেড রাউট গার্ড (শুধুমাত্র অনুমোদিত ও বৈধ রোলের ইউজারদের জন্য)
 */
export function ProtectedRoute({ allowedRoles = [], children }) {
    const {
        user,
        isAuthenticated,
        isInitializing,
        defaultDashboardPath,
        logout
    } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    if (isInitializing) {
        return <SessionVerificationLoader />;
    }

    // ক. লগইন করা না থাকলে সরাসরি /login পেজে পাঠিয়ে দেওয়া
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    // খ. পাবলিক সেল্ফ-রেজিস্ট্রেশন করার পর যদি এখনো অ্যাডমিন Approve না করে থাকেন
    if (user.registrationStatus === 'Pending') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-paper">
                <div className="ledger-surface p-8 max-w-lg w-full text-center animate-pop-in">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gold-subtle border-2 border-gold flex items-center justify-center text-gold-deep">
                        <Clock className="w-8 h-8" />
                    </div>
                    <Badge variant="gold" size="md" dot className="mb-2">
                        APPROVAL PENDING · অনুমোদনের অপেক্ষায়
                    </Badge>
                    <h2 className="font-bengali text-2xl font-bold text-emerald-deep">
                        আপনার নিবন্ধনটি অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে
                    </h2>
                    <p className="font-bengali text-xs sm:text-sm text-ink-soft mt-2 leading-relaxed">
                        সম্মানিত <b>{user.fullNameBng}</b> (ID: <b className="font-mono">{user.teacherCode}</b>), আপনার অনলাইন নিবন্ধন ফর্মটি সফলভাবে জমা হয়েছে। সুপারিনটেনডেন্ট বা সিস্টেম অ্যাডমিন আপনার মূল বেতন ও বায়োমেট্রিক আইডি যাচাই করে <b>Approve</b> করলেই আপনার পোর্টাল ড্যাশবোর্ড সচল হয়ে যাবে।
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/register')}
                        >
                            <span className="font-bengali">ডিজিটাল রেজিস্ট্রি কার্ড দেখুন</span>
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            leftIcon={LogOut}
                            onClick={() => logout(true)}
                        >
                            <span className="font-bengali">লগআউট করুন</span>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // গ. অ্যাকাউন্ট যদি নিষ্ক্রিয় (isActive === false) করা থাকে
    if (user.isActive === false) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-paper">
                <div className="ledger-surface p-8 max-w-lg w-full text-center animate-pop-in">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-danger-bg border-2 border-danger/30 flex items-center justify-center text-danger">
                        <UserX className="w-8 h-8" />
                    </div>
                    <Badge variant="danger" size="md" dot className="mb-2">
                        ACCOUNT DEACTIVATED
                    </Badge>
                    <h2 className="font-bengali text-2xl font-bold text-danger">
                        আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় রয়েছে
                    </h2>
                    <p className="font-bengali text-xs sm:text-sm text-ink-soft mt-2 leading-relaxed">
                        প্রশাসনিক কারণে আপনার পোর্টাল অ্যাক্সেস সাময়িকভাবে বন্ধ রাখা হয়েছে। বিস্তারিত জানতে মাদ্রাসা অফিসে যোগাযোগ করুন।
                    </p>
                    <div className="mt-6">
                        <Button variant="danger" size="sm" leftIcon={LogOut} onClick={() => logout(true)}>
                            <span className="font-bengali">লগআউট করুন</span>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ঘ. রোল-বেসড অ্যাক্সেস কন্ট্রোল (যেমন Teacher হয়ে Admin পেজে ঢোকার চেষ্টা করলে)
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
                <div className="ledger-surface p-8 max-w-lg w-full text-center animate-pop-in">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-danger-bg border-2 border-danger/35 flex items-center justify-center text-danger animate-shake">
                        <LockKeyhole className="w-8 h-8" />
                    </div>

                    <Badge variant="danger" size="md" mono className="mb-2">
                        HTTP 403 · ACCESS RESTRICTED
                    </Badge>

                    <h2 className="font-bengali text-xl sm:text-2xl font-bold text-emerald-deep">
                        সংরক্ষিত এলাকা! আপনার প্রবেশাধিকার নেই
                    </h2>

                    <p className="font-bengali text-xs sm:text-sm text-ink-soft mt-2 leading-relaxed">
                        সম্মানিত <b>{user.fullNameBng}</b>, আপনার বর্তমান রোল হলো{' '}
                        <b className="font-mono text-emerald-deep">[{user.role}]</b>। এই পাতাটি শুধুমাত্র{' '}
                        <b className="font-mono text-danger">[{allowedRoles.join(' / ')}]</b> রোলের ব্যবহারকারীদের জন্য সংরক্ষিত।
                    </p>

                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <Button
                            variant="emerald"
                            size="md"
                            leftIcon={ArrowLeft}
                            onClick={() => navigate(defaultDashboardPath, { replace: true })}
                        >
                            <span className="font-bengali">আমার নিজস্ব ড্যাশবোর্ডে ফিরে যান</span>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return children;
}

/**
 * ২. পাবলিক-অনলি গার্ড (লগইন করা অবস্থায় কেউ /login পেজে গেলে সরাসরি তার ড্যাশবোর্ডে পাঠিয়ে দেবে)
 */
export function PublicOnlyRoute({ children }) {
    const { isAuthenticated, isInitializing, defaultDashboardPath } = useAuth();

    if (isInitializing) {
        return <SessionVerificationLoader />;
    }

    if (isAuthenticated) {
        return <Navigate to={defaultDashboardPath} replace />;
    }

    return children;
}

export default ProtectedRoute;
