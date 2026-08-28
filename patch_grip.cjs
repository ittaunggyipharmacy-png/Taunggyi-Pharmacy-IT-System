const fs = require('fs');
let code = fs.readFileSync('src/features/assets/AssetsPage.tsx', 'utf8');

// The GripVertical was NOT added in the render loop because I didn't add it in the previous patch.
// Let's find the td where buttons are (lines ~1535+) and insert the Grip handle.

const targetTd = `                        {isAdmin && (
                          <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">`;
const replaceTd = `                        {isAdmin && (
                          <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                                <button
                                    type="button"
                                    draggable
                                    onDragStart={e => handleDragStart(e, asset.id)}
                                    onDragEnd={clearDragState}
                                    onClick={e => e.stopPropagation()}
                                    className="p-1.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Drag to reorder"
                                  >
                                    <GripVertical size={16} />
                                  </button>`;

code = code.replace(targetTd, replaceTd);
fs.writeFileSync('src/features/assets/AssetsPage.tsx', code);
