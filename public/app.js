document.addEventListener('DOMContentLoaded', function() {
  const urlInput = document.getElementById('url');
  const customNameInput = document.getElementById('custom-name');
  const shortenBtn = document.getElementById('shorten-btn');
  const resultDiv = document.getElementById('result');
  const shortUrlAnchor = document.getElementById('short-url');
  const copyBtn = document.getElementById('copy-btn');
  const clicksSpan = document.getElementById('clicks');

  shortenBtn.addEventListener('click', shortenUrl);
  copyBtn.addEventListener('click', copyToClipboard);

  async function shortenUrl() {
    const longUrl = urlInput.value.trim();
    const customName = customNameInput.value.trim();

    if (!longUrl) {
      alert('Please enter a URL');
      return;
    }

    try {
      new URL(longUrl);
    } catch (e) {
      alert('Please enter a valid URL (include http:// or https://)');
      return;
    }

    shortenBtn.disabled = true;
    shortenBtn.textContent = 'Shortening...';

    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: longUrl,
          customName: customName || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to shorten URL');
      }

      // Display result
      shortUrlAnchor.href = `https://${data.data.shortUrl}`;
      shortUrlAnchor.textContent = `https://${data.data.shortUrl}`;
      resultDiv.classList.remove('hidden');

      // Get stats
      const statsResponse = await fetch(`/api/info/${data.data.shortCode}`);
      const statsData = await statsResponse.json();
      
      if (statsResponse.ok) {
        clicksSpan.textContent = statsData.data.clicks;
      }
    } catch (error) {
      alert(error.message);
    } finally {
      shortenBtn.disabled = false;
      shortenBtn.textContent = 'Shorten URL';
    }
  }

  function copyToClipboard() {
    const urlToCopy = shortUrlAnchor.href;
    
    navigator.clipboard.writeText(urlToCopy)
      .then(() => {
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="far fa-copy"></i> Copy';
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  }
});