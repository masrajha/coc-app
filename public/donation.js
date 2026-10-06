(() => {
  const donationUrl = 'https://saweria.co/masrajha';

  function openDonation(event) {
    event?.preventDefault();
    const dialog = document.getElementById('donationDialog');
    if (dialog?.showModal) dialog.showModal();
    else window.open(donationUrl, '_blank', 'noopener,noreferrer');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('a');
    button.className = 'donation-fab';
    button.href = donationUrl;
    button.setAttribute('aria-label', 'Dukung pengembangan aplikasi');
    button.innerHTML = '<span class="donation-fab-icon" aria-hidden="true">♥</span><span class="donation-fab-label">Dukung pengembangan</span>';
    button.addEventListener('click', openDonation);
    document.body.appendChild(button);

    const dialog = document.createElement('dialog');
    dialog.id = 'donationDialog';
    dialog.className = 'donation-dialog';
    dialog.setAttribute('aria-labelledby', 'donationDialogTitle');
    dialog.innerHTML = '<div class="donation-dialog-inner"><button class="donation-dialog-close" type="button" aria-label="Tutup">×</button><h2 id="donationDialogTitle">Dukung pengembangan</h2><p>Jika aplikasi ini bermanfaat untuk membantu pengelolaan clan, analisis war, dan perkembangan pemain, Anda dapat mendukung biaya pengembangan dan pemeliharaan aplikasi secara sukarela.</p><p class="donation-dialog-note">Dukungan Anda membantu aplikasi tetap aktif, cepat, dan terus diperbarui. Donasi bersifat sukarela dan tidak membuka fitur khusus.</p><a class="donation-dialog-link" href="https://saweria.co/masrajha" target="_blank" rel="noopener noreferrer">Donasi melalui Saweria</a></div>';
    dialog.querySelector('.donation-dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    document.body.appendChild(dialog);

    document.querySelectorAll('[data-donation-trigger]').forEach(trigger => trigger.addEventListener('click', openDonation));
  });
})();
