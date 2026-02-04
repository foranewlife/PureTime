import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Coffee, ChevronDown } from "lucide-react";

type AppState = "IDLE" | "FOCUSING" | "RESTING" | "ALERT";

const PRESETS = [
  { label: "25m (番茄钟)", mins: 25 },
  { label: "45m (标准模式)", mins: 45 },
  { label: "60m (深度工作)", mins: 60 },
  { label: "90m (极客模式)", mins: 90 },
];

function App() {
  const [state, setState] = useState<AppState>("IDLE");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isPaused, setIsPaused] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    window.ipcRenderer.invoke('get-theme').then(setIsDark);
    window.ipcRenderer.invoke('get-initial-state').then((res: any) => {
      setTimeLeft(res.timeLeft);
      setState(res.state);
      setIsPaused(res.isPaused);
    });

    const handleThemeChange = (_event: any, dark: boolean) => setIsDark(dark);
    const handleStateUpdate = (_event: any, res: any) => {
      setTimeLeft(res.timeLeft);
      setState(res.state);
      setIsPaused(res.isPaused);
    };

    window.ipcRenderer.on('theme-changed', handleThemeChange);
    window.ipcRenderer.on('state-update', handleStateUpdate);

    return () => {
      window.ipcRenderer.off('theme-changed', handleThemeChange);
      window.ipcRenderer.off('state-update', handleStateUpdate);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getStatusColor = () => {
    if (state === "FOCUSING") return isDark ? "text-[#4fc1ff]" : "text-[#007acc]";
    if (state === "RESTING") return "text-[#4ec9b0]";
    if (state === "ALERT") return "text-[#ff5252]";
    return isDark ? "text-white/40" : "text-black/40";
  };

  const startFocus = (mins: number) => {
    // 乐观更新 UI
    setState("FOCUSING");
    setTimeLeft(mins * 60);
    setIsPaused(false);
    setShowPresets(false);
    // 通知主进程
    window.ipcRenderer.send('start-focus', mins);
  };

  return (
    <div className={`h-screen w-full flex flex-col transition-colors duration-500 overflow-hidden ${isDark ? "bg-[#1e1e1e]" : "bg-[#F5F5DC]"}`}>
      <div className="h-12 w-full" style={{ WebkitAppRegion: 'drag' } as any} title="拖动窗口" />
      
      <div className="flex-1 flex justify-center items-center px-6">
        <div className={`text-center backdrop-blur-xl p-8 rounded-3xl w-full max-w-[320px] transition-all duration-500 relative ${
          isDark ? "bg-[#252526]/80 border border-white/10" : "bg-white/70 border border-black/5"
        } ${state === "ALERT" ? "animate-pulse shadow-[0_0_30px_rgba(255,82,82,0.3)]" : "shadow-2xl"}`}>
          
          <img src={isDark ? "./logo-dark.svg" : "./logo.svg"} className="w-14 h-14 mx-auto mb-6 opacity-90" alt="logo" />
          
          <div className={`text-xs font-bold uppercase tracking-[0.2em] mb-2 ${getStatusColor()}`}>
            {state === "IDLE" ? "Ready to focus" : (state === "FOCUSING" ? (isPaused ? "Focus Paused" : "Focusing...") : (state === "RESTING" ? (isPaused ? "Rest Paused" : "Resting...") : "Time's Up!"))}
          </div>
          
          <div className={`font-mono text-7xl mb-8 tabular-nums tracking-tighter ${isDark ? "text-[#d4d4d4]" : "text-[#333333]"}`}>
            {formatTime(timeLeft)}
          </div>

          <div className="space-y-3">
            {/* Primary Action Button */}
            {state === "IDLE" ? (
              <button 
                onClick={() => startFocus(25)}
                title="立即开始 25 分钟番茄钟"
                className="w-full bg-[#4ec9b0] hover:bg-[#5edcc2] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-[#4ec9b0]/20"
              >
                <Play size={20} fill="currentColor" /> 开始专注 (25m)
              </button>
            ) : (state === "FOCUSING" || state === "RESTING") ? (
              <button 
                onClick={() => window.ipcRenderer.send('toggle-pause')}
                title={isPaused ? "恢复计时" : "暂停计时"}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm ${
                  isPaused 
                    ? "bg-[#4fc1ff] text-white shadow-[#4fc1ff]/20" 
                    : (isDark ? "bg-white/10 text-white" : "bg-black/5 text-black")
                }`}
              >
                {isPaused ? <><Play size={20} fill="currentColor" /> 继续</> : <><Pause size={20} fill="currentColor" /> 暂停</>}
              </button>
            ) : (
              <button 
                onClick={() => window.ipcRenderer.send('start-rest', 5)}
                className="w-full bg-[#4ec9b0] hover:bg-[#5edcc2] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-[#4ec9b0]/20"
              >
                <Coffee size={20} /> 开始休息 (5m)
              </button>
            )}

            {/* Duration Dropdown (Always visible for re-selecting) */}
            <div className="relative">
              {(state === "IDLE" || state === "FOCUSING") ? (
                <button 
                  onClick={() => setShowPresets(!showPresets)}
                  title="点击更改专注时长"
                  className={`w-full py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors ${
                    isDark ? "bg-white/5 text-white/50 hover:bg-white/10" : "bg-black/5 text-black/50 hover:bg-black/10"
                  }`}
                >
                  {state === "IDLE" ? "选择其他时长" : "重设专注时间"} <ChevronDown size={14} className={`transition-transform duration-300 ${showPresets ? "rotate-180" : ""}`} />
                </button>
              ) : state === "RESTING" ? (
                <button 
                  onClick={() => window.ipcRenderer.send('reset-timer')}
                  className="text-xs opacity-40 hover:opacity-100 flex items-center justify-center gap-1 py-2 transition-opacity w-full"
                >
                  <RotateCcw size={12} /> 跳过休息
                </button>
              ) : (
                <button 
                  onClick={() => window.ipcRenderer.send('snooze')}
                  className={`w-full py-3 rounded-xl text-sm transition-all active:scale-95 cursor-pointer ${isDark ? "bg-white/10 text-white/80 hover:bg-white/15" : "bg-black/5 text-black/80 hover:bg-black/10"}`}
                >
                  再坚持10分钟
                </button>
              )}

              {/* Presets List (Dropdown) */}
              {showPresets && (
                <div className={`absolute bottom-full left-0 w-full mb-2 p-2 rounded-2xl border backdrop-blur-2xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 ${
                  isDark ? "bg-[#2d2d2e] border-white/10" : "bg-white/90 border-black/5"
                }`}>
                  <div className="grid grid-cols-1 gap-1">
                    {PRESETS.map((p) => (
                      <button
                        key={p.mins}
                        onClick={() => startFocus(p.mins)}
                        className={`text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                          isDark ? "text-white/80 hover:bg-white/5" : "text-black/80 hover:bg-black/5"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Abandon (only in Focus mode) */}
            {state === "FOCUSING" && (
              <button 
                onClick={() => window.ipcRenderer.send('reset-timer')}
                className="text-[10px] opacity-20 hover:opacity-60 flex items-center justify-center gap-1 py-1 transition-opacity w-full uppercase tracking-tighter"
              >
                放弃当前计时
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className={`py-4 text-center text-[10px] uppercase tracking-widest opacity-20 ${isDark ? "text-white" : "text-black"}`}>
        MyRelax &bull; Stay focused &bull; Rest well
      </div>
    </div>
  );
}

export default App;