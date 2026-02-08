import { useState, useEffect, useRef, useMemo } from "react";
import { Zap, X, TrendingUp, History, Info, Activity, Trash2 } from "lucide-react";

interface PVTResult {
  timestamp: number;
  mean: number;
  lapses: number;
}

interface PVTTestProps {
  onClose: () => void;
  isDark: boolean;
}

const TOTAL_TRIALS = 5;
const HISTORY_KEY = "puretime_pvt_history";

export default function PVTTest({ onClose, isDark }: PVTTestProps) {
  const [stage, setStage] = useState<"READY" | "WAITING" | "STIMULUS" | "RESULT" | "HISTORY">("READY");
  const [prevStage, setPrevStage] = useState<"READY" | "RESULT">("READY");
  const [filterRange, setFilterRange] = useState<"24H" | "7D">("24H");
  const [trials, setTrials] = useState<number[]>([]);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [displayMs, setDisplayMs] = useState(0);
  const [history, setHistory] = useState<PVTResult[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const chartScrollRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse PVT history", e);
      }
    }
  }, []);

  const saveResult = (mean: number, lapses: number) => {
    const newResult: PVTResult = {
      timestamp: Date.now(),
      mean,
      lapses
    };
    setHistory(prev => {
      const updated = [...prev, newResult].slice(-10000);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteHistoryItem = (timestamp: number) => {
    setHistory(prev => {
      const updated = prev.filter(h => h.timestamp !== timestamp);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const processedHistory = useMemo(() => {
    if (history.length === 0) return [];
    const groups: Record<string, { sum: number; count: number; timestamp: number }> = {};
    const now = Date.now();
    const cutoff = filterRange === "24H" ? now - 24 * 60 * 60 * 1000 : now - 7 * 24 * 60 * 60 * 1000;

    history.filter(h => h.timestamp >= cutoff).forEach(h => {
      const date = new Date(h.timestamp);
      let key = "";
      if (filterRange === "24H") {
        const halfHour = date.getMinutes() < 30 ? "00" : "30";
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${halfHour}`;
      } else {
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      }
      if (!groups[key]) {
        groups[key] = { sum: 0, count: 0, timestamp: h.timestamp };
      }
      groups[key].sum += h.mean;
      groups[key].count += 1;
    });
    return Object.values(groups)
      .map(g => ({
        mean: Math.round(g.sum / g.count),
        timestamp: g.timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [history, filterRange]);

  // Auto-scroll chart to the right
  useEffect(() => {
    if (chartScrollRef.current) {
      chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth;
    }
  }, [processedHistory, stage]);

  const toggleHistory = () => {
    if (stage === "HISTORY") {
      setStage(prevStage);
    } else {
      if (stage === "READY" || stage === "RESULT") {
        setPrevStage(stage);
        setStage("HISTORY");
      }
    }
  };

  const getStatus = (mean: number, lapses: number) => {
    if (history.length < 5) {
      const ratio = mean / 280;
      if (lapses === 0 && ratio <= 1.1) return { label: "初始建立中", color: "text-green-500", desc: "正在学习您的反应基准，请多测试几次。" };
      if (ratio <= 1.4) return { label: "状态尚可", color: "text-[#4ec9b0]", desc: "处于初步定义的正常范围内。" };
      return { label: "建议休息", color: "text-red-500", desc: "反应较慢，可能需要休息。" };
    }
    const means = history.map(h => h.mean);
    const avg = means.reduce((a, b) => a + b, 0) / means.length;
    const stdDev = Math.sqrt(means.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / means.length);
    const zScore = (mean - avg) / (stdDev || 1);
    if (lapses === 0 && zScore <= -0.5) return { label: "超常发挥", color: "text-green-500", desc: "表现优于您 70% 的历史记录，大脑极其清醒！" };
    if (lapses === 0 && zScore <= 0.8) return { label: "状态平稳", color: "text-[#4ec9b0]", desc: "处于您的正常波动范围内，适合继续工作。" };
    if (lapses <= 1 && zScore <= 1.8) return { label: "注意力下滑", color: "text-yellow-500", desc: `表现进入了您最差的 15% 区间，建议休息。` };
    const slowPercent = Math.round(((mean - avg) / avg) * 100);
    return { label: "深度疲劳", color: "text-red-500", desc: `偏离正常水平 ${zScore.toFixed(1)}σ (慢了${slowPercent}%)，大脑已进入疲劳保护模式。` };
  };

  const startNextTrial = () => {
    setStage("WAITING");
    const delay = Math.floor(Math.random() * 3000) + 2000;
    timerRef.current = setTimeout(() => {
      setStage("STIMULUS");
      startTimeRef.current = Date.now();
      const interval = setInterval(() => {
        setDisplayMs(Date.now() - startTimeRef.current);
      }, 10);
      timerRef.current = interval as any;
    }, delay);
  };

  const handleAction = () => {
    if (stage === "READY") {
      if (timerRef.current) clearTimeout(timerRef.current);
      startNextTrial();
    } else if (stage === "STIMULUS") {
      if (timerRef.current) clearInterval(timerRef.current);
      const rt = Date.now() - startTimeRef.current;
      const newTrials = [...trials, rt];
      const nextTrial = currentTrial + 1;
      setTrials(newTrials);
      setCurrentTrial(nextTrial);
      setDisplayMs(rt);
      if (nextTrial >= TOTAL_TRIALS) {
        const meanValue = Math.round(newTrials.reduce((a, b) => a + b, 0) / newTrials.length);
        const lapsesValue = newTrials.filter(rt => rt > 500).length;
        saveResult(meanValue, lapsesValue);
        setStage("RESULT");
      } else {
        startNextTrial();
      }
    } else if (stage === "WAITING") {
      if (timerRef.current) clearTimeout(timerRef.current);
      alert("太快了！请等待刺激出现。");
      setStage("READY");
    }
  };

  const generateFakeData = () => {
    const fakeItems: PVTResult[] = [];
    const now = Date.now();
    const hundredDaysMs = 100 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < 10000; i++) {
      fakeItems.push({
        timestamp: now - Math.floor(Math.random() * hundredDaysMs),
        mean: 230 + Math.floor(Math.random() * 200),
        lapses: Math.random() > 0.97 ? 1 : 0
      });
    }
    fakeItems.sort((a, b) => a.timestamp - b.timestamp);
    setHistory(fakeItems);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(fakeItems));
    alert("已成功生成 10,000 条跨越 100 天的测试数据！");
  };

  const TrendChart = () => {
    const data = processedHistory;
    if (data.length === 0) return (
      <div className={`h-28 flex items-center justify-center text-xs opacity-20 border-2 border-dashed rounded-2xl ${isDark ? "border-white/5" : "border-black/5"}`}>
        此范围内暂无数据
      </div>
    );
    const maxVal = Math.max(...data.map(d => d.mean), 450);
    const minVal = Math.min(...data.map(d => d.mean), 200);
    const range = maxVal - minVal || 1;
    const pointSpacing = filterRange === "24H" ? 60 : 100;
    const chartWidth = Math.max(280, data.length * pointSpacing);
    const points = data.map((d, i) => {
      const x = data.length > 1 ? (i / (data.length - 1)) * (chartWidth - 60) + 30 : chartWidth / 2;
      const y = 90 - ((d.mean - minVal) / range) * 70;
      return `${x},${y}`;
    }).join(" ");
    return (
      <div className={`w-full mt-2 rounded-2xl overflow-hidden ${isDark ? "bg-black/20" : "bg-black/5"}`}>
        <div ref={chartScrollRef} className="overflow-x-auto custom-scrollbar pt-8 pb-8 px-4 scroll-smooth">
          <div style={{ width: `${chartWidth}px` }} className="h-28 relative">
            <svg viewBox={`0 0 ${chartWidth} 100`} className="w-full h-full overflow-visible">
              {data.length > 1 && (
                <polyline fill="none" stroke="#4ec9b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} className="opacity-40" />
              )}
              {data.map((d, i) => {
                const x = data.length > 1 ? (i / (data.length - 1)) * (chartWidth - 60) + 30 : chartWidth / 2;
                const y = 90 - ((d.mean - minVal) / range) * 70;
                const date = new Date(d.timestamp);
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="3" fill="#4ec9b0" />
                    {(data.length < 15 || i === data.length - 1 || i === 0) && (
                      <text x={x} y={y - 12} textAnchor="middle" fontSize="11" fill="#4ec9b0" fontWeight="bold" className="font-mono">{d.mean}</text>
                    )}
                    {(i === data.length - 1 || i === 0 || i % (filterRange === "24H" ? 4 : 1) === 0) && (
                      <text x={x} y={115} textAnchor="middle" fontSize="9" fill={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} className="font-mono font-bold">
                        {filterRange === "24H" 
                          ? `${date.getHours()}:${date.getMinutes() < 30 ? "00" : "30"}`
                          : `${date.getMonth() + 1}/${date.getDate()}`}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    );
  };

  const results = useMemo(() => {
    if (trials.length === 0) return { mean: 0, lapses: 0 };
    const meanValue = Math.round(trials.reduce((a, b) => a + b, 0) / trials.length);
    const lapsesValue = trials.filter(rt => rt > 500).length;
    return { mean: meanValue, lapses: lapsesValue };
  }, [trials]);

  return (
    <div className={`flex flex-col h-screen w-full transition-colors relative overflow-hidden ${isDark ? "bg-[#1e1e1e]" : "bg-[#F5F5DC]"}`}>
      {stage === "STIMULUS" && (
        <div onClick={handleAction} className="fixed inset-0 bg-red-600 z-[9999] flex flex-col items-center justify-center cursor-pointer animate-in fade-in duration-75">
          <div className="text-center select-none">
            <p className="text-8xl font-mono font-bold text-white tabular-nums drop-shadow-md">{displayMs}</p>
            <p className="text-white/60 mt-8 text-xl font-black uppercase tracking-[0.5em] animate-pulse">CLICK NOW!</p>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="flex justify-between w-full mb-6 items-center">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-[#4ec9b0]" />
            <h2 className={`text-lg font-bold ${isDark ? "text-white/80" : "text-black/80"}`}>疲劳检测</h2>
          </div>
          <div className="flex gap-2">
            {(stage === "READY" || stage === "RESULT" || stage === "HISTORY") && (
              <button onClick={toggleHistory} className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"} ${stage === "HISTORY" ? "bg-[#4ec9b0]/20 text-[#4ec9b0]" : ""}`}>
                <History size={18} className={stage === "HISTORY" ? "text-[#4ec9b0]" : (isDark ? "text-white/40" : "text-black/40")} />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <X size={20} className={isDark ? "text-white/40" : "text-black/40"} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {stage === "HISTORY" ? (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className={`text-xs font-bold uppercase tracking-widest opacity-50 ${isDark ? "text-white" : "text-black"}`}>趋势概览</h3>
                    <div className="flex bg-black/10 rounded-lg p-0.5">
                      {(["24H", "7D"] as const).map(r => (
                        <button key={r} onClick={() => setFilterRange(r)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${filterRange === r ? (isDark ? "bg-white/10 text-white" : "bg-white text-black shadow-sm") : "opacity-30 hover:opacity-100"}`}>{r}</button>
                      ))}
                    </div>
                  </div>
                  <TrendChart />
                </div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`text-xs font-bold uppercase tracking-widest opacity-50 ${isDark ? "text-white" : "text-black"}`}>详细记录</h3>
                  <button onDoubleClick={generateFakeData} className="text-[8px] opacity-10 hover:opacity-100 uppercase">Gen Fake</button>
                </div>
                <div className="space-y-2 pb-6">
                  {history.length === 0 ? (
                    <div className="text-center py-12 opacity-30 text-sm">暂无记录</div>
                  ) : (
                    history.slice().reverse().slice(0, 100).map((h) => (
                      <div key={h.timestamp} className={`p-3 rounded-xl flex justify-between items-center group ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                        <div className="flex-1">
                          <div className={`text-[10px] opacity-40`}>{new Date(h.timestamp).toLocaleString()}</div>
                          <div className={`text-xs font-bold ${getStatus(h.mean, h.lapses).color}`}>{getStatus(h.mean, h.lapses).label}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`text-sm font-mono ${isDark ? "text-white/80" : "text-black/80"}`}>{h.mean}ms</div>
                            <div className="text-[10px] opacity-40">Lapses: {h.lapses}</div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); if(confirm("确定删除这条不合理的数据吗？")) deleteHistoryItem(h.timestamp); }} className="p-2 text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))
                  )}
                  {history.length > 100 && (
                    <p className="text-center text-[10px] opacity-20 py-4 italic">—— 仅展示最近 100 条详细记录，更多趋势请查看图表 ——</p>
                  )}
                </div>
              </div>
              <button onClick={toggleHistory} className="mt-4 w-full py-3 rounded-xl text-xs font-bold border border-current opacity-40 hover:opacity-100 transition-opacity">返回{prevStage === "RESULT" ? "结果" : "测试"}</button>
            </div>
          ) : (
            <div onClick={handleAction} className={`h-full w-full flex flex-col rounded-2xl transition-all custom-scrollbar ${stage === "READY" ? `cursor-pointer border-2 border-dashed ${isDark ? "border-white/20 hover:bg-white/5" : "border-gray-400/40 hover:bg-black/5"} items-center justify-center` : (stage === "WAITING" ? "cursor-default border-2 border-dashed border-white/5 pointer-events-none items-center justify-center" : "border-none overflow-y-auto pt-2 pb-8")}`}>
              {stage === "READY" && (
                <div className="text-center select-none">
                  <Zap size={48} className="mx-auto mb-4 text-[#4ec9b0]" />
                  <p className={`text-sm ${isDark ? "text-white/60" : "text-black/60"}`}>{currentTrial === 0 ? "点击开始测试" : "点击进行下一轮"}</p>
                  <p className="text-xs opacity-40 mt-2 font-mono">Trial {currentTrial + 1} of {TOTAL_TRIALS}</p>
                </div>
              )}
              {stage === "WAITING" && (
                <div className="text-center select-none space-y-4">
                  <div className="space-y-1">
                    <p className={`text-2xl font-mono font-bold ${isDark ? "text-white/40" : "text-black/40"}`}>WAITING...</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] opacity-20">保持专注，等待红色出现</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                     <p className="text-[10px] font-mono opacity-30">Trial {currentTrial + 1} / {TOTAL_TRIALS}</p>
                     {currentTrial > 0 && <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${isDark ? "bg-white/5 text-white/30" : "bg-black/5 text-black/30"}`}>Last: {displayMs}ms</div>}
                  </div>
                </div>
              )}
              {stage === "RESULT" && (
                <div className="text-center w-full px-4">
                  <div className={`mb-2 text-sm font-bold uppercase tracking-widest ${getStatus(results.mean, results.lapses).color}`}>当前状态：{getStatus(results.mean, results.lapses).label}</div>
                  <div className={`text-[11px] mb-6 opacity-60 ${isDark ? "text-white" : "text-black"}`}>{getStatus(results.mean, results.lapses).desc}</div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className={`p-4 rounded-2xl ${isDark ? "bg-white/5 border border-white/5" : "bg-white border border-black/5"} shadow-sm`}>
                      <p className="text-[9px] uppercase opacity-50 mb-1 flex items-center justify-center gap-1"><TrendingUp size={10} /> 平均反应</p>
                      <p className={`text-2xl font-mono font-bold ${isDark ? "text-white" : "text-black"}`}>{results.mean}<span className="text-xs ml-1 font-normal opacity-40">ms</span></p>
                    </div>
                    <div className={`p-4 rounded-2xl ${isDark ? "bg-white/5 border border-white/5" : "bg-white border border-black/5"} shadow-sm`}>
                      <p className="text-[9px] uppercase opacity-50 mb-1 flex items-center justify-center gap-1"><Info size={10} /> 精神集中度</p>
                      <p className={`text-2xl font-mono font-bold ${results.lapses > 0 || results.mean > 350 ? "text-yellow-500" : "text-[#4ec9b0]"}`}>{Math.max(0, Math.round((results.mean < 250 ? 100 : Math.max(60, 100 - (results.mean - 250) * 0.16)) - (results.lapses * 20)))}<span className="text-xs ml-1 font-normal opacity-40">%</span></p>
                    </div>
                  </div>
                  <TrendChart />
                  <div className="mt-8 space-y-2">
                    <button onClick={() => { setTrials([]); setCurrentTrial(0); setStage("READY"); }} className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-95 ${isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-black/5 text-black hover:bg-black/10"}`}>重新测试</button>
                    <button onClick={onClose} className="w-full bg-[#4ec9b0] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#4ec9b0]/20 active:scale-95 transition-all">返回专注</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {(stage === "READY" || stage === "WAITING") && (
          <div className="mt-6 text-center select-none">
            <p className={`text-[10px] uppercase tracking-widest opacity-30 ${isDark ? "text-white" : "text-black"}`}>{stage === "READY" ? "点击屏幕中心开始" : "不要点击，直到屏幕变红"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
