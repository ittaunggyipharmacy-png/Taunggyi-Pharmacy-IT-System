const fs = require('fs');
let code = fs.readFileSync('src/features/assets/AssetsPage.tsx', 'utf8');

// Find the spot to insert the handleMoveAsset function.
const hookInsert = `  const fetchData = async () => {`;
const moveFunc = `
  const handleMoveAsset = async (e: React.MouseEvent, assetId: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    // Find the current group this asset belongs to
    let targetGroup: any[] = [];
    for (const group of groupedByUser) {
      if (group.items.find((a: any) => a.id === assetId)) {
        targetGroup = group.items;
        break;
      }
    }
    
    if (targetGroup.length === 0) return;
    
    const index = targetGroup.findIndex((a: any) => a.id === assetId);
    if (index === -1) return;
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= targetGroup.length) return; // Cannot move further
    
    const currentAsset = targetGroup[index];
    const targetAsset = targetGroup[targetIndex];
    
    // Calculate initial display orders if not present
    const categoryPriority: Record<string, number> = {
      "Computer": 1, "Keyboard": 2, "Mouse": 3, "Fan": 4, "USB Hub": 5, "Printer": 6, "Scanner": 7
    };
    const getInitOrder = (a: any, i: number) => {
      if (typeof a.displayOrder === 'number') return a.displayOrder;
      return ((categoryPriority[a.category] || 99) * 1000) + i;
    };
    
    const currentOrder = getInitOrder(currentAsset, index);
    const targetOrder = getInitOrder(targetAsset, targetIndex);
    
    try {
      // Optimitic update
      setAssets(prev => prev.map(a => {
        if (a.id === currentAsset.id) return { ...a, displayOrder: targetOrder };
        if (a.id === targetAsset.id) return { ...a, displayOrder: currentOrder };
        return a;
      }));
      
      // Save to db
      const { saveAsset } = await import('../../services/assetService');
      await saveAsset({ id: currentAsset.id, displayOrder: targetOrder });
      await saveAsset({ id: targetAsset.id, displayOrder: currentOrder });
    } catch (err) {
      console.error("Failed to move asset:", err);
      toast.error("Failed to reorder assets");
      fetchData(); // revert
    }
  };

  const fetchData = async () => {`;

code = code.replace(hookInsert, moveFunc);
fs.writeFileSync('src/features/assets/AssetsPage.tsx', code);
