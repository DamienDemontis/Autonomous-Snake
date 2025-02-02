// Get the canvas and its drawing context
const canvas = document.getElementById("gridCanvas");
const context = canvas.getContext("2d");

// Global variable for cell size (adjustable via the slider)
let cellSize = 20;

// Resize the canvas to match the window's dimensions
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawGrid(); // Redraw grid when canvas size changes
}

// Draws a grid that fills the canvas based on the current cell size
function drawGrid() {
  // Clear the entire canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate number of columns and rows required
  const cols = Math.ceil(canvas.width / cellSize);
  const rows = Math.ceil(canvas.height / cellSize);

  context.strokeStyle = "rgba(0, 0, 0, 0.1)";
  context.lineWidth = 1;

  // Draw vertical grid lines
  for (let i = 0; i <= cols; i++) {
    const x = i * cellSize;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }

  // Draw horizontal grid lines
  for (let j = 0; j <= rows; j++) {
    const y = j * cellSize;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
}

// Set up event listener for window resizing
window.addEventListener("resize", resizeCanvas);

// Initial canvas sizing and grid drawing
resizeCanvas();

// Set up the slider to update the cell size dynamically
const cellSizeRange = document.getElementById("cellSizeRange");
cellSizeRange.addEventListener("input", (event) => {
  cellSize = parseInt(event.target.value, 10);
  drawGrid();
}); 