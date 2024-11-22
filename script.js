const dropZone = document.getElementById("dropZone");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const placeholder = document.getElementById("placeholder");
const brightnessSlider = document.getElementById("brightness");
const contrastSlider = document.getElementById("contrast");
const saturationSlider = document.getElementById("saturation");
const temperatureSlider = document.getElementById("temperature");
const rotationSlider = document.getElementById("rotation");
const blurSlider = document.getElementById("blur");
const grayscaleSlider = document.getElementById("grayscale");
const focusSlider = document.getElementById("focus");
const retroCheckbox = document.getElementById("retro");
const addNoiseButton = document.getElementById("addNoiseButton");
const downloadButton = document.getElementById("downloadButton");
const resetButton = document.getElementById("resetButton");
const historyGrid = document.getElementById("historyGrid");

let originalImage = null;
let currentHistoryItem = null;
let imageStates = {};
let isApplyingFilters = false;

// 디바운싱을 위한 타이머 변수
let applyFiltersTimeout;

async function userTracking(text) {
  try {
    const response = await fetch(
      "http://223.130.159.228/analysis/user_tracking",
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain", // 텍스트 전송
        },
        body: text,
      }
    );
    const result = await response.json();
  } catch (error) {
    console.error("Error:", error);
  }
}

// 파일 드롭 핸들러
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.style.borderColor = "#fff";
});

dropZone.addEventListener("dragleave", () => {
  dropZone.style.borderColor = "rgba(255, 255, 255, 0.5)";
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.style.borderColor = "rgba(255, 255, 255, 0.5)";
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    loadImage(file);
  }
});

dropZone.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      loadImage(file);
    }
  };
  input.click();
});

// 이미지 로드 함수
function loadImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      originalImage = img;
      placeholder.style.display = "none";
      canvas.style.display = "block";
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
      const item = addToHistory(e.target.result);
      setPreview(e.target.result, item);

      // 이미지 상태 초기화
      imageStates[e.target.result] = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        temperature: 0,
        rotation: 0,
        blur: 0,
        grayscale: 0,
        focus: 0,
        retro: false,
        noiseAdded: false,
        thumbnail: e.target.result,
      };
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 필터 적용 함수
function applyFilters() {
  if (!originalImage || isApplyingFilters) return;
  isApplyingFilters = true;

  // 디바운싱: 필터 적용을 일정 시간 지연시킵니다.
  clearTimeout(applyFiltersTimeout);
  applyFiltersTimeout = setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    const state = imageStates[currentHistoryItem.dataset.url];

    const brightness = brightnessSlider.value;
    const contrast = contrastSlider.value;
    const saturation = saturationSlider.value;
    const temperature = temperatureSlider.value;
    const rotation = rotationSlider.value;
    const blur = blurSlider.value;
    const grayscale = grayscaleSlider.value;
    const focus = focusSlider.value;
    const retro = retroCheckbox.checked;

    // 상태 저장
    state.brightness = brightness;
    state.contrast = contrast;
    state.saturation = saturation;
    state.temperature = temperature;
    state.rotation = rotation;
    state.blur = blur;
    state.grayscale = grayscale;
    state.focus = focus;
    state.retro = retro;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // CSS 필터 사용
    ctx.filter = `
            brightness(${brightness}%)
            contrast(${contrast}%)
            saturate(${saturation}%)
            hue-rotate(${temperature}deg)
            blur(${blur}px)
            grayscale(${grayscale}%)
          `;

    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    // 초점 조절 (샤프니스) - CSS 필터로 대체
    if (focus > 0) {
      ctx.filter += ` drop-shadow(0 0 ${focus}px rgba(0,0,0,0.5))`;
      ctx.drawImage(canvas, 0, 0);
    }

    // 레트로 스타일 적용
    if (retro) {
      ctx.fillStyle = "rgba(255, 165, 0, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.restore();

    isApplyingFilters = false;
  }, 100);
}

[
  brightnessSlider,
  contrastSlider,
  saturationSlider,
  rotationSlider,
  temperatureSlider,
  blurSlider,
  grayscaleSlider,
  focusSlider,
  retroCheckbox,
].forEach((control) => {
  control.addEventListener("input", applyFilters);
});

// 히스토리 추가 함수
function addToHistory(imageUrl) {
  const item = document.createElement("div");
  item.classList.add("history-item");
  item.style.backgroundImage = `url(${imageUrl})`;
  item.dataset.url = imageUrl;
  item.addEventListener("click", () => {
    setPreview(imageUrl, item);
  });
  historyGrid.appendChild(item);
  return item;
}

// 히스토리 썸네일 업데이트 함수
function updateHistoryThumbnail(historyItem) {
  const url = historyItem.dataset.url;
  const state = imageStates[url];
  state.thumbnail = canvas.toDataURL("image/png");
  historyItem.style.backgroundImage = `url(${state.thumbnail})`;
}

// 프리뷰 설정 함수
function setPreview(imageUrl, historyItem) {
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    originalImage = img;
    placeholder.style.display = "none";
    canvas.style.display = "block";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    if (currentHistoryItem) {
      currentHistoryItem.classList.remove("selected");
    }
    currentHistoryItem = historyItem;
    currentHistoryItem.classList.add("selected");

    const state = imageStates[imageUrl];

    // 슬라이더 값을 상태로 복원
    brightnessSlider.value = state.brightness;
    contrastSlider.value = state.contrast;
    saturationSlider.value = state.saturation;
    temperatureSlider.value = state.temperature;
    rotationSlider.value = state.rotation;
    blurSlider.value = state.blur;
    grayscaleSlider.value = state.grayscale;
    focusSlider.value = state.focus;
    retroCheckbox.checked = state.retro;

    applyFilters();
  };
  img.src = imageUrl;
}

// 노이즈 추가 버튼
addNoiseButton.addEventListener("click", () => {
  if (currentHistoryItem) {
    const state = imageStates[currentHistoryItem.dataset.url];
    state.noiseAdded = true;
    currentHistoryItem.classList.add("noise-added");

    // 노이즈 추가 로직
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const rand = (Math.random() - 0.5) * 20;
      imageData.data[i] += rand;
      imageData.data[i + 1] += rand;
      imageData.data[i + 2] += rand;
    }
    ctx.putImageData(imageData, 0, 0);

    // 히스토리 썸네일 업데이트
    updateHistoryThumbnail(currentHistoryItem);
  }
  alert("노이즈가 성공적으로 추가되었습니다!");
});

// 다운로드 버튼
downloadButton.addEventListener("click", () => {
  if (!originalImage) {
    alert("다운로드할 이미지가 없습니다.");
    return;
  }
  const link = document.createElement("a");
  link.download = "edited_image.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

// 원본으로 되돌리기 버튼
resetButton.addEventListener("click", () => {
  if (!currentHistoryItem) return;

  const state = imageStates[currentHistoryItem.dataset.url];

  // 상태 초기화
  state.brightness = 100;
  state.contrast = 100;
  state.saturation = 100;
  state.temperature = 0;
  state.rotation = 0;
  state.blur = 0;
  state.grayscale = 0;
  state.focus = 0;
  state.retro = false;

  // 슬라이더 초기화
  brightnessSlider.value = 100;
  contrastSlider.value = 100;
  saturationSlider.value = 100;
  temperatureSlider.value = 0;
  rotationSlider.value = 0;
  blurSlider.value = 0;
  grayscaleSlider.value = 0;
  focusSlider.value = 0;
  retroCheckbox.checked = false;

  applyFilters();
});
const purchaseButton = document.getElementById("purchaseButton");
purchaseButton.addEventListener("click", () => {
  userTracking("google_form");
  window.location.href =
    "https://docs.google.com/forms/d/e/1FAIpQLSc3BrICgz4TtHb5pN_skCCtyfIz5Z7b-3llHdYjY69vuEMk5Q/viewform?usp=sf_link";
});
