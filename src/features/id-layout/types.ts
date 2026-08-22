export type NodeType = 'image' | 'text';

export interface LayoutNode {
  id: string;
  type: NodeType;
  imageType?: 'front' | 'back';
  filter?: 'none' | 'grayscale';
  text?: string;
  x: number;
  y: number;
  rotation: number;
  visible: boolean;
}
