// Interactive Image Comparison
// Improved: handle events on canvas, redraw all points, sync canvas size, persistent points

document.addEventListener('DOMContentLoaded', function() {
  const visibleImage = document.getElementById('visible-image');
  const thermalImage = document.getElementById('thermal-image');
  const visibleCanvas = document.getElementById('visible-canvas');
  const thermalCanvas = document.getElementById('thermal-canvas');
  const pointInfo = document.getElementById('point-info');
  const pointACoords = document.getElementById('point-a-coords');
  const pointBCoords = document.getElementById('point-b-coords');
  const ordinalityResult = document.getElementById('ordinality-result');
  // const visibleContainer = document.getElementById('visible-container');

  let selectedPoints = [];
  let hoverPoint = null;

  const imagePairs = [
    { name: "Case 1", visible: "static/images/5_vis.png", thermal: "static/images/5_thr.png" },
    { name: "Case 2", visible: "static/images/2_vis.png", thermal: "static/images/2_thr.png" },
    { name: "Case 3", visible: "static/images/6_vis.png", thermal: "static/images/6_thr.png" },
  ];

  const caseButtonsDiv = document.getElementById('case-buttons');

  // Create buttons
  imagePairs.forEach((pair, idx) => {
    const btn = document.createElement('button');
    btn.className = 'button is-light';
    btn.textContent = pair.name;
    btn.addEventListener('click', () => {
      visibleImage.src = pair.visible;
      thermalImage.src = pair.thermal;
      selectedPoints = [];
      updateAll();
      // Highlight selected
      Array.from(caseButtonsDiv.children).forEach(b => b.classList.remove('is-link'));
      btn.classList.add('is-link');
    });
    caseButtonsDiv.appendChild(btn);
  });

  // Highlight the first button by default
  caseButtonsDiv.children[0].classList.add('is-link');

  // Utility to sync canvas size to image's rendered size
  function syncCanvasToImage(canvas, image) {
    const rect = image.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
  }

  // Draw all points and hover on canvas (use rendered size)
  function redrawCanvas(ctx, points, hover, labelA, labelB) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // Draw selected points
    points.forEach((pt, idx) => {
      ctx.lineWidth = 2;
      if (idx === 0) {
        // Draw hollow circle for A
        ctx.strokeStyle = 'red';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (idx === 1) {
        // Draw hollow square for B
        ctx.strokeStyle = 'blue';
        ctx.beginPath();
        const size = 12; // 16px square
        ctx.rect(pt.x - size/2, pt.y - size/2, size, size);
        ctx.stroke();
      }
    });
    // Draw hover point
    if (hover) {
      ctx.beginPath();
      ctx.arc(hover.x, hover.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.fill();
    }
  }

  // Get image intensity at point (map from canvas to natural image size)
  function getImageIntensity(image, x, y) {
    try {
      const rect = image.getBoundingClientRect();
      const scaleX = image.naturalWidth / rect.width;
      const scaleY = image.naturalHeight / rect.height;
      const imgX = Math.round(x * scaleX);
      const imgY = Math.round(y * scaleY);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(imgX, imgY, 1, 1).data;
      return (imageData[0] + imageData[1] + imageData[2]) / 3;
    } catch (e) {
      return NaN;
    }
  }

  // Calculate ordinality
  function calculateOrdinality(visA, visB, thermA, thermB) {
    const visibleComparison = visA > visB;
    const thermalComparison = thermA > thermB;
    const circ = redCircleSVG();
    const sq = blueSquareSVG();
    const left = circ;
    const right = sq;
    const sign = visibleComparison ? '>' : '<';

    if (visibleComparison === thermalComparison) {
      return `Ordinality: shading ${left} ${sign} ${right}`;
    } else {
      return `Ordinality: albedo ${left} ${sign} ${right}`;
    }
  }

  // Handle click on either canvas
  function handleCanvasClick(event, image) {
    syncCanvasToImage(image === visibleImage ? visibleCanvas : thermalCanvas, image);
    const rect = event.target.getBoundingClientRect();
    const x = (event.clientX - rect.left);
    const y = (event.clientY - rect.top);
    selectedPoints.push({ x, y });
    if (selectedPoints.length > 2) selectedPoints = selectedPoints.slice(-2);
    updateAll();
  }

  // Handle mouse move on canvas
  function handleCanvasMove(event, image) {
    syncCanvasToImage(image === visibleImage ? visibleCanvas : thermalCanvas, image);
    const rect = event.target.getBoundingClientRect();
    const x = (event.clientX - rect.left);
    const y = (event.clientY - rect.top);
    hoverPoint = { x, y };
    updateAll();
  }

  // Handle mouse leave
  function handleCanvasLeave() {
    hoverPoint = null;
    updateAll();
  }

  // Update everything
  function updateAll() {
    syncCanvasToImage(visibleCanvas, visibleImage);
    syncCanvasToImage(thermalCanvas, thermalImage);
    redrawCanvas(visibleCanvas.getContext('2d'), selectedPoints, hoverPoint, 'A', 'B');
    redrawCanvas(thermalCanvas.getContext('2d'), selectedPoints, hoverPoint, 'A', 'B');
    // Ordinality info
    if (selectedPoints.length === 2) {
      pointInfo.classList.remove('is-hidden');
      // pointACoords.textContent = `Visible: (${Math.round(selectedPoints[0].x)}, ${Math.round(selectedPoints[0].y)}) | Thermal: (${Math.round(selectedPoints[0].x)}, ${Math.round(selectedPoints[0].y)})`;
      // pointBCoords.textContent = `Visible: (${Math.round(selectedPoints[1].x)}, ${Math.round(selectedPoints[1].y)}) | Thermal: (${Math.round(selectedPoints[1].x)}, ${Math.round(selectedPoints[1].y)})`;
      // Calculate ordinality
      const visA = getImageIntensity(visibleImage, selectedPoints[0].x, selectedPoints[0].y);
      const visB = getImageIntensity(visibleImage, selectedPoints[1].x, selectedPoints[1].y);
      const thermA = getImageIntensity(thermalImage, selectedPoints[0].x, selectedPoints[0].y);
      const thermB = getImageIntensity(thermalImage, selectedPoints[1].x, selectedPoints[1].y);
      // Format: Visible intensity: A = 12 < B = 34
      const visAVal = isNaN(visA) ? 'N/A' : Math.round(visA);
      const visBVal = isNaN(visB) ? 'N/A' : Math.round(visB);
      const thermAVal = isNaN(thermA) ? 'N/A' : Math.round(thermA);
      const thermBVal = isNaN(thermB) ? 'N/A' : Math.round(thermB);
      const visSign = (visAVal !== 'N/A' && visBVal !== 'N/A') ? (visA > visB ? '>' : (visA < visB ? '<' : '=')) : '';
      const thermSign = (thermAVal !== 'N/A' && thermBVal !== 'N/A') ? (thermA > thermB ? '>' : (thermA < thermB ? '<' : '=')) : '';
      const visLabel = 'Visible intensity:';
      const thermLabel = 'Thermal intensity:';
      const maxLabelLen = Math.max(visLabel.length, thermLabel.length);

      const visLabelPad = visLabel.padEnd(maxLabelLen, ' ');
      const thermLabelPad = thermLabel.padEnd(maxLabelLen, ' ');

      const aPad = String(visAVal).padStart(3, ' ');
      const bPad = String(visBVal).padStart(3, ' ');
      const taPad = String(thermAVal).padStart(3, ' ');
      const tbPad = String(thermBVal).padStart(3, ' ');

      // Compose the info block with larger font
      const circ = redCircleSVG();
      const sq = blueSquareSVG();
      const ordinalityText = calculateOrdinality(visA, visB, thermA, thermB);
      
      const infoHTML = `
        <div class="ordinality-info-text">
          <pre class="intensity-pre">Visible intensity: ${circ} ${visSign} ${sq}</pre>
          <pre class="intensity-pre">Thermal intensity: ${circ} ${thermSign} ${sq}</pre>
          <pre class="intensity-pre"><span style="font-size: 1.8rem;">⇒</span> ${ordinalityText}</pre>
        </div>
      `;
      pointACoords.innerHTML = '';
      pointBCoords.innerHTML = '';
      ordinalityResult.innerHTML = infoHTML;
    } else {
      pointInfo.classList.add('is-hidden');
    }
  }

  // Initial sync after images load and on resize
  function syncAll() {
    syncCanvasToImage(visibleCanvas, visibleImage);
    syncCanvasToImage(thermalCanvas, thermalImage);
    updateAll();
  }
  visibleImage.onload = function() {
    visibleContainer.style.width = visibleImage.naturalWidth + 'px';
    visibleContainer.style.height = visibleImage.naturalHeight + 'px';
  };
  thermalImage.onload = syncAll;
  if (visibleImage.complete) syncAll();
  if (thermalImage.complete) syncAll();
  window.addEventListener('resize', syncAll);

  // Event listeners
  visibleCanvas.addEventListener('click', e => handleCanvasClick(e, visibleImage));
  thermalCanvas.addEventListener('click', e => handleCanvasClick(e, thermalImage));
  visibleCanvas.addEventListener('mousemove', e => handleCanvasMove(e, visibleImage));
  thermalCanvas.addEventListener('mousemove', e => handleCanvasMove(e, thermalImage));
  visibleCanvas.addEventListener('mouseleave', () => handleCanvasLeave());
  thermalCanvas.addEventListener('mouseleave', () => handleCanvasLeave());

  function redCircleSVG(size = 14) {
    return `<svg width="${size}" height="${size}" style="vertical-align:middle"><circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="none" stroke="red" stroke-width="2"/></svg>`;
  }
  function blueSquareSVG(size = 14) {
    return `<svg width="${size}" height="${size}" style="vertical-align:middle"><rect x="2" y="2" width="${size-4}" height="${size-4}" fill="none" stroke="blue" stroke-width="2"/></svg>`;
  }
}); 