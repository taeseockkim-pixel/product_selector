interface HeaderProps {
  onReset: () => void;
}

export default function Header({ onReset }: HeaderProps) {
  return (
    <header className="bg-[#1a2744] text-white shadow-lg">
      <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
        <button onClick={onReset} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-2">
            <img
              src="/products/CIMON_Logo.png"
              alt="CIMON"
              className="h-16 w-auto object-contain"
            />
          </div>
          <span className="bg-gradient-to-r from-sky-300 to-white bg-clip-text text-transparent text-xl font-bold border-l-2 border-sky-400 pl-4 tracking-tight">
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
