// public/script.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('viewForm');
  const input = document.getElementById('fileInput');
  const result = document.getElementById('result');
  const tauntBtn = document.getElementById('tauntBtn');
  const quickExample = document.getElementById('quickExample');

  let failCount = 0;
  const taunts = [
    "Hanya profile.txt? Serius? Coba yang lebih liar 😏",
    "Masih coba-coba? Tambah ../ sedikit, jangan takut.",
    "Kamu cuma ngulik permukaan. Lebih dalam dong.",
    "Coba encoding atau double-encoding kalau belum berhasil."
  ];
  const escalation = [
    "Udah berkali-kali tapi nggak dapet juga? Coba ingat dasar traversal.",
    "Kalau terus begini, admin bakal ketawa. Buktikan kamu beda!",
    "Kamu butuh lebih banyak keberanian (dan ../)."
  ];

  function randomTaunt() {
    if (failCount >= 6) {
      return escalation[Math.floor(Math.random() * escalation.length)];
    }
    return taunts[Math.floor(Math.random() * taunts.length)];
  }

  function showResult(text, status) {
    result.classList.remove('success', 'fail', 'animate');
    void result.offsetWidth; // reflow to restart animation
    if (status === 'success') result.classList.add('success');
    if (status === 'fail') result.classList.add('fail');
    result.classList.add('animate');
    result.textContent = text;
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const file = input.value.trim();
    if (!file) {
      showResult('Isi dulu nama file.', 'fail');
      return;
    }

    showResult('Mencoba membaca file…', null);
    try {
      // attempt fetch (server will handle decoding variants)
      const url = `/view?file=${encodeURIComponent(file)}`;
      const r = await fetch(url, { cache: 'no-store' });
      const txt = await r.text();

      // detect success heuristics: file found / contents returned
      if (r.ok && !txt.toLowerCase().includes('file not found') && txt.length > 0) {
        showResult(txt, 'success');
        failCount = 0;
      } else {
        failCount++;
        // show server message briefly, then taunt
        showResult(txt || 'Tidak ditemukan.', 'fail');
        setTimeout(() => {
          showResult(randomTaunt(), 'fail');
        }, 600);
      }
    } catch (err) {
      failCount++;
      showResult('Request error: ' + err.message, 'fail');
      setTimeout(() => {
        showResult(randomTaunt(), 'fail');
      }, 600);
    }
  });

  tauntBtn.addEventListener('click', () => {
    failCount++;
    showResult(randomTaunt(), 'fail');
  });

  quickExample.addEventListener('click', () => {
    // provide non-spoiler encoded example to try
    const examples = [
      '../../../var/www/html/etss.txt',
      '..%2f..%2f..%2fvar%2fwww%2fhtml%etss.txtt',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fvar%2fwww%2fhtml%etss.txt'
    ];
    input.value = examples[Math.floor(Math.random() * examples.length)];
    showResult('Contoh diisi otomatis — klik View untuk mencoba.', null);
  });
});
