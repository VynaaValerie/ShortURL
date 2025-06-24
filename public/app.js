document.addEventListener('DOMContentLoaded', () => {
  const originalUrlInput = document.getElementById('originalUrl');
  const shortenBtn = document.getElementById('shortenBtn');
  const resultDiv = document.getElementById('result');
  const shortUrlInput = document.getElementById('shortUrl');
  const copyBtn = document.getElementById('copyBtn');
  const qrBtn = document.getElementById('qrBtn');
  const qrModal = document.getElementById('qrModal');
  const closeBtn = document.querySelector('.close-btn');
  const downloadPNG = document.getElementById('downloadPNG');
  const downloadSVG = document.getElementById('downloadSVG');
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('spinner');

  shortenBtn.addEventListener('click', shortenUrl);
  copyBtn.addEventListener('click', copyToClipboard);
  qrBtn.addEventListener('click', showQRModal);
  closeBtn.addEventListener('click', hideQRModal);
  
  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === qrModal) {
      hideQRModal();
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !qrModal.classList.contains('hidden')) {
      hideQRModal();
    }
  });

  async function shortenUrl() {
    const url = originalUrlInput.value.trim();
    
    if (!url) {
      alert('Please enter a URL');
      originalUrlInput.focus();
      return;
    }

    try {
      // Show loading state
      shortenBtn.disabled = true;
      btnText.textContent = 'Shortening...';
      spinner.style.display = 'inline-block';

      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ originalUrl: url }),
      });

      const data = await response.json();

      if (response.ok) {
        shortUrlInput.value = data.shortUrl;
        resultDiv.classList.remove('hidden');
        originalUrlInput.value = ''; // Clear input after successful shortening
        
        // Scroll to result if on mobile
        if (window.innerWidth < 768) {
          resultDiv.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        alert(data.error || 'Failed to shorten URL');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while shortening the URL');
    } finally {
      // Reset button state
      shortenBtn.disabled = false;
      btnText.textContent = 'Shorten URL';
      spinner.style.display = 'none';
    }
  }

  function copyToClipboard() {
    const textToCopy = shortUrlInput.value;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Change button to show success
        copyBtn.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="far fa-copy"></i><span>Copy</span>';
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  }

  function showQRModal() {
    if (!shortUrlInput.value) {
      alert('Please shorten a URL first');
      return;
    }
    
    const qrCodeDiv = document.getElementById('qrCode');
    qrCodeDiv.innerHTML = '';
    
    QRCode.toCanvas(qrCodeDiv, shortUrlInput.value, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }, (error) => {
      if (error) console.error(error);
    });
    
    // Show modal with animation
    qrModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function hideQRModal() {
    qrModal.classList.remove('show');
    document.body.style.overflow = 'auto';
  }

  // Handle download buttons
  downloadPNG.addEventListener('click', () => downloadQR('png'));
  downloadSVG.addEventListener('click', () => downloadQR('svg'));

  function downloadQR(format) {
    if (!shortUrlInput.value) return;
    
    const url = shortUrlInput.value;
    const filename = `qr-code.${format}`;
    
    if (format === 'png') {
      QRCode.toDataURL(url, {
        width: 500,
        margin: 2
      }, (err, url) => {
        if (err) return console.error(err);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    } else if (format === 'svg') {
      QRCode.toString(url, {
        type: 'svg',
        width: 500,
        margin: 2
      }, (err, svg) => {
        if (err) return console.error(err);
        
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
  }
});