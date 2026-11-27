import { useEffect, useMemo, useRef, useState } from 'react';
import AdminTeacherProfileEditor from './teacher/AdminTeacherProfileEditor';
import axiosClient from '../services/axiosClient';

const TeacherProfileEditorBridge = ({ teacher, onClose, onUpdated, isSuperAdmin }) => {
    const [notice, setNotice] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => () => window.clearTimeout(timerRef.current), []);

    const toast = useMemo(() => {
        const show = (type, message) => {
            window.clearTimeout(timerRef.current);
            setNotice({ type, message });
            timerRef.current = window.setTimeout(() => setNotice(null), 4500);
        };
        return {
            success: (message) => show('success', message),
            error: (message) => show('error', message)
        };
    }, []);

    return (
        <>
            {notice && (
                <div
                    role="status"
                    className={`fixed right-4 top-4 z-[70] flex max-w-md items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm font-bold shadow-xl ${
                        notice.type === 'success'
                            ? 'border-[#D4A843]/50 bg-[#060D1F] text-[#F7E09A]'
                            : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                >
                    <span>{notice.message}</span>
                    <button type="button" onClick={() => setNotice(null)} aria-label="বার্তা বন্ধ করুন">×</button>
                </div>
            )}
            <AdminTeacherProfileEditor
                teacher={teacher}
                onClose={onClose}
                onUpdated={onUpdated}
                isSuperAdmin={isSuperAdmin}
                toast={toast}
                apiClient={axiosClient}
            />
        </>
    );
};

export default TeacherProfileEditorBridge;
