const fs = require('fs');

let file = fs.readFileSync('src/components/IdLayoutGenerator.tsx', 'utf8');

const targetStr = `  const handlePrint = async () => {
    const prevSelected = selectedId;
    setSelectedId(null);
    await new Promise(r => setTimeout(r, 100));
    window.print();
    setSelectedId(prevSelected);
  };`;

const replacement = `  const handlePrint = async () => {
    if (!a4Ref.current) return;
    const prevSelected = selectedId;
    setSelectedId(null);
    await new Promise(r => setTimeout(r, 100)); // wait for borders to clear
    
    try {
      const imgData = await toJpeg(a4Ref.current, {
        quality: 1.0,
        pixelRatio: 2,
        style: { transform: 'none' }
      });
      
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '-9999px';
      iframe.style.bottom = '-9999px';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.write(\`
          <html>
            <head>
              <title>Print ID Layout</title>
              <style>
                @page { size: A4 portrait; margin: 0; }
                body { margin: 0; padding: 0; background: white; }
                img { width: 210mm; height: 297mm; display: block; }
              </style>
            </head>
            <body>
              <img src="\${imgData}" />
            </body>
          </html>
        \`);
        iframeDoc.close();
        
        const img = iframeDoc.querySelector('img');
        if (img) {
          img.onload = () => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 2000);
          };
        }
      }
    } catch (error) {
      console.error('Print failed:', error);
      alert('Failed to print. Please try again.');
    } finally {
      setSelectedId(prevSelected);
    }
  };`;

file = file.replace(targetStr, replacement);
fs.writeFileSync('src/components/IdLayoutGenerator.tsx', file);
