figma.showUI(__html__, { width: 400, height: 520 });

interface GridOptions {
  gridColumns: number;
  gridRows: number;
  color: RGB;
  cellSize: number;
  density: number;
}

interface GridCell {
  active: boolean;
  opacity: number;
}

let currentGridData: GridCell[][] | null = null;

figma.ui.onmessage = async (msg: { type: string; options?: GridOptions }) => {
  try {
    if (msg.type === "preview-grid" && msg.options) {
      currentGridData = createGridData(msg.options);
      figma.ui.postMessage({ type: "preview-data", data: currentGridData });
    } else if (msg.type === "insert-grid" && msg.options && currentGridData) {
      const gridId = await createGrid(msg.options, currentGridData);
      if (gridId) {
        const node = figma.getNodeById(gridId) as FrameNode;
        if (node) {
          figma.viewport.scrollAndZoomIntoView([node]);
          figma.currentPage.selection = [node];
          figma.ui.postMessage({ type: "grid-inserted" });
          figma.notify("Grid inserted.");
        } else {
          throw new Error("Failed to find created grid");
        }
      } else {
        throw new Error("Failed to create grid");
      }
    }
  } catch (error) {
    figma.notify("Error: " + (error as Error).message);
  }
};

function createGridData(options: GridOptions): GridCell[][] {
  const { gridColumns, gridRows, density } = options;
  const grid: GridCell[][] = [];

  for (let row = 0; row < gridRows; row++) {
    grid[row] = [];
    for (let col = 0; col < gridColumns; col++) {
      const active = Math.random() < density;
      grid[row][col] = {
        active: active,
        opacity: active ? Math.random() * 0.8 + 0.2 : 0,
      };
    }
  }

  return grid;
}

async function createGrid(
  options: GridOptions,
  gridData: GridCell[][]
): Promise<string> {
  const { gridColumns, gridRows, color, cellSize } = options;

  const safeCellSize = Math.max(1, Math.round(cellSize));

  const gridWidth = gridColumns * safeCellSize;
  const gridHeight = gridRows * safeCellSize;

  const mainFrame = figma.createFrame();
  mainFrame.resize(gridWidth, gridHeight);
  mainFrame.fills = [];

  const lineColor = { r: 0.8, g: 0.8, b: 0.8 };
  const lineThickness = 1;

  const gridLinesFrame = figma.createFrame();
  gridLinesFrame.name = "Grid";
  gridLinesFrame.resize(gridWidth, gridHeight);
  gridLinesFrame.fills = [];

  const mosaicFrame = figma.createFrame();
  mosaicFrame.name = "Mosaic";
  mosaicFrame.resize(gridWidth, gridHeight);
  mosaicFrame.fills = [];

  for (let col = 1; col < gridColumns; col++) {
    const verticalLine = figma.createRectangle();
    verticalLine.resize(lineThickness, gridHeight);
    verticalLine.x = col * safeCellSize - lineThickness;
    verticalLine.y = 0;
    verticalLine.fills = [{ type: "SOLID", color: lineColor }];
    gridLinesFrame.appendChild(verticalLine);
  }

  for (let row = 1; row < gridRows; row++) {
    const horizontalLine = figma.createRectangle();
    horizontalLine.resize(gridWidth, lineThickness);
    horizontalLine.x = 0;
    horizontalLine.y = row * safeCellSize - lineThickness;
    horizontalLine.fills = [{ type: "SOLID", color: lineColor }];
    gridLinesFrame.appendChild(horizontalLine);
  }

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridColumns; col++) {
      if (gridData[row][col].active) {
        const rect = figma.createRectangle();

        let rectWidth, rectHeight, rectX, rectY;

        if (col === gridColumns - 1) {
          rectWidth = safeCellSize;
          rectX = col * safeCellSize;
        } else {
          rectWidth = safeCellSize - lineThickness;
          rectX = col * safeCellSize;
        }

        if (row === gridRows - 1) {
          rectHeight = safeCellSize;
          rectY = row * safeCellSize;
        } else {
          rectHeight = safeCellSize - lineThickness;
          rectY = row * safeCellSize;
        }

        rect.resize(rectWidth, rectHeight);
        rect.x = rectX;
        rect.y = rectY;
        rect.fills = [
          { type: "SOLID", color: color, opacity: gridData[row][col].opacity },
        ];
        mosaicFrame.appendChild(rect);
      }
    }
  }

  mainFrame.appendChild(gridLinesFrame);
  mainFrame.appendChild(mosaicFrame);

  figma.currentPage.appendChild(mainFrame);
  return mainFrame.id;
}
