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

      console.log("Inserting grid with options:", msg.options);
      console.log("Grid data:", currentGridData);

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
  console.log("Creating grid with options:", options);
  console.log(
    "Grid data dimensions:",
    gridData.length,
    "x",
    gridData[0].length
  );

  // Ensure cell size is at least 0.01
  const safeCellSize = Math.max(0.01, cellSize);

  // Calculate total grid size
  const gridWidth = gridColumns * safeCellSize;
  const gridHeight = gridRows * safeCellSize;

  // Ensure total grid size is at least 0.01 x 0.01
  const safeGridWidth = Math.max(0.01, gridWidth);
  const safeGridHeight = Math.max(0.01, gridHeight);
  console.log(`safeGridHeight:`, safeGridHeight);
  console.log(`safeGridWidth:`, safeGridWidth);

  const grid = figma.createFrame();
  grid.resize(safeGridWidth, safeGridHeight);
  grid.fills = [];

  const lineColor = { r: 0.8, g: 0.8, b: 0.8 };
  const lineThickness = 1; // Ensure line thickness is not too large compared to cell size

  // Create vertical lines
  // Create vertical lines (excluding edges)
  for (let col = 1; col < gridColumns; col++) {
    const verticalLine = figma.createRectangle();
    verticalLine.resize(lineThickness, gridRows * cellSize);
    verticalLine.x = col * cellSize - lineThickness / 2;
    verticalLine.y = 0;
    verticalLine.fills = [{ type: "SOLID", color: lineColor }];
    grid.appendChild(verticalLine);
  }

  // Create horizontal lines (excluding edges)
  for (let row = 1; row < gridRows; row++) {
    const horizontalLine = figma.createRectangle();
    horizontalLine.resize(gridColumns * cellSize, lineThickness);
    horizontalLine.x = 0;
    horizontalLine.y = row * cellSize - lineThickness / 2;
    horizontalLine.fills = [{ type: "SOLID", color: lineColor }];
    grid.appendChild(horizontalLine);
  }

  // Create colored rectangles
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridColumns; col++) {
      if (gridData[row][col]) {
        const rect = figma.createRectangle();
        const rectSize = Math.max(0.01, safeCellSize - lineThickness);
        console.log(`Cell (${row}, ${col}) rectSize:`, rectSize);
        rect.resize(rectSize, rectSize);
        rect.x = col * safeCellSize + lineThickness / 2;
        rect.y = row * safeCellSize + lineThickness / 2;
        rect.fills = [
          { type: "SOLID", color: color, opacity: Math.random() * 0.8 + 0.2 },
        ];
        grid.appendChild(rect);
      }
    }
  }
  console.log("Grid created with dimensions:", grid.width, "x", grid.height);
  console.log("Number of children:", grid.children.length);
  console.log(
    "Number of colored cells:",
    grid.children.filter((child) => child.type === "RECTANGLE").length
  );

  figma.currentPage.appendChild(grid);
  return grid.id;
}
