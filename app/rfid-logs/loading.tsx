export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 p-4">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="w-full md:w-[180px]">
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="w-full md:w-[180px]">
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-6 gap-4 p-4 border-b border-gray-200">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-5 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
              
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4 p-4 border-b border-gray-200">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 