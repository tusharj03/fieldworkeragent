import React, { useState, useEffect } from 'react';
import { MicrophoneButton } from './components/MicrophoneButton';
import { ReportCard } from './components/ReportCard';
import { History } from './components/History';
import { Templates } from './components/Templates';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { RorkService } from './services/rork';
import { PdfService } from './services/pdf';
import { Activity, HardHat, AlertCircle, LayoutDashboard, FileText, Settings, History as HistoryIcon, Menu, X, Key, Save } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('GEMINI_API_KEY', apiKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="text-orange-500" />
            Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Google Gemini API Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full bg-slate-950 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Required for advanced AI analysis. Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">Google AI Studio</a>.
            </p>
          </div>

          <button
            onClick={handleSave}
            className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${saved
              ? 'bg-green-500 text-white'
              : 'bg-orange-600 hover:bg-orange-500 text-white'
              }`}
          >
            {saved ? (
              <>Saved Successfully!</>
            ) : (
              <>
                <Save size={18} />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const {
    isRecording,
    transcript,
    startRecording,
    stopRecording,
    clearTranscript,
    error: voiceError
  } = useVoiceRecognition();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'history', 'templates'

  const handleToggleRecording = () => {
    if (isRecording) {
      handleStopAndAnalyze();
    } else {
      setError(null);
      setReport(null);
      clearTranscript();
      startRecording();
    }
  };

  const handleSelectTemplate = (template) => {
    setActiveTemplate(template);
    setCurrentView('dashboard');
  };

  const handleStopAndAnalyze = async () => {
    stopRecording();
    if (!transcript.trim()) {
      setError("No speech detected. Please try again.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const context = activeTemplate ? `${activeTemplate.title}: ${activeTemplate.description}` : null;
      const result = await RorkService.analyzeTranscript(transcript, context);

      // Add ID and timestamp if missing
      const reportWithMeta = {
        ...result,
        id: Math.floor(Date.now() % 10000),
        timestamp: new Date().toISOString()
      };

      setReport(reportWithMeta);

      // Save to localStorage
      const savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
      localStorage.setItem('saved_reports', JSON.stringify([reportWithMeta, ...savedReports]));

    } catch (err) {
      console.error(err);
      setError("Failed to analyze transcript. Please check your connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const NavItem = ({ icon: Icon, label, view, onClick }) => (
    <div
      className={`nav-item ${currentView === view ? 'active bg-white/10 text-white' : ''} cursor-pointer hover:bg-white/5 transition-colors rounded-lg mx-2 p-3 flex items-center gap-3 text-slate-400 hover:text-white`}
      onClick={() => {
        setCurrentView(view);
        if (onClick) onClick();
        setIsSidebarOpen(false);
      }}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex overflow-hidden">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-950/50 border-r border-white/5 backdrop-blur-xl transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
              <HardHat size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Field Agent</h1>
              <p className="text-slate-500 text-xs font-medium tracking-wider uppercase">Pro Edition</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <NavItem icon={LayoutDashboard} label="Dashboard" view="dashboard" />
            <NavItem icon={HistoryIcon} label="History" view="history" />
            <NavItem icon={FileText} label="Templates" view="templates" />
            <NavItem icon={Settings} label="Settings" view="settings" onClick={() => setIsSettingsOpen(true)} />
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-slate-400">System Online</span>
              </div>
              <p className="text-xs text-slate-500">v2.4.0 (Stable)</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-16 border-b border-white/5 bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-6 lg:px-10 z-30">
          <button
            className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/50 border border-white/5 text-xs font-medium text-slate-400">
              <Activity size={14} className={isRecording ? "text-red-500 animate-pulse" : "text-slate-500"} />
              {isRecording ? "Recording Active" : "Ready to Capture"}
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-white/10" />
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-8 lg:p-10 pb-64">

          {currentView === 'dashboard' && (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Welcome / Status */}
              {!report && !isAnalyzing && (
                <div className="text-center py-12 animate-fade-in">
                  {activeTemplate ? (
                    <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-white/10 animate-scale-in">
                      <span className={`w-2 h-2 rounded-full ${activeTemplate.color.replace('text-', 'bg-')}`} />
                      <span className="text-sm font-medium text-slate-300">
                        Using Template: <span className="text-white">{activeTemplate.title}</span>
                      </span>
                      <button
                        onClick={() => setActiveTemplate(null)}
                        className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <X size={14} className="text-slate-400" />
                      </button>
                    </div>
                  ) : null}
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-glow">
                    {activeTemplate ? `Start ${activeTemplate.title} Report` : "Ready to Report?"}
                  </h2>
                  <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
                    {activeTemplate
                      ? `Follow the ${activeTemplate.title} workflow. Speak clearly to record key data points.`
                      : "Tap the microphone to start recording your incident report, safety log, or patient encounter."
                    }
                  </p>
                </div>
              )}

              {/* Transcript Area */}
              <div className={`
                glass-panel rounded-2xl p-6 md:p-8 transition-all duration-500
                ${transcript ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}
              `}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Transcript</span>
                  {isRecording && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                </div>
                <p className="text-lg md:text-xl leading-relaxed text-slate-200 font-light whitespace-pre-wrap">
                  {transcript}
                </p>
              </div>

              {/* Analysis Loading */}
              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
                  <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-lg font-medium text-slate-300">Analyzing Encounter...</p>
                  <p className="text-sm text-slate-500 mt-2">Extracting vitals, timeline, and key details</p>
                </div>
              )}

              {/* Error State */}
              {(error || voiceError) && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 animate-slide-up">
                  <AlertCircle size={20} />
                  <p>{error || voiceError}</p>
                </div>
              )}

              {/* Report Result */}
              {report && !isAnalyzing && (
                <div className="animate-slide-up">
                  <ReportCard
                    report={report}
                    onExport={() => PdfService.generateReport(report, transcript)}
                  />
                </div>
              )}

              {/* Explicit Spacer for Mic Button */}
              <div className="h-32 w-full" />
            </div>
          )}

          {currentView === 'history' && (
            <History onSelectReport={(savedReport) => {
              setReport(savedReport);
              setCurrentView('dashboard');
            }} />
          )}

          {currentView === 'templates' && (
            <Templates onSelectTemplate={handleSelectTemplate} />
          )}

        </div>

        {/* Floating Action Button Area - Only on Dashboard */}
        {currentView === 'dashboard' && (
          <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-20 pointer-events-none">
            <div className="max-w-4xl mx-auto flex justify-center pointer-events-auto">
              <MicrophoneButton
                isRecording={isRecording}
                onClick={handleToggleRecording}
                disabled={isAnalyzing}
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
