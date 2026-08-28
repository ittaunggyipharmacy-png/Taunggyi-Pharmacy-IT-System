const fs = require('fs');
let code = fs.readFileSync('src/features/assets/AssetsPage.tsx', 'utf8');

// The issue is likely that patch_dnd.cjs was searching for `groupedByUser`
// but it had been renamed to `groupedByDepartment` by `patch_department.cjs`.
// Also it was searching for `handleMoveAsset` which might have been changed/removed.

// Let's re-apply the dnd logic, but using `groupedByDepartment` instead of `groupedByUser`
// and finding a different insertion point if needed.

// 1. Ensure GripVertical is imported
if (!code.includes("GripVertical")) {
    code = code.replace(/ArrowUp, ArrowDown, ChevronRight, X,/g, "ArrowUp, ArrowDown, ChevronRight, X, GripVertical,");
}

// 2. Add state variables for Drag & Drop
if (!code.includes("draggedId")) {
    const stateInsertPoint = "const [inventoryTab, setInventoryTab] = useState<'active' | 'purged'>('active');";
    const dndState = `const [inventoryTab, setInventoryTab] = useState<'active' | 'purged'>('active');  const [draggedId, setDraggedId] = useState<string | null>(null);  const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);`;
    code = code.replace(stateInsertPoint, dndState);
}

// 3. Add handleDrag logic near some other function, since handleMoveAsset is gone.
// Let's use `const handleUnlink =` as the new insertion point for drag logic.

const dragLogic = `
  const clearDragState = () => {    setDraggedId(null);    setDropTarget(null);  };  
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, id: string) => {    if (!isAdmin) return;    setDraggedId(id);    e.dataTransfer.effectAllowed = "move";    e.dataTransfer.setData("text/plain", id);  };  
  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {    e.preventDefault();    if (!isAdmin || !draggedId || draggedId === targetId) return;    const row = e.currentTarget.getBoundingClientRect();    const position = e.clientY < row.top + row.height / 2 ? "before" : "after";    setDropTarget(current => {      if (current?.id === targetId && current.position === position) return current;      return { id: targetId, position };    });    e.dataTransfer.dropEffect = "move";  };  
  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {    e.preventDefault();    const sourceId = draggedId || e.dataTransfer.getData("text/plain");    if (!isAdmin || !sourceId || sourceId === targetId) {      clearDragState();      return;    }    // Find the group containing the source    let sourceGroup: any[] = [];    let targetGroup: any[] = [];        
    for (const group of groupedByDepartment) {      
      if (group.items.find((a: any) => a.id === sourceId)) sourceGroup = group.items;      
      if (group.items.find((a: any) => a.id === targetId)) targetGroup = group.items;    }    
    // Only allow sorting within the same group for now    
    if (sourceGroup !== targetGroup || sourceGroup.length === 0) {      clearDragState();      return;    }    
    const sourceIndex = sourceGroup.findIndex((a: any) => a.id === sourceId);    
    const targetIndex = sourceGroup.findIndex((a: any) => a.id === targetId);        
    if (sourceIndex === -1 || targetIndex === -1) {      clearDragState();      return;    }    
    const currentAsset = sourceGroup[sourceIndex];    
    const targetAsset = sourceGroup[targetIndex];        
    
    // Simple reorder logic
    clearDragState();        
    try {
      // Need to reorder in the array based on position
      const newAssets = [...assets];
      const sIdx = newAssets.findIndex(a => a.id === sourceId);
      const tIdx = newAssets.findIndex(a => a.id === targetId);
      const [moved] = newAssets.splice(sIdx, 1);
      newAssets.splice(tIdx, 0, moved);
      setAssets(newAssets);
      
      // Persist the new order? The previous patch had complex displayOrder logic.
      // Let's keep it simple for now or match the patch_dnd.cjs if possible.
    } catch (err) {      
      console.error("Failed to move asset:", err);      
      toast.error("Failed to reorder assets");
    }  
  };
`;

if (!code.includes("handleDragStart")) {
    const dragLogicInsertPoint = "const handleUnlink = async (childAsset: ITAsset) => {";
    code = code.replace(dragLogicInsertPoint, dragLogic + "\n" + dragLogicInsertPoint);
}

// 4. Update the render row
const targetTr = `                      <tr
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className={cn(
                          "hover:bg-[#F8FAFC] transition-colors cursor-pointer group text-[#0F172A]",
                          selectedAssetIds.includes(asset.id) && "bg-blue-50/50"
                        )}
                      >`;
const replaceTr = `                      <tr
                        key={asset.id}
                        onDragOver={e => handleDragOver(e, asset.id)}
                        onDrop={e => handleDrop(e, asset.id)}
                        onClick={() => setSelectedAsset(asset)}
                        className={cn(
                          "hover:bg-[#F8FAFC] transition-colors cursor-pointer group text-[#0F172A]",
                          selectedAssetIds.includes(asset.id) && "bg-blue-50/50",
                          draggedId === asset.id ? 'opacity-40 bg-indigo-50' : '',
                          dropTarget?.id === asset.id && dropTarget.position === 'before' ? 'border-t-2 border-t-indigo-500' : '',
                          dropTarget?.id === asset.id && dropTarget.position === 'after' ? 'border-b-2 border-b-indigo-500' : ''
                        )}
                      >`;
code = code.replace(targetTr, replaceTr);

// 5. Replace up/down arrow buttons with a single Grip handle
// Note: The previous up/down arrows were in a different place? 
// The current code doesn't seem to have them. I need to find where to add the handle.

fs.writeFileSync('src/features/assets/AssetsPage.tsx', code);
