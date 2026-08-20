const fs = require('fs');

let file = fs.readFileSync('src/components/IdLayoutGenerator.tsx', 'utf8');

// Replace handleFitScreen with accurate mm-to-pixel calculation and robust padding
const oldFitScreen = `  // Fit to screen calculation
  const handleFitScreen = useCallback(() => {
    if (canvasContainerRef.current) {
      const container = canvasContainerRef.current;
      const paddingX = 48;
      const paddingY = 48;
      const availW = Math.max(100, container.clientWidth - paddingX);
      const availH = Math.max(100, container.clientHeight - paddingY);

      // A4 at standard 96 DPI: 210mm = 793.7px, 297mm = 1122.5px
      const a4W = 793.7;
      const a4H = 1122.5;

      const scaleW = availW / a4W;
      const scaleH = availH / a4H;
      const fitScale = Math.min(scaleW, scaleH);
      
      const clamped = Math.max(0.25, Math.min(1.8, Math.round(fitScale * 100) / 100));
      setZoomA4(clamped);
    }
  }, []);`;

const newFitScreen = `  // Fit to screen calculation
  const handleFitScreen = useCallback(() => {
    if (canvasContainerRef.current) {
      const container = canvasContainerRef.current;
      const paddingX = 48;
      const paddingY = 48;
      const availW = Math.max(100, container.clientWidth - paddingX);
      const availH = Math.max(100, container.clientHeight - paddingY);

      // A4 in standard 96 DPI CSS pixels (1mm = 3.779527559px)
      // 210mm = 793.7px, 297mm = 1122.5px
      const a4W = 793.7;
      const a4H = 1122.5;

      const scaleW = availW / a4W;
      const scaleH = availH / a4H;
      const fitScale = Math.min(scaleW, scaleH);
      
      const clamped = Math.max(0.25, Math.min(1.5, Math.floor(fitScale * 100) / 100));
      setZoomA4(clamped);
    }
  }, []);`;

file = file.replace(oldFitScreen, newFitScreen);

// Update container and scaling structure
const oldContainerSnippet = `          {/* Live A4 Editor Canvas Wrapper */}
          <div 
            ref={canvasContainerRef}
            className={cn(
              "relative flex justify-center items-center overflow-auto print:overflow-visible print:block bg-slate-200/90 dark:bg-slate-950/70 rounded-2xl border border-slate-300 dark:border-slate-700 p-4 sm:p-8 print:p-0 transition-all",
              isFullscreen ? "flex-1 h-full rounded-xl border-slate-700" : "h-[calc(100vh-280px)] min-h-[580px] max-h-[880px]"
            )}
          >
            {/* Scaled Layout Box that properly sizes the scroll area */}
            <div 
              className="transition-all duration-150 flex items-center justify-center shrink-0"
              style={{ 
                width: \`\${210 * zoomA4}mm\`,
                height: \`\${297 * zoomA4}mm\`
              }}
            >
              <div 
                className="origin-top-left transition-transform duration-150"
                style={{ 
                  transform: \`scale(\${zoomA4})\`,
                  width: '210mm',
                  height: '297mm'
                }}
              >
                {/* A4 Page Container */}
                <div 
                  ref={a4Ref}
                  className="a4-canvas relative shadow-2xl print:shadow-none"
                  onClick={() => setSelectedId(null)}
                  style={{
                    width: '210mm',
                    height: '297mm',
                    boxSizing: 'border-box', 
                    backgroundColor: '#ffffff'
                  }}
                >`;

const newContainerSnippet = `          {/* Live A4 Editor Canvas Wrapper */}
          <div 
            ref={canvasContainerRef}
            className={cn(
              "relative flex overflow-auto print:overflow-visible print:block bg-slate-200/90 dark:bg-slate-950/80 rounded-2xl border border-slate-300 dark:border-slate-700 p-6 sm:p-8 print:p-0 transition-all",
              isFullscreen ? "flex-1 min-h-0 w-full rounded-xl border-slate-700" : "h-[calc(100vh-280px)] min-h-[580px] max-h-[880px]"
            )}
          >
            {/* Sizer container with margin: auto for perfect centering & scroll preservation */}
            <div 
              className="relative m-auto shrink-0 transition-all duration-150"
              style={{ 
                width: \`\${210 * zoomA4}mm\`,
                height: \`\${297 * zoomA4}mm\`
              }}
            >
              <div 
                className="absolute top-0 left-0 transition-transform duration-150"
                style={{ 
                  transform: \`scale(\${zoomA4})\`,
                  transformOrigin: '0 0',
                  width: '210mm',
                  height: '297mm'
                }}
              >
                {/* A4 Page Container */}
                <div 
                  ref={a4Ref}
                  className="a4-canvas relative shadow-2xl print:shadow-none"
                  onClick={() => setSelectedId(null)}
                  style={{
                    width: '210mm',
                    height: '297mm',
                    boxSizing: 'border-box', 
                    backgroundColor: '#ffffff'
                  }}
                >`;

file = file.replace(oldContainerSnippet, newContainerSnippet);

// Update fullscreen wrapper to include min-h-0 and proper height
const oldFullscreenWrapper = `        {/* Editor Area (Wrapped with Fullscreen support) */}
        <div className={cn(
          "transition-all duration-200",
          isFullscreen ? "fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md p-4 sm:p-6 flex flex-col" : "space-y-4"
        )}>`;

const newFullscreenWrapper = `        {/* Editor Area (Wrapped with Fullscreen support) */}
        <div className={cn(
          "transition-all duration-200",
          isFullscreen ? "fixed inset-0 z-50 bg-slate-900 p-4 sm:p-6 flex flex-col min-h-0 h-screen w-screen overflow-hidden gap-4" : "space-y-4"
        )}>`;

file = file.replace(oldFullscreenWrapper, newFullscreenWrapper);

fs.writeFileSync('src/components/IdLayoutGenerator.tsx', file);
console.log('Patch complete');
