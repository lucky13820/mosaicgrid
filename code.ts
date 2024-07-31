figma.showUI(__html__, { width: 400, height: 520 });

interface GridOptions {
  gridColumns: number;
  gridRows: number;
  color: RGB;
  cellSize: number;
  density: number;
}

let currentGrid: string | null = null;
let currentGridData: boolean[][] | null = null;

figma.ui.onmessage = async (msg: { type: string; options?: GridOptions }) => {
  console.log("Received message in plugin:", msg);
  try {
    if (msg.type === "preview-grid" && msg.options) {
      currentGridData = createGridData(msg.options);
      figma.ui.postMessage({ type: "preview-data", data: currentGridData });
    } else if (msg.type === "insert-grid" && msg.options && currentGridData) {
      // Check if currentGrid still exists before trying to remove it
      if (currentGrid) {
        try {
          const node = await figma.getNodeByIdAsync(currentGrid.id);
          if (node) {
            node.remove();
          }
        } catch (error) {
          console.log("Previous grid no longer exists:", error);
        }
      }

      if (
        !Array.isArray(currentGridData) ||
        currentGridData.length === 0 ||
        !Array.isArray(currentGridData[0])
      ) {
        throw new Error("Invalid grid data");
      }

      currentGrid = await createGrid(msg.options, currentGridData);
      if (currentGrid) {
        const node = figma.getNodeById(currentGrid) as FrameNode;
        if (node) {
          figma.viewport.scrollAndZoomIntoView([node]);
          figma.ui.postMessage({ type: "grid-inserted" });
        } else {
          throw new Error("Failed to find created grid");
        }
      } else {
        throw new Error("Failed to create grid");
      }
    }
  } catch (error) {
    console.error("Error in plugin:", error);
  }
};

function createGridData(options: GridOptions): boolean[][] {
  const { gridColumns, gridRows, density } = options;
  const grid: boolean[][] = [];

  for (let row = 0; row < gridRows; row++) {
    grid[row] = [];
    for (let col = 0; col < gridColumns; col++) {
      grid[row][col] = Math.random() < density;
    }
  }

  return grid;
}

async function createGrid(
  options: GridOptions,
  gridData: boolean[][]
): Promise<string> {
  const { gridColumns, gridRows, color, cellSize } = options;

  // Ensure cell size is at least 1 and is a whole number
  const safeCellSize = Math.max(1, Math.round(cellSize));

  // Calculate total grid size
  const gridWidth = gridColumns * safeCellSize;
  const gridHeight = gridRows * safeCellSize;

  const grid = figma.createFrame();
  grid.resize(gridWidth, gridHeight);
  grid.fills = [];

  const lineColor = { r: 0.8, g: 0.8, b: 0.8 };
  const lineThickness = 1;

  // Create vertical lines
  for (let col = 1; col < gridColumns; col++) {
    const verticalLine = figma.createRectangle();
    verticalLine.resize(lineThickness, gridHeight);
    verticalLine.x = col * safeCellSize;
    verticalLine.y = 0;
    verticalLine.fills = [{ type: "SOLID", color: lineColor }];
    verticalLine.name = "Line";
    grid.appendChild(verticalLine);
  }

  // Create horizontal lines
  for (let row = 1; row < gridRows; row++) {
    const horizontalLine = figma.createRectangle();
    horizontalLine.resize(gridWidth, lineThickness);
    horizontalLine.x = 0;
    horizontalLine.y = row * safeCellSize;
    horizontalLine.fills = [{ type: "SOLID", color: lineColor }];
    horizontalLine.name = "Line";
    grid.appendChild(horizontalLine);
  }

  // Create colored rectangles
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridColumns; col++) {
      if (gridData[row][col]) {
        const rect = figma.createRectangle();

        // Determine the size and position of the rectangle
        let rectWidth, rectHeight, rectX, rectY;

        if (col === 0) {
          rectWidth = safeCellSize;
          rectX = 0;
        } else {
          rectWidth = safeCellSize - lineThickness;
          rectX = col * safeCellSize + lineThickness;
        }

        if (row === 0) {
          rectHeight = safeCellSize;
          rectY = 0;
        } else {
          rectHeight = safeCellSize - lineThickness;
          rectY = row * safeCellSize + lineThickness;
        }

        rect.resize(rectWidth, rectHeight);
        rect.x = rectX;
        rect.y = rectY;
        rect.fills = [
          { type: "SOLID", color: color, opacity: Math.random() * 0.8 + 0.2 },
        ];
        grid.appendChild(rect);
      }
    }
  }

  figma.currentPage.appendChild(grid);
  return grid.id;
}
