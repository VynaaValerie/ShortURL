document.addEventListener('DOMContentLoaded', () => {
  const originalUrlInput = document.getElementById('originalUrl');
  const shortenBtn = document.getElementById('shortenBtn');
  const resultDiv = document.getElementById('result');
  const shortUrlLink = document.getElementById('shortUrl');
  const copyBtn = document.getElementById('copyBtn');

  shortenBtn.addEventListener('click', shortenUrl);
  copyBtn.addEventListener('click', copyToClipboard);

  async function shortenUrl() {
    const url = originalUrlInput.value.trim();
    
    if (!url) {
      alert('Please enter a URL');
      return;
    }

    try {
      shortenBtn.disabled = true;
      shortenBtn.textContent = 'Shortening...';

      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ originalUrl: url }),
      });

      const data = await response.json();

      if (response.ok) {
        shortUrlLink.href = data.shortUrl;
        shortUrlLink.textContent = data.shortUrl;
        resultDiv.classList.remove('hidden');
      } else {
        alert(data.error || 'Failed to shorten URL');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while shortening the URL');
    } finally {
      shortenBtn.disabled = false;
      shortenBtn.textContent = 'Shorten URL';
    }
  }

  function copyToClipboard() {
    const textToCopy = shortUrlLink.href;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  }
});