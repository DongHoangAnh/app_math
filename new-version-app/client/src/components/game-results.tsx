import AppHeader from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Trophy, Timer, CheckCircle, Home } from "lucide-react";

// MM:SS từ milliseconds
function formatTime(ms: number): string {
    const totalSeconds = Math.round(ms / 1000);
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
}

interface GameResultsProps {
    playerCorrect: number;
    opponentCorrect: number;
    playerScore: number;
    opponentScore: number;
    playerTotalTimeMs: number;    // thời gian thật của bạn
    opponentTotalTimeMs: number;  // thời gian thật của đối thủ
    onFinish: () => void;
}

export default function GameResults({ playerCorrect, opponentCorrect, playerScore, opponentScore, playerTotalTimeMs, opponentTotalTimeMs, onFinish }: GameResultsProps) {
    const playerWon = playerScore > opponentScore || (playerScore === opponentScore && playerTotalTimeMs < opponentTotalTimeMs);

    return (
        <div className="min-h-screen bg-[#EAF6FF] relative overflow-hidden">
            <AppHeader />

            {/* Bubbles Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-12 h-12 left-[10%] top-[20%] bg-white/40 border border-white/60 rounded-full shadow-inner"></div>
                <div className="absolute w-20 h-20 left-[80%] top-[15%] bg-white/40 border border-white/60 rounded-full shadow-inner"></div>
                <div className="absolute w-16 h-16 left-[40%] top-[70%] bg-white/40 border border-white/60 rounded-full shadow-inner"></div>
                <div className="absolute w-8 h-8 left-[70%] top-[85%] bg-white/40 border border-white/60 rounded-full shadow-inner"></div>
                <div className="absolute w-24 h-24 left-[5%] top-[60%] bg-white/40 border border-white/60 rounded-full shadow-inner"></div>
            </div>

            <main className="relative z-10 container mx-auto px-4 pt-24 pb-20 flex flex-col items-center justify-center min-h-[calc(100vh-88px)]">
                <div className="shadow-[0_20px_50px_rgba(0,174,239,0.1)] bg-white rounded-3xl p-8 md:p-12 border border-white/60 w-full max-w-4xl flex flex-col items-center relative overflow-hidden">
                    <h1 className="text-4xl md:text-5xl font-black text-[#0A2463] mb-12 uppercase tracking-widest text-center" style={{ fontFamily: 'Baloo 2, cursive' }}>
                        KẾT QUẢ
                    </h1>

                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        {/* Player Card */}
                        <div className={`rounded-3xl p-8 flex flex-col items-center relative border-2 ${playerWon ? 'bg-orange-50 border-orange-100' : 'bg-[#FFE5E5]/50 border-red-100'}`}>
                            <div className="absolute -top-4 bg-white px-6 py-1 rounded-full border shadow-sm">
                                <span className="text-[#0A2463] font-black tracking-widest text-lg uppercase" style={{ fontFamily: 'Baloo 2, cursive' }}>BẠN</span>
                            </div>
                            <div className="w-full space-y-6 mt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className={`w-6 h-6 ${playerWon ? 'text-[#FF9F1C]' : 'text-red-400'}`} />
                                        <span className="font-bold text-[#0A2463]">SỐ CÂU ĐÚNG:</span>
                                    </div>
                                    <span className="font-black text-2xl text-[#0A2463]" style={{ fontFamily: 'Baloo 2, cursive' }}>{playerCorrect}/10</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Timer className={`w-6 h-6 ${playerWon ? 'text-[#FF9F1C]' : 'text-red-400'}`} />
                                        <span className="font-bold text-[#0A2463]">TỔNG THỜI GIAN:</span>
                                    </div>
                                    <span className="font-black text-2xl text-[#0A2463]" style={{ fontFamily: 'Baloo 2, cursive' }}>{formatTime(playerTotalTimeMs)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-2xl ${playerWon ? 'text-[#FF9F1C]' : 'text-red-400'}`}>⭐</span>
                                        <span className="font-bold text-[#0A2463]">TỔNG SỐ ĐIỂM:</span>
                                    </div>
                                    <span className="font-black text-2xl text-[#0A2463]" style={{ fontFamily: 'Baloo 2, cursive' }}>{playerScore}</span>
                                </div>
                            </div>
                            <div className="mt-10">
                                {playerScore === opponentScore && playerTotalTimeMs === opponentTotalTimeMs ? (
                                    <div className="bg-gray-100 px-8 py-3 rounded-2xl border-2 border-gray-300 flex items-center gap-3">
                                        <span className="text-gray-500 font-black text-2xl uppercase tracking-widest" style={{ fontFamily: 'Baloo 2, cursive' }}>HÒA</span>
                                    </div>
                                ) : playerWon ? (
                                    <div className="bg-[#FFD700]/20 px-8 py-3 rounded-2xl border-2 border-[#FFD700] flex items-center gap-3">
                                        <Trophy className="w-6 h-6 text-[#FF9F1C]" />
                                        <span className="text-[#FF9F1C] font-black text-2xl uppercase tracking-widest" style={{ fontFamily: 'Baloo 2, cursive' }}>THẮNG</span>
                                    </div>
                                ) : (
                                    <div className="bg-white/60 px-8 py-3 rounded-2xl border border-white flex items-center gap-2">
                                        <span className="text-gray-400 font-black text-2xl uppercase tracking-widest" style={{ fontFamily: 'Baloo 2, cursive' }}>THUA</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Opponent Card */}
                        <div className={`rounded-3xl p-8 flex flex-col items-center relative border-2 ${!playerWon ? 'bg-orange-50 border-orange-100' : 'bg-[#FFE5E5]/50 border-red-100'}`}>
                            <div className="absolute -top-4 bg-white px-6 py-1 rounded-full border shadow-sm">
                                <span className="text-[#0A2463] font-black tracking-widest text-lg uppercase" style={{ fontFamily: 'Baloo 2, cursive' }}>ĐỐI THỦ</span>
                            </div>
                            <div className="w-full space-y-6 mt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className={`w-6 h-6 ${!playerWon ? 'text-[#FF9F1C]' : 'text-red-400'}`} />
                                        <span className="font-bold text-[#0A2463]">SỐ CÂU ĐÚNG:</span>
                                    </div>
                                    <span className="font-black text-2xl text-[#0A2463]" style={{ fontFamily: 'Baloo 2, cursive' }}>{opponentCorrect}/10</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Timer className={`w-6 h-6 ${!playerWon ? 'text-[#FF9F1C]' : 'text-red-400'}`} />
                                        <span className="font-bold text-[#0A2463]">TỔNG THỜI GIAN:</span>
                                    </div>
                                    <span className="font-black text-2xl text-[#0A2463]" style={{ fontFamily: 'Baloo 2, cursive' }}>{formatTime(opponentTotalTimeMs)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-2xl ${!playerWon ? 'text-[#FF9F1C]' : 'text-red-400'}`}>⭐</span>
                                        <span className="font-bold text-[#0A2463]">TỔNG SỐ ĐIỂM:</span>
                                    </div>
                                    <span className="font-black text-2xl text-[#0A2463]" style={{ fontFamily: 'Baloo 2, cursive' }}>{opponentScore}</span>
                                </div>
                            </div>
                            <div className="mt-10">
                                {!playerWon && playerScore === opponentScore && playerTotalTimeMs === opponentTotalTimeMs ? (
                                    <div className="bg-gray-100 px-8 py-3 rounded-2xl border-2 border-gray-300 flex items-center gap-3">
                                        <span className="text-gray-500 font-black text-2xl uppercase tracking-widest" style={{ fontFamily: 'Baloo 2, cursive' }}>HÒA</span>
                                    </div>
                                ) : !playerWon ? (
                                    <div className="bg-[#FFD700]/20 px-8 py-3 rounded-2xl border-2 border-[#FFD700] flex items-center gap-3">
                                        <Trophy className="w-6 h-6 text-[#FF9F1C]" />
                                        <span className="text-[#FF9F1C] font-black text-2xl uppercase tracking-widest" style={{ fontFamily: 'Baloo 2, cursive' }}>THẮNG</span>
                                    </div>
                                ) : (
                                    <div className="bg-white/60 px-8 py-3 rounded-2xl border border-white flex items-center gap-2">
                                        <span className="text-gray-400 font-black text-2xl uppercase tracking-widest" style={{ fontFamily: 'Baloo 2, cursive' }}>THUA</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8 w-full z-20">
                        <button
                            onClick={() => window.location.href = '/gameshow'}
                            className="bg-white text-[#0A2463] font-black text-2xl py-4 px-10 rounded-full uppercase tracking-widest hover:bg-blue-50 active:scale-95 transition-all border-b-[6px] border-[#CBD5E1] active:border-b-[2px] active:translate-y-1 flex items-center justify-center gap-3"
                            style={{ fontFamily: 'Baloo 2, cursive' }}
                        >
                            <Home className="w-8 h-8" />
                            QUAY LẠI
                        </button>
                        <button
                            onClick={onFinish}
                            className="bg-[#FF9F1C] text-white font-black text-2xl py-4 px-16 rounded-full uppercase tracking-widest hover:brightness-105 active:scale-95 transition-all border-b-[6px] border-[#e68a00] active:border-b-[2px] active:translate-y-1"
                            style={{ fontFamily: 'Baloo 2, cursive' }}
                        >
                            TÌM TRẬN MỚI
                        </button>
                    </div>

                    {/* Decorative Icons */}
                    <div className="absolute top-10 left-10 opacity-5 pointer-events-none hidden md:block">
                        <span className="text-6xl">📐</span>
                    </div>
                    <div className="absolute bottom-20 left-10 opacity-5 pointer-events-none hidden md:block">
                        <span className="text-6xl">%</span>
                    </div>
                    <div className="absolute top-20 right-10 opacity-5 pointer-events-none hidden md:block">
                        <span className="text-6xl">🧮</span>
                    </div>
                </div>
            </main>

            {/* Wave Footer */}
            <div className="fixed bottom-0 left-0 w-full h-24 pointer-events-none opacity-30">
                <svg className="absolute bottom-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1440 320">
                    <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,197.3C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" fill="#00AEEF" />
                </svg>
            </div>
        </div>
    );
}
