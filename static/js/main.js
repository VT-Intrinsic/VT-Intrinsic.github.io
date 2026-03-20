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
  const visibleContainer = document.getElementById('visible-container');
  const thermalContainer = document.getElementById('thermal-container');
  const step1El = document.getElementById('step-1');
  const step2El = document.getElementById('step-2');
  const step3El = document.getElementById('step-3');

  let selectedPoints = [];
  let hoverPoint = null;
  let pointsChanged = false;
  const clickHintA = document.getElementById('click-hint-a');

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
      visibleImage.crossOrigin = 'anonymous';
      thermalImage.crossOrigin = 'anonymous';
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
    pointsChanged = true;
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

  // Update step progress guide
  function updateStepIndicators() {
    const n = selectedPoints.length;
    [step1El, step2El, step3El].forEach(s => s.classList.remove('active', 'done'));
    if (n === 0) {
      // Restore hint to center with "Click Point A"
      if (clickHintA) {
        clickHintA.classList.remove('hidden', 'moved');
        clickHintA.querySelector('.click-hint-label').textContent = 'Click Point A';
      }
      step1El.classList.add('active');
      visibleContainer.classList.add('awaiting');
      thermalContainer.classList.add('awaiting');
    } else if (n === 1) {
      // Slide hint to a new spot on the same image, suggest Point B
      if (clickHintA) {
        clickHintA.classList.remove('hidden');
        clickHintA.classList.add('moved');
        clickHintA.querySelector('.click-hint-label').textContent = 'Click Point B';
      }
      step1El.classList.add('done');
      step2El.classList.add('active');
      visibleContainer.classList.add('awaiting');
      thermalContainer.classList.add('awaiting');
    } else {
      // Both points placed — hide hint completely
      if (clickHintA) clickHintA.classList.add('hidden');
      step1El.classList.add('done');
      step2El.classList.add('done');
      step3El.classList.add('done');
      // Re-activate step 1 to signal the user can pick a new pair
      step1El.classList.add('active');
      visibleContainer.classList.add('awaiting');
      thermalContainer.classList.add('awaiting');
    }
  }

  // Update everything
  function updateAll() {
    syncCanvasToImage(visibleCanvas, visibleImage);
    syncCanvasToImage(thermalCanvas, thermalImage);
    redrawCanvas(visibleCanvas.getContext('2d'), selectedPoints, hoverPoint, 'A', 'B');
    redrawCanvas(thermalCanvas.getContext('2d'), selectedPoints, hoverPoint, 'A', 'B');
    // Ordinality info
    if (selectedPoints.length === 2) {
      // Only recompute & re-animate when points actually changed (not on every mouse move)
      if (pointsChanged) {
        pointInfo.style.animation = 'none';
        pointInfo.offsetHeight; // trigger reflow
        pointInfo.style.animation = '';

        const visA = getImageIntensity(visibleImage, selectedPoints[0].x, selectedPoints[0].y);
        const visB = getImageIntensity(visibleImage, selectedPoints[1].x, selectedPoints[1].y);
        const thermA = getImageIntensity(thermalImage, selectedPoints[0].x, selectedPoints[0].y);
        const thermB = getImageIntensity(thermalImage, selectedPoints[1].x, selectedPoints[1].y);

        // Use >= so ties (equal intensities) are assigned to the ">" side
        const visGte  = visA  >= visB;
        const thermGte = thermA >= thermB;
        const visSignHtml   = visGte  ? '&gt;' : '&lt;';
        const thermSignHtml = thermGte ? '&gt;' : '&lt;';
        const sameSign = visGte === thermGte;
        const conclusionType     = sameSign ? 'Shading' : 'Albedo';
        const conclusionSignHtml = visGte ? '&gt;' : '&lt;';
        const reasonText = sameSign
          ? 'Same ordering in both channels'
          : 'Opposite ordering across channels';

        const infoHTML = `
          <div class="oc-card">
            <!-- Premises + merge bracket wrapper -->
            <div class="oc-premises-block">
              <div class="oc-premises">
                <div class="oc-premise">
                  <span class="oc-ch-tag">Visible</span>
                  <span class="oc-order-expr">
                    ${redCircleSVG(13)}
                    <span class="oc-sign-lg">${visSignHtml}</span>
                    ${blueSquareSVG(13)}
                  </span>
                </div>
                <div class="oc-premise">
                  <span class="oc-ch-tag">Thermal</span>
                  <span class="oc-order-expr">
                    ${redCircleSVG(13)}
                    <span class="oc-sign-lg">${thermSignHtml}</span>
                    ${blueSquareSVG(13)}
                  </span>
                </div>
              </div>
              <div class="oc-merge">
                <div class="oc-merge-arm oc-merge-l"></div>
                <div class="oc-merge-arm oc-merge-r"></div>
              </div>
            </div>

            <!-- Causal connector -->
            <div class="oc-causal">
              <div class="oc-causal-stem"></div>
              <span class="oc-causal-badge ${sameSign ? 'oc-badge-same' : 'oc-badge-opp'}">
                ${reasonText}
              </span>
              <div class="oc-causal-stem"></div>
              <div class="oc-causal-arrow-down">▼</div>
            </div>

            <!-- Conclusion -->
            <div class="oc-conclusion ${sameSign ? 'oc-shading' : 'oc-albedo'}">
              ∴ &nbsp;<strong>${conclusionType}</strong> ordinality: &nbsp;
              ${redCircleSVG(14)}&nbsp;${conclusionSignHtml}&nbsp;${blueSquareSVG(14)}
            </div>
          </div>
          <p class="demo-next-hint">Click anywhere on the images to pick a new pair</p>
        `;
        pointACoords.innerHTML = '';
        pointBCoords.innerHTML = '';
        ordinalityResult.innerHTML = infoHTML;
        pointsChanged = false;
      }
      pointInfo.classList.remove('is-hidden');
    } else {
      pointInfo.classList.add('is-hidden');
    }
    updateStepIndicators();
  }

  // Initial sync after images load and on resize
  function syncAll() {
    syncCanvasToImage(visibleCanvas, visibleImage);
    syncCanvasToImage(thermalCanvas, thermalImage);
    updateAll();
  }
  visibleImage.onload = syncAll;
  thermalImage.onload = syncAll;
  if (visibleImage.complete && thermalImage.complete) syncAll();
  window.addEventListener('resize', syncAll);

  // Mouse event listeners
  visibleCanvas.addEventListener('click', e => handleCanvasClick(e, visibleImage));
  thermalCanvas.addEventListener('click', e => handleCanvasClick(e, thermalImage));
  visibleCanvas.addEventListener('mousemove', e => handleCanvasMove(e, visibleImage));
  thermalCanvas.addEventListener('mousemove', e => handleCanvasMove(e, thermalImage));
  visibleCanvas.addEventListener('mouseleave', () => handleCanvasLeave());
  thermalCanvas.addEventListener('mouseleave', () => handleCanvasLeave());

  // Touch support for mobile
  function handleCanvasTouch(event, image) {
    event.preventDefault();
    const touch = event.changedTouches[0];
    handleCanvasClick({ clientX: touch.clientX, clientY: touch.clientY, target: event.target }, image);
  }
  visibleCanvas.addEventListener('touchstart', e => handleCanvasTouch(e, visibleImage), { passive: false });
  thermalCanvas.addEventListener('touchstart', e => handleCanvasTouch(e, thermalImage), { passive: false });

  // Reset button
  document.getElementById('reset-btn').addEventListener('click', () => {
    selectedPoints = [];
    updateAll();
  });

  function redCircleSVG(size = 14) {
    return `<svg width="${size}" height="${size}" style="vertical-align:middle"><circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="none" stroke="red" stroke-width="2"/></svg>`;
  }
  function blueSquareSVG(size = 14) {
    return `<svg width="${size}" height="${size}" style="vertical-align:middle"><rect x="2" y="2" width="${size-4}" height="${size-4}" fill="none" stroke="blue" stroke-width="2"/></svg>`;
  }
}); 