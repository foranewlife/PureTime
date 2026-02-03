import { useState, useEffect } from "react";

type Status = "Focusing" | "Resting" | "Snoozing";

function App() {
  const [status, setStatus] = useState<Status>("Focusing");
  const [targetTime, setTargetTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [isPaused, setIsPaused] = useState(true);
  const [isAlertMode, setIsAlertMode] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let interval: any;

    if (!isPaused) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
        setTimeLeft(diff);

        if (diff <= 0) {
          timerIsUp();
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPaused, targetTime]);

  useEffect(() => {
    // Initial theme check
    window.ipcRenderer.invoke('get-theme').then(setIsDark);

    const handleThemeChange = (_event: any, dark: boolean) => {
      setIsDark(dark);
    };

    const handleNotificationAction = (_event: any, actionId: string) => {
      console.log("收到通知动作:", actionId);
      if (actionId === "take-break") {
        takeBreak();
      } else if (actionId === "snooze") {
        snooze();
      }
    };

    window.ipcRenderer.on('theme-changed', handleThemeChange);
    window.ipcRenderer.on('notification-action', handleNotificationAction);

    resetTimer();

    return () => {
      window.ipcRenderer.off('theme-changed', handleThemeChange);
      window.ipcRenderer.off('notification-action', handleNotificationAction);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const timerIsUp = async () => {
    setIsPaused(true);
    setIsAlertMode(true);
    
    window.ipcRenderer.send('show-window');

    window.ipcRenderer.invoke('send-notification', {
      title: "休息时间到！🔔",
      body: "代码写完了吗？该起身走走啦！🏃‍♂️",
      actions: [
        { id: "take-break", title: "开始休息" },
        { id: "snooze", title: "稍后提醒" },
      ],
    });
  };

  const setDuration = (mins: number, label: Status) => {
    setIsAlertMode(false);
    const newTargetTime = Date.now() + mins * 60 * 1000;
    setTargetTime(newTargetTime);
    setTimeLeft(mins * 60);
    setStatus(label);
    setIsPaused(false);
  };

  const takeBreak = () => setDuration(5, "Resting");
  const snooze = () => setDuration(10, "Snoozing");
  const resetTimer = () => setDuration(45, "Focusing");

  const testNotification = async () => {
    window.ipcRenderer.invoke('send-notification', {
      title: "测试通知 🔔",
      body: "这是一个测试通知！",
      actions: [
        { id: "take-break", title: "开始休息" },
        { id: "snooze", title: "稍后提醒" },
      ],
    });
  };

  const getStatusColor = () => {
    switch (status) {
      case "Focusing": return isDark ? "text-[#4fc1ff]" : "text-[#007acc]";
      case "Resting": return "text-[#4ec9b0]";
      case "Snoozing": return "text-[#ce9178]";
    }
  };

  return (
    <div
      className={`h-screen w-full flex flex-col transition-colors duration-500 overflow-hidden ${
        isDark ? "bg-[#1e1e1e]" : "bg-[#F5F5DC]"
      }`}
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Spacer for macOS traffic lights */}
      <div className="h-10 w-full" />

      <div className="flex-1 flex justify-center items-center">
        <div
          className={`text-center backdrop-blur-xl p-10 rounded-2xl w-[320px] shadow-2xl border transition-all duration-500 ${
            isDark 
              ? "bg-[#252526]/80 border-white/10" 
              : "bg-white/60 border-black/5"
          } ${isAlertMode ? "animate-pulse" : ""}`}
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <img src="./logo.svg" alt="RestCode Logo" className="w-16 h-16 mx-auto mb-4" />
          <div className={`text-sm font-semibold uppercase tracking-widest ${getStatusColor()}`}>
            {status}
          </div>
          <div className={`font-mono text-7xl my-5 transition-colors duration-500 ${
            isDark ? "text-[#d4d4d4]" : "text-[#333333]"
          }`}>
            {formatTime(timeLeft)}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              className="bg-[#4ec9b0] text-white font-bold py-3 rounded-lg transition-all hover:bg-[#5edcc2] active:scale-95 cursor-pointer shadow-sm"
              onClick={takeBreak}
            >
              休息
            </button>
            <button
              className={`py-3 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm ${
                isDark 
                  ? "bg-[#3e3e3e] text-white hover:bg-[#4e4e4e]" 
                  : "bg-[#ce9178] text-white hover:bg-[#de9188]"
              }`}
              onClick={snooze}
            >
              再弄10min
            </button>
          </div>
          <button
            className={`mt-4 w-full transition-all active:scale-95 cursor-pointer ${
              isDark ? "opacity-40 text-white hover:opacity-60" : "opacity-60 text-[#333333] hover:opacity-100"
            }`}
            onClick={resetTimer}
          >
            重置
          </button>
          <button
            className={`mt-2 w-full py-3 rounded-lg transition-all active:scale-95 cursor-pointer shadow-md ${
              isDark 
                ? "bg-[#333333] text-white hover:bg-[#444444]" 
                : "bg-[#3e3e3e] text-white hover:bg-[#4e4e4e]"
            }`}
            onClick={testNotification}
          >
            测试通知
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;