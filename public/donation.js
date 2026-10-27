(() => {
  const donationUrl = 'https://saweria.co/masrajha';
  const tr = key => window.CocI18n?.t(key) || key;

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
    button.innerHTML = '<span class="donation-fab-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" focusable="false"><path d="M5 10h11v5a5.5 5.5 0 0 1-11 0v-5Z" fill="currentColor"/><path d="M16 11h2a2.5 2.5 0 0 1 0 5h-2M3 21h16M8 7c-2-2 2-2 0-4m5 4c-2-2 2-2 0-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="donation-fab-label"></span>';
    button.addEventListener('click', openDonation);
    document.body.appendChild(button);

    const dialog = document.createElement('dialog');
    dialog.id = 'donationDialog';
    dialog.className = 'donation-dialog';
    dialog.setAttribute('aria-labelledby', 'donationDialogTitle');
    dialog.innerHTML = '<div class="donation-dialog-inner"><button class="donation-dialog-close" type="button">×</button><h2 id="donationDialogTitle"></h2><p class="donation-dialog-description"></p><p class="donation-dialog-note"></p><a class="donation-dialog-link" href="https://saweria.co/masrajha" target="_blank" rel="noopener noreferrer"></a></div>';
    const updateTexts = () => {
      button.setAttribute('aria-label', tr('donation.buttonLabel'));
      button.querySelector('.donation-fab-label').textContent = tr('donation.supportShort');
      dialog.querySelector('.donation-dialog-close').setAttribute('aria-label', tr('donation.close'));
      dialog.querySelector('#donationDialogTitle').textContent = tr('donation.title');
      dialog.querySelector('.donation-dialog-description').textContent = tr('donation.description');
      dialog.querySelector('.donation-dialog-note').textContent = tr('donation.note');
      dialog.querySelector('.donation-dialog-link').textContent = tr('donation.link');
    };
    updateTexts();
    window.addEventListener('coc-language-changed', updateTexts);
    dialog.querySelector('.donation-dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    document.body.appendChild(dialog);

    document.querySelectorAll('[data-donation-trigger]').forEach(trigger => trigger.addEventListener('click', openDonation));
  });
})();
