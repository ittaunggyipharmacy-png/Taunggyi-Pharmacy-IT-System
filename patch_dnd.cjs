const fs = require('fs');
let code = fs.readFileSync('src/features/assets/AssetsPage.tsx', 'utf8');

// 1. Add GripVertical to lucide imports
code = code.replace(/ArrowUp, ArrowDown, ChevronRight, X,/g, "ArrowUp, ArrowDown, ChevronRight, X, GripVertical,");

// 2. Add state variables for Drag & Drop
const stateInsertPoint = "const [inventoryTab, setInventoryTab] = useState<'current' | 'purged'>('current');";
const dndState = `const [inventoryTab, setInventoryTab] = useState<'current' | 'purged'>('current');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);
`;
code = code.replace(stateInsertPoint, dndState);

// 3. Add handleDrag logic near handleMoveAsset
const dragLogicInsertPoint = "const handleMoveAsset = async (e: React.MouseEvent, assetId: string, direction: 'up' | 'down') => {";
const dragLogic = `
  const clearDragState = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, id: string) => {
    if (!isAdmin) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    e.preventDefault();
    if (!isAdmin || !draggedId || draggedId === targetId) return;

    const row = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < row.top + row.height / 2 ? "before" : "after";

    setDropTarget(current => {
      if (current?.id === targetId && current.position === position) return current;
      return { id: targetId, position };
    });
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedId || e.dataTransfer.getData("text/plain");
    if (!isAdmin || !sourceId || sourceId === targetId) {
      clearDragState();
      return;
    }

    // Find the group containing the source
    let sourceGroup: any[] = [];
    let targetGroup: any[] = [];
    
    for (const group of groupedByUser) {
      if (group.items.find((a: any) => a.id === sourceId)) sourceGroup = group.items;
      if (group.items.find((a: any) => a.id === targetId)) targetGroup = group.items;
    }

    // Only allow sorting within the same group for now
    if (sourceGroup !== targetGroup || sourceGroup.length === 0) {
      clearDragState();
      return;
    }

    const sourceIndex = sourceGroup.findIndex((a: any) => a.id === sourceId);
    const targetIndex = sourceGroup.findIndex((a: any) => a.id === targetId);
    
    if (sourceIndex === -1 || targetIndex === -1) {
      clearDragState();
      return;
    }

    const currentAsset = sourceGroup[sourceIndex];
    const targetAsset = sourceGroup[targetIndex];
    
    const categoryPriority: Record<string, number> = {
      "Computer": 1, "Keyboard": 2, "Mouse": 3, "Fan": 4, "USB Hub": 5, "Printer": 6, "Scanner": 7
    };
    const getInitOrder = (a: any, i: number) => {
      if (typeof a.displayOrder === 'number') return a.displayOrder;
      return ((categoryPriority[a.category] || 99) * 1000) + i;
    };

    // Very simple swap for simplicity, or we can recalculate all orders in the group
    const currentOrder = getInitOrder(currentAsset, sourceIndex);
    const targetOrder = getInitOrder(targetAsset, targetIndex);

    clearDragState();
    
    try {
      setAssets(prev => prev.map(a => {
        if (a.id === currentAsset.id) return { ...a, displayOrder: targetOrder };
        if (a.id === targetAsset.id) return { ...a, displayOrder: currentOrder };
        return a;
      }));
      
      const { saveAsset } = await import('../../services/assetService');
      await saveAsset({ id: currentAsset.id, displayOrder: targetOrder });
      await saveAsset({ id: targetAsset.id, displayOrder: currentOrder });
    } catch (err) {
      console.error("Failed to move asset:", err);
      toast.error("Failed to reorder assets");
      fetchData(); // revert
    }
  };

  const handleMoveAsset = async (e: React.MouseEvent, assetId: string, direction: 'up' | 'down') => {`;

code = code.replace(dragLogicInsertPoint, dragLogic);

// 4. Update the render row
const targetTr = `                    {group.items.map((asset) => (
                      <tr
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >`;

const replaceTr = `                    {group.items.map((asset) => (
                      <tr
                        key={asset.id}
                        onDragOver={e => handleDragOver(e, asset.id)}
                        onDrop={e => handleDrop(e, asset.id)}
                        onClick={() => setSelectedAsset(asset)}
                        className={\`cursor-pointer transition-colors \${
                          draggedId === asset.id ? 'opacity-40 bg-indigo-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        } \${
                          dropTarget?.id === asset.id && dropTarget.position === 'before' ? 'border-t-2 border-t-indigo-500' : ''
                        } \${
                          dropTarget?.id === asset.id && dropTarget.position === 'after' ? 'border-b-2 border-b-indigo-500' : ''
                        }\`}
                      >`;

code = code.replace(targetTr, replaceTr);

// 5. Replace up/down arrow buttons with a single Grip handle
const targetArrows = `                              <button
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
                              <div className="w-px h-4 bg-slate-200 mx-1"></div>`;

const replaceArrows = `                              {isAdmin && inventoryTab === 'current' && (
                                <>
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
                                  </button>
                                  <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                </>
                              )}`;

code = code.replace(targetArrows, replaceArrows);

fs.writeFileSync('src/features/assets/AssetsPage.tsx', code);
