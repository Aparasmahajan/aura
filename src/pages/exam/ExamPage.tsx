import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExamInterface } from '../../exam/components/ExamInterface';
import { ResultScreen } from '../../exam/components/ResultScreen';
import { FullscreenManager } from '../../exam/components/FullscreenManager';
import { ViolationModal } from '../../exam/components/ViolationModal';
import { ExamData, Answer } from '../../exam/types/exam';
import { loadExamData, EXAM_API_BASE } from '../../exam/utils/examUtils';

type ExamState = 'loading' | 'exam' | 'result' | 'error';

const generateSessionKey = (name: string, examCode: string): string => {
  const ts       = Date.now();
  const safeName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  return `${safeName}_${examCode}_${ts}`;
};

const decodeJwtPayload = (token: string): Record<string, any> | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64  = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const LS_KEY = 'qs_exam_token';

export default function ExamPage() {
  const navigate = useNavigate();

  const [examState, setExamState]         = useState<ExamState>('loading');
  const [errorMsg, setErrorMsg]           = useState('');
  const [examData, setExamData]           = useState<ExamData | null>(null);
  const [studentName, setStudentName]     = useState('');
  const [studentEmail, setStudentEmail]   = useState('');
  const [jwtJti, setJwtJti]               = useState('');
  const [sessionKey, setSessionKey]       = useState('');
  const [rawJwtToken, setRawJwtToken]     = useState('');
  const [violations, setViolations]       = useState(0);
  const [examPhase, setExamPhase]         = useState<'setup' | 'disclaimer' | 'active'>('setup');
  const [examStartTime, setExamStartTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [pendingAnswers, setPendingAnswers]   = useState<Answer[]>([]);
  const [pendingOrderMap, setPendingOrderMap] = useState<Record<string, number>>({});
  const [resultData, setResultData] = useState<{ score: number; totalMarks: number; details: any[] } | null>(null);

  const suppressUntil = useRef<number>(0);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setExamState('error');
  };

  const startExamFromToken = async (token: string) => {
    const payload = decodeJwtPayload(token);
    if (!payload) { showError('Invalid invite link.'); return; }

    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem(LS_KEY);
      showError('This exam link has expired. Please contact your administrator.');
      return;
    }

    if (payload.nbf && Date.now() / 1000 < payload.nbf) {
      const opensOn = new Date(payload.nbf * 1000).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
      showError(`This exam link is not yet active. It opens on ${opensOn}.`);
      return;
    }

    const { jti, sub: email, name, examCode } = payload;
    if (!examCode) { showError('Invalid invite link: missing exam code.'); return; }

    try {
      const usedRes  = await fetch(`${EXAM_API_BASE}/api/exam/check-token/${jti}`);
      const usedData = await usedRes.json();

      if (usedData.used) {
        const sameSession = !!localStorage.getItem('qs_exam_session_meta');
        if (!sameSession) {
          localStorage.removeItem(LS_KEY);
          localStorage.removeItem('qs_exam_answers');
          localStorage.removeItem('qs_exam_order_map');
          localStorage.removeItem('qs_exam_session_meta');
          showError('This exam has already been submitted. Please contact your administrator if you believe this is a mistake.');
          return;
        }
      }

      const examDataObj = await loadExamData(examCode);
      if (!examDataObj) { showError('Failed to load exam. Please try again.'); return; }

      // Crash recovery
      const crashAnswersRaw = localStorage.getItem('qs_exam_answers');
      const crashMetaRaw    = localStorage.getItem('qs_exam_session_meta');
      if (crashAnswersRaw && crashMetaRaw) {
        const crashAnswers:  Answer[]               = JSON.parse(crashAnswersRaw);
        const crashOrderMap: Record<string, number> = JSON.parse(localStorage.getItem('qs_exam_order_map') ?? '{}');
        const crashMeta: Record<string, string>     = JSON.parse(crashMetaRaw);

        ['qs_exam_answers', 'qs_exam_order_map', 'qs_exam_session_meta', LS_KEY]
          .forEach(k => localStorage.removeItem(k));

        setExamData(examDataObj);
        setStudentName(crashMeta.studentName ?? '');
        setIsSubmitting(true);

        const res  = await fetch(`${EXAM_API_BASE}/api/result/save`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionKey:       crashMeta.sessionKey,
            studentName:      crashMeta.studentName,
            studentEmail:     crashMeta.studentEmail || undefined,
            jti:              crashMeta.jwtJti       || undefined,
            examCode:         examDataObj.examCode,
            examTitle:        examDataObj.examTitle,
            answers:          crashAnswers,
            questionOrderMap: crashOrderMap,
            startedAt:        crashMeta.startTime    || null,
          }),
        });
        const serverData = await res.json();
        setResultData({ score: serverData.score ?? 0, totalMarks: serverData.totalMarks ?? 0, details: serverData.details ?? [] });
        setIsSubmitting(false);
        setExamState('result');
        return;
      }

      // Normal exam start
      const sk        = generateSessionKey(name ?? 'student', examCode);
      const startTime = new Date().toISOString();

      localStorage.setItem('qs_exam_session_meta', JSON.stringify({
        sessionKey:   sk,
        studentName:  name  ?? '',
        studentEmail: email ?? '',
        jwtJti:       jti   ?? '',
        startTime,
      }));

      setStudentName(name ?? '');
      setStudentEmail(email ?? '');
      setJwtJti(jti ?? '');
      setRawJwtToken(token);
      setExamData(examDataObj);
      setSessionKey(sk);
      setViolations(0);
      setExamStartTime(startTime);
      setExamState('exam');
    } catch {
      showError('Failed to load exam. Please check your connection and try again.');
    }
  };

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const urlToken = params.get('usr');

    if (urlToken) {
      localStorage.setItem(LS_KEY, urlToken);
      window.history.replaceState({}, '', window.location.pathname);
      startExamFromToken(urlToken);
      return;
    }

    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const payload = decodeJwtPayload(stored);
      if (!payload || (payload.exp && Date.now() / 1000 > payload.exp)) {
        localStorage.removeItem(LS_KEY);
        showError('Your exam link has expired. Please contact your administrator.');
        return;
      }
      startExamFromToken(stored);
      return;
    }

    // No token at all
    showError('No exam invitation found. Please use the link sent by your administrator.');
  }, []);

  // Beacon on unload
  useEffect(() => {
    if (examState !== 'exam' || examPhase !== 'active' || !examData) return;
    const handleUnload = () => {
      const savedAnswers:  Answer[]               = JSON.parse(localStorage.getItem('qs_exam_answers') ?? '[]');
      const savedOrderMap: Record<string, number> = JSON.parse(localStorage.getItem('qs_exam_order_map') ?? '{}');
      const blob = new Blob([JSON.stringify({
        sessionKey, studentName, studentEmail: studentEmail || undefined,
        jti: jwtJti || undefined, examCode: examData.examCode, examTitle: examData.examTitle,
        answers: savedAnswers, questionOrderMap: savedOrderMap, startedAt: examStartTime,
      })], { type: 'application/json' });
      navigator.sendBeacon(`${EXAM_API_BASE}/api/result/save`, blob);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [examState, examPhase, examData, sessionKey, studentName, studentEmail, jwtJti, examStartTime]);

  const handleViolation = () => {
    if (Date.now() < suppressUntil.current) return;
    setViolations((v) => {
      const newCount = v + 1;
      if (newCount >= (examData?.maxViolations ?? 3)) {
        setPendingAnswers([]);
        setPendingOrderMap({});
        setShowViolationModal(true);
      }
      return newCount;
    });
  };

  const handleViolationAcknowledge = () => {
    setShowViolationModal(false);
    doSubmit(pendingAnswers, pendingOrderMap);
  };

  const handleExamSubmit = (answers: Answer[], questionOrderMap: Record<string, number> = {}) => {
    doSubmit(answers, questionOrderMap);
  };

  const doSubmit = async (answers: Answer[], questionOrderMap: Record<string, number>) => {
    if (!examData) return;
    if (document.fullscreenElement) document.exitFullscreen();
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem('qs_exam_answers');
    localStorage.removeItem('qs_exam_order_map');
    localStorage.removeItem('qs_exam_session_meta');
    setIsSubmitting(true);
    try {
      const res  = await fetch(`${EXAM_API_BASE}/api/result/save`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionKey, studentName, studentEmail: studentEmail || undefined,
          jti: jwtJti || undefined, examCode: examData.examCode, examTitle: examData.examTitle,
          answers, questionOrderMap, startedAt: examStartTime,
        }),
      });
      const data = await res.json();
      setResultData({ score: data.score ?? 0, totalMarks: data.totalMarks ?? 0, details: data.details ?? [] });
    } catch {
      setResultData({ score: 0, totalMarks: 0, details: [] });
    } finally {
      setIsSubmitting(false);
      setExamState('result');
    }
  };

  const handleDone = () => {
    navigate(-1);
  };

  // Loading
  if (examState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-xs w-full">
          <svg className="animate-spin w-12 h-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-lg font-bold text-gray-800">Loading exam…</p>
        </div>
      </div>
    );
  }

  // Error
  if (examState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Cannot Start Exam</h2>
          <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-900 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Result
  if (examState === 'result' && examData && resultData) {
    return (
      <ResultScreen
        examData={examData} studentName={studentName}
        score={resultData.score} totalMarks={resultData.totalMarks}
        details={resultData.details} onDone={handleDone}
      />
    );
  }

  // Active exam
  return (
    <FullscreenManager examActive={examState === 'exam' && examPhase === 'active'} onViolation={handleViolation}>

      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-xs w-full">
            <svg className="animate-spin w-12 h-12 text-blue-600 mx-auto mb-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-lg font-bold text-gray-800 mb-1">Submitting…</p>
            <p className="text-sm text-gray-500">Please wait while your answers are saved.</p>
          </div>
        </div>
      )}

      {examState === 'exam' && examData && (
        <ExamInterface
          examData={examData} studentName={studentName} studentEmail={studentEmail}
          sessionKey={sessionKey} jwtToken={rawJwtToken} isJwtMode
          onSubmit={handleExamSubmit} onViolation={handleViolation}
          onSuppressViolations={(ms) => { suppressUntil.current = Date.now() + ms; }}
          onPhaseActive={() => setExamPhase('active')} violations={violations}
        />
      )}

      {showViolationModal && examData && (
        <ViolationModal
          violations={examData.maxViolations ?? 3}
          maxViolations={examData.maxViolations ?? 3}
          onAcknowledge={handleViolationAcknowledge}
        />
      )}
    </FullscreenManager>
  );
}
