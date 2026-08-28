const fs = require('fs');
let code = fs.readFileSync('src/features/assets/AssetsPage.tsx', 'utf8');

const targetActions = `                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAsset(asset);
                                  setIsFormOpen(true);
                                }}
                                className="p-1.5 text-[#64748B] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Asset"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                disabled={isDeleting}
                                onClick={(e) => handleDeleteAsset(asset.id, e)}
                                className="p-1.5 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Purge Asset to Archives"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>`;

const replaceActions = `                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => handleMoveAsset(e, asset.id, 'up')}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Move Up"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                onClick={(e) => handleMoveAsset(e, asset.id, 'down')}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Move Down"
                              >
                                <ArrowDown size={14} />
                              </button>
                              <div className="w-px h-4 bg-slate-200 mx-1"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAsset(asset);
                                  setIsFormOpen(true);
                                }}
                                className="p-1.5 text-[#64748B] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Asset"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                disabled={isDeleting}
                                onClick={(e) => handleDeleteAsset(asset.id, e)}
                                className="p-1.5 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Purge Asset to Archives"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>`;

code = code.replace(targetActions, replaceActions);
fs.writeFileSync('src/features/assets/AssetsPage.tsx', code);
