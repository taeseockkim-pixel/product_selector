interface HeaderProps {
  onReset: () => void;
}

export default function Header({ onReset }: HeaderProps) {
  return (
    <header className="bg-[#1a2744] text-white shadow-lg">
      <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
        <button onClick={onReset} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
            <span className="text-xl font-bold tracking-wide">CIMON</span>
          </div>
          <span className="text-gray-400 text-sm font-light border-l border-gray-600 pl-3">
            제품 선택 가이드
          </span>
        </button>
        <p className="text-gray-400 text-sm hidden sm:block">
          요구사항에 맞는 최적의 CIMON 제품을 찾아드립니다
        </p>
      </div>
    </header>
  );
}
