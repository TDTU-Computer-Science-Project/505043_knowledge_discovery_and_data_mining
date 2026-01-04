const ASPECTS = [
  "SCREEN", "CAMERA", "FEATURES", "BATTERY", "PERFORMANCE",
  "STORAGE", "DESIGN", "PRICE", "GENERAL", "SERVICE & ACCESSORIES"
];

let chart;

// Mapping từ các nhãn trong dữ liệu gốc sang chuẩn của mình
const aspectMapping = {
  "SER&ACC": "SERVICE & ACCESSORIES",
  "SER&ACC#POSITIVE": "SERVICE & ACCESSORIES",
  "SER&ACC#NEGATIVE": "SERVICE & ACCESSORIES",
  "SER&ACC#NEUTRAL": "SERVICE & ACCESSORIES"
};

async function loadProduct() {
  try {
    // Đọc file .jsonl trực tiếp
    const response = await fetch('data/data.jsonl');
    const text = await response.text();
    const lines = text.trim().split('\n');

    const reviews = [];

    for (let line of lines) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        const processedAspects = [];

        if (item.labels && Array.isArray(item.labels)) {
          for (let label of item.labels) {
            if (Array.isArray(label) && label.length >= 3) {
              let aspect = label[2].split('#')[0];
              const sentiment = label[2].split('#')[1] || "NEUTRAL";

              // Chuẩn hóa tên khía cạnh
              aspect = aspectMapping[aspect] || aspect.toUpperCase();

              if (ASPECTS.includes(aspect)) {
                processedAspects.push({
                  aspect: aspect,
                  sentiment: sentiment.toUpperCase() // POSITIVE / NEGATIVE / NEUTRAL
                });
              }
            }
          }
        }

        reviews.push({
          text: item.text,
          aspects: processedAspects
        });
      } catch (e) {
        console.warn("Lỗi parse dòng:", line, e);
      }
    }

    console.log(`Đã load thành công ${reviews.length} đánh giá từ mẫu_data.jsonl`);
    document.getElementById("totalReviews").textContent = reviews.length;

    // Tính toán thống kê
    const stats = {};
    ASPECTS.forEach(a => stats[a] = { pos: 0, neu: 0, neg: 0, total: 0 });

    reviews.forEach(review => {
      if (!review.aspects) return;
      review.aspects.forEach(item => {
        const a = item.aspect;
        const s = item.sentiment;
        if (stats[a]) {
          stats[a].total++;
          if (s === "POSITIVE") stats[a].pos++;
          else if (s === "NEUTRAL") stats[a].neu++;
          else stats[a].neg++;
        }
      });
    });

    // Cập nhật bảng
    const tbody = document.querySelector("#aspectTable tbody");
    tbody.innerHTML = "";
    const chartData = [];

    ASPECTS.forEach(aspect => {
      const s = stats[aspect];
      const total = s.total || 1;
      const posRate = s.pos / total;
      const negRate = s.neg / total;
      const score = posRate - negRate; // -1 đến +1
      const normalized = (score + 1) / 2; // 0 đến 1

      chartData.push(normalized);

      const overall = posRate > negRate ? "Tích cực" :
                     negRate > posRate ? "Tiêu cực" : "Trung tính";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${translateAspect(aspect)}</strong></td>
        <td>${s.pos} (${(posRate*100).toFixed(1)}%)</td>
        <td>${s.neu}</td>
        <td>${s.neg} (${(negRate*100).toFixed(1)}%)</td>
        <td class="${overall === 'Tích cực' ? 'positive' : overall === 'Tiêu cực' ? 'negative' : 'neutral'}">
          ${overall} ${total > 0 ? `(${total} lượt)` : ''}
        </td>
      `;
      tbody.appendChild(row);
    });

    // Vẽ radar chart
    drawRadarChart(chartData);

  } catch (err) {
    console.error("Lỗi khi đọc file:", err);
    alert("Không tìm thấy file data/mẫu_data.jsonl\nHãy kiểm tra lại đường dẫn và tên file!");
  }
}

function translateAspect(aspect) {
  const map = {
    "SCREEN": "Màn hình",
    "CAMERA": "Camera",
    "FEATURES": "Tính năng",
    "BATTERY": "Pin",
    "PERFORMANCE": "Hiệu năng",
    "STORAGE": "Bộ nhớ",
    "DESIGN": "Thiết kế",
    "PRICE": "Giá cả",
    "GENERAL": "Tổng quan",
    "SERVICE & ACCESSORIES": "Dịch vụ & Phụ kiện"
  };
  return map[aspect] || aspect;
}

function drawRadarChart(data) {
  const ctx = document.getElementById('radarChart').getContext('2d');
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ASPECTS.map(translateAspect),
      datasets: [{
        label: 'Điểm cảm xúc (0 = rất tệ → 1 = rất tốt)',
        data: data,
        backgroundColor: 'rgba(231, 76, 60, 0.3)',
        borderColor: '#e74c3c',
        pointBackgroundColor: '#e74c3c',
        borderWidth: 3,
        pointRadius: 5
      }]
    },
    options: {
      scales: {
        r: {
          min: 0,
          max: 1,
          ticks: { stepSize: 0.2 },
          grid: { color: 'rgba(0,0,0,0.1)' },
          angleLines: { color: 'rgba(0,0,0,0.1)' }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// Tự động chạy khi mở trang
window.onload = () => {
  loadProduct();
};
