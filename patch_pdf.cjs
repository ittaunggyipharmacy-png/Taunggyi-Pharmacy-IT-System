const fs = require('fs');

let file = fs.readFileSync('src/components/IdLayoutGenerator.tsx', 'utf8');

const targetStr = `      const canvas = await html2canvas(a4Ref.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (doc) => {
          const element = doc.querySelector('.a4-canvas') as HTMLElement;
          if (element) element.style.transform = 'none';
        }
      });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);`;

const replacement = `      const imgData = await toJpeg(a4Ref.current, {
        quality: 1.0,
        pixelRatio: 2,
        style: {
          transform: 'none'
        }
      });`;

file = file.replace(targetStr, replacement);
fs.writeFileSync('src/components/IdLayoutGenerator.tsx', file);
