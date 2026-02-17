(function() {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var API_KEY = script.getAttribute('data-api-key');
  var LOGIN_TYPE = script.getAttribute('data-login-type') || 'student';
  var API_URL = script.getAttribute('data-api-url') || '';

  if (!API_KEY) { console.error('[BugWidget] data-api-key is required'); return; }
  if (!API_URL) { console.error('[BugWidget] data-api-url is required'); return; }

  // Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '.bw-btn{position:fixed;bottom:20px;right:20px;z-index:99999;width:52px;height:52px;border-radius:50%;background:#ef4444;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s;font-size:22px}',
    '.bw-btn:hover{transform:scale(1.1);box-shadow:0 6px 20px rgba(0,0,0,.3)}',
    '.bw-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}',
    '@media(min-width:640px){.bw-overlay{align-items:center}}',
    '.bw-modal{background:#fff;width:100%;max-width:440px;border-radius:16px 16px 0 0;padding:24px;max-height:90vh;overflow-y:auto;position:relative;animation:bw-slide .25s ease}',
    '@media(min-width:640px){.bw-modal{border-radius:16px}}',
    '@keyframes bw-slide{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}',
    '.bw-close{position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#888;line-height:1}',
    '.bw-title{margin:0 0 16px;font-size:18px;font-weight:700;color:#111}',
    '.bw-label{display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:4px}',
    '.bw-input,.bw-textarea{width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;outline:none;transition:border .2s;box-sizing:border-box}',
    '.bw-input:focus,.bw-textarea:focus{border-color:#ef4444}',
    '.bw-textarea{min-height:80px;resize:vertical}',
    '.bw-group{margin-bottom:14px}',
    '.bw-file-area{border:2px dashed #ddd;border-radius:8px;padding:16px;text-align:center;cursor:pointer;color:#888;font-size:13px;transition:border-color .2s}',
    '.bw-file-area:hover{border-color:#ef4444}',
    '.bw-previews{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}',
    '.bw-previews img{width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid #eee}',
    '.bw-submit{width:100%;padding:12px;background:#ef4444;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s}',
    '.bw-submit:hover{background:#dc2626}',
    '.bw-submit:disabled{opacity:.6;cursor:not-allowed}',
    '.bw-toast{position:fixed;bottom:80px;right:20px;z-index:100001;padding:12px 20px;border-radius:10px;color:#fff;font-size:14px;font-weight:500;animation:bw-slide .3s ease;max-width:320px}',
    '.bw-toast-ok{background:#22c55e}',
    '.bw-toast-err{background:#ef4444}'
  ].join('\n');
  document.head.appendChild(style);

  // Create floating button
  var btn = document.createElement('button');
  btn.className = 'bw-btn';
  btn.innerHTML = '🐛';
  btn.title = 'Report a Bug';
  document.body.appendChild(btn);

  var files = [];

  function showToast(msg, isError) {
    var t = document.createElement('div');
    t.className = 'bw-toast ' + (isError ? 'bw-toast-err' : 'bw-toast-ok');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 4000);
  }

  function fileToBase64(file) {
    return new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function() {
        var b64 = reader.result.split(',')[1];
        resolve({ data: b64, filename: file.name, type: file.type });
      };
      reader.readAsDataURL(file);
    });
  }

  function openModal() {
    files = [];
    var overlay = document.createElement('div');
    overlay.className = 'bw-overlay';

    var modal = document.createElement('div');
    modal.className = 'bw-modal';
    modal.innerHTML = [
      '<button class="bw-close">&times;</button>',
      '<h2 class="bw-title">🐛 Report a Bug</h2>',
      '<div class="bw-group"><label class="bw-label">Title *</label><input class="bw-input" id="bw-title" placeholder="Brief summary of the issue"></div>',
      '<div class="bw-group"><label class="bw-label">Description</label><textarea class="bw-textarea" id="bw-desc" placeholder="What happened? What did you expect?"></textarea></div>',
      '<div class="bw-group"><label class="bw-label">Screenshots (max 3)</label><div class="bw-file-area" id="bw-drop">Click or drag images here<input type="file" accept="image/*" multiple style="display:none" id="bw-file-input"></div><div class="bw-previews" id="bw-previews"></div></div>',
      '<button class="bw-submit" id="bw-submit">Submit Bug Report</button>'
    ].join('');

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close handlers
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    modal.querySelector('.bw-close').addEventListener('click', function() { overlay.remove(); });

    // File upload
    var dropArea = modal.querySelector('#bw-drop');
    var fileInput = modal.querySelector('#bw-file-input');
    var previews = modal.querySelector('#bw-previews');

    dropArea.addEventListener('click', function() { fileInput.click(); });
    dropArea.addEventListener('dragover', function(e) { e.preventDefault(); dropArea.style.borderColor = '#ef4444'; });
    dropArea.addEventListener('dragleave', function() { dropArea.style.borderColor = '#ddd'; });
    dropArea.addEventListener('drop', function(e) {
      e.preventDefault();
      dropArea.style.borderColor = '#ddd';
      addFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', function() { addFiles(fileInput.files); });

    function addFiles(fileList) {
      for (var i = 0; i < fileList.length && files.length < 3; i++) {
        var f = fileList[i];
        if (!f.type.startsWith('image/')) continue;
        if (f.size > 5 * 1024 * 1024) continue;
        files.push(f);
        var img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        previews.appendChild(img);
      }
    }

    // Submit
    modal.querySelector('#bw-submit').addEventListener('click', async function() {
      var titleVal = modal.querySelector('#bw-title').value.trim();
      if (!titleVal) { showToast('Please enter a title', true); return; }

      var submitBtn = modal.querySelector('#bw-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        var attArr = [];
        for (var i = 0; i < files.length; i++) {
          attArr.push(await fileToBase64(files[i]));
        }

        var payload = {
          api_key: API_KEY,
          title: titleVal,
          description: modal.querySelector('#bw-desc').value.trim() || null,
          login_type: LOGIN_TYPE,
          severity: 'minor',
          page_url: window.location.href,
          browser_info: navigator.userAgent,
          attachments: attArr.length > 0 ? attArr : null
        };

        var resp = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        var result = await resp.json();
        if (resp.ok && result.success) {
          showToast('✅ ' + result.message);
          overlay.remove();
        } else {
          showToast(result.error || 'Failed to submit', true);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Bug Report';
        }
      } catch (err) {
        showToast('Network error. Please try again.', true);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Bug Report';
      }
    });
  }

  btn.addEventListener('click', openModal);
})();